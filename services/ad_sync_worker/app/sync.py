import logging
import json
import redis

from datetime import datetime, timezone
from sqlalchemy import select, update
from .config import settings
from .db import SessionLocal
from shared.models.user import User
from shared.models.change_request import ChangeRequest
from .ldap import LDAPClient
from .logic import determine_status, match_organization_by_ou, save_known_ous
from shared.utils import ad_guid_to_uuid
from .utils import with_retry

logger = logging.getLogger(__name__)

# Global redis client for the worker
redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, decode_responses=True)


class SyncWorker:
    def __init__(self):
        self.last_usn = self._load_last_usn()


    def _load_last_usn(self) -> int:
        try:
            from shared.models.system_setting import SystemSetting
            with SessionLocal() as session:
                setting = session.get(SystemSetting, "LAST_AD_USN")
                if setting and setting.value:
                    return int(setting.value)
        except Exception as e:
            logger.error(f"Error loading last USN from DB: {e}")
        return 0

    def _save_last_usn(self, usn: int):
        self.last_usn = usn
        try:
            from shared.models.system_setting import SystemSetting
            with SessionLocal() as session:
                setting = session.get(SystemSetting, "LAST_AD_USN")
                if setting:
                    setting.value = str(usn)
                else:
                    session.add(SystemSetting(key="LAST_AD_USN", value=str(usn)))
                session.commit()
        except Exception as e:
            logger.error(f"Error saving last USN to DB: {e}")

    def pull(self):
        """
        Poll AD for changes since last_usn.
        """
        logger.info(f"Starting Pull cycle. Last USN: {self.last_usn}")
        
        filter_str = f"(&(objectClass=user)(objectCategory=person)(uSNChanged>={self.last_usn}))"
        attributes = [
            "objectGUID", "sAMAccountName", "displayName", "mobile", 
            "telephoneNumber", "department", "physicalDeliveryOfficeName", 
            "userAccountControl", "uSNChanged", "memberOf", "title", "distinguishedName"
        ]

        max_usn = self.last_usn
        collected_ous: set = set()

        with LDAPClient() as ldap:
            # 2.4. Одна сессия на весь цикл Pull
            with SessionLocal() as session:
                for entry in ldap.search_paged(filter_str, attributes):
                    try:
                        self._process_ad_entry(session, entry)
                        current_usn = int(entry.get("uSNChanged", 0))
                        if current_usn > max_usn:
                            max_usn = current_usn
                        
                        # Collect OUs from distinguishedName
                        dn = str(entry.get("distinguishedName", ""))
                        if dn:
                            import re
                            ous = re.findall(r"OU=([^,]+)", dn)
                            if ous:
                                path = tuple(reversed(ous))
                                collected_ous.add(path)
                    except Exception as e:
                        logger.error(f"Error processing entry {entry.get('sAMAccountName')}: {e}")
                        session.rollback()
                        continue
                
                # Финальный коммит если остались изменения
                session.commit()
                
                # Save collected OUs to DB for use in admin UI
                if collected_ous:
                    save_known_ous(session, collected_ous)
                    logger.info(f"Saved {len(collected_ous)} unique OUs to DB.")

        if max_usn > self.last_usn:
            self._save_last_usn(max_usn + 1)
        
        logger.info("Pull cycle completed.")

    def _process_ad_entry(self, session, entry: dict):
        guid_bytes = entry.get("objectGUID")
        if not guid_bytes:
            return
        
        guid_str = ad_guid_to_uuid(guid_bytes)
        sam = str(entry.get("sAMAccountName", ""))
        uac = int(entry.get("userAccountControl", 0))
        
        status = determine_status(uac, sam)
        dn = str(entry.get("distinguishedName", ""))
        org, warnings = match_organization_by_ou(dn, session)
        
        # 1. User lookup/linking (Extracted)
        user = self._find_or_link_user(session, sam, guid_str)

        if not user:
            user = User(
                object_guid=guid_str,
                sam_account_name=sam,
                status=status,
                full_name=str(entry.get("displayName", "")),
                job_title=str(entry.get("title", "")),
                department=str(entry.get("department", "")),
                office_location=str(entry.get("physicalDeliveryOfficeName", "")),
                organization=org,
                ad_dn=dn,
                internal_phone=str(entry.get("telephoneNumber", "")),
                mobile_phone=str(entry.get("mobile", "")),
                sync_error_log="\n".join(warnings) if warnings else None,
                last_sync_timestamp=datetime.now(timezone.utc) # 4.1 UTC
            )
            session.add(user)
            logger.info(f"Created new user: {sam} ({guid_str})")
        else:
            # 2. Update existing user (Extracted)
            self._resolve_conflicts_and_update(session, user, entry, org, warnings, status)
            user.sam_account_name = sam
            user.ad_dn = dn
            logger.info(f"Updated user: {sam}")

        # Частичный коммит для сохранения прогресса
        session.commit()

    def _find_or_link_user(self, session, sam: str, guid_str: str) -> User:
        """
        Tries to find a user by GUID, or links a SAM stub to a new GUID.
        """
        user = session.get(User, guid_str)
        if user:
            return user

        # Try to find by sam_account_name (handle stubs from API Gateway)
        user = session.execute(
            select(User).where(User.sam_account_name == sam)
        ).scalars().first()
        
        if user:
            logger.info(f"Linking existing stub user {sam} to new GUID {guid_str}")
            session.execute(
                update(User).where(User.sam_account_name == sam).values(object_guid=guid_str)
            )
            session.commit()
            return session.get(User, guid_str)
            
        return None

    def _resolve_conflicts_and_update(self, session, user: User, entry: dict, org: str, warnings: list, status: str):
        """
        Updates user fields while respecting pending change requests.
        """
        # We check for 'pending', 'conflict', or 'approved' status
        # to prevent overwriting local DB before the push is applied and synced back.
        pending_cr = session.execute(
            select(ChangeRequest).where(
                ChangeRequest.user_guid == user.object_guid,
                ChangeRequest.status.in_(["pending", "conflict", "approved"])
            )
        ).scalars().all()
        
        pending_fields = {cr.attribute_name for cr in pending_cr}
        
        # Core fields (Sync unconditionally)
        user.status = status
        user.organization = org
        user.job_title = str(entry.get("title", ""))
        
        # User-editable fields (Sync with conflict resolution)
        if "full_name" not in pending_fields:
            user.full_name = str(entry.get("displayName", ""))
        
        if "department" not in pending_fields:
            user.department = str(entry.get("department", ""))
            
        if "office_location" not in pending_fields:
            user.office_location = str(entry.get("physicalDeliveryOfficeName", ""))
            
        if "internal_phone" not in pending_fields:
            user.internal_phone = str(entry.get("telephoneNumber", ""))
        
        if "mobile_phone" not in pending_fields:
            user.mobile_phone = str(entry.get("mobile", ""))

        if warnings:
            user.sync_error_log = (user.sync_error_log or "") + "\n" + "\n".join(warnings)
        
        user.last_sync_timestamp = datetime.now(timezone.utc)

    def push(self):
        """
        Push pending/approved changes to AD.
        """
        with SessionLocal() as session:
            approved_requests = session.execute(
                select(ChangeRequest).where(ChangeRequest.status == "approved")
            ).scalars().all()

            if not approved_requests:
                return
                
            logger.info("Starting Push cycle.")

            processed_conflicts = set()

            with LDAPClient() as ldap:
                for cr in approved_requests:
                    user = session.get(User, cr.user_guid)
                    if not user:
                        continue
                    
                    if user.is_protected:
                        cr.status = "conflict" # Or keep approved? Spec says skip.
                        user.sync_error_log = (user.sync_error_log or "") + f"\nVIP profile, skipping push for {cr.id}"
                        logger.warning(f"Skipping push for protected user {user.sam_account_name}")
                        continue
                    
                    # Map internal attribute names to AD attributes
                    attr_map = {
                        "internal_phone": "telephoneNumber",
                        "mobile_phone": "mobile",
                        "office_location": "physicalDeliveryOfficeName"
                    }
                    
                    ad_attr = attr_map.get(cr.attribute_name)
                    if not ad_attr:
                        continue
                    
                    dn = ldap.get_dn_by_guid(str(user.object_guid))
                    if not dn:
                        logger.error(f"Could not find DN for user {user.object_guid}")
                        continue

                    success = ldap.modify_attribute(dn, ad_attr, cr.new_value)
                    if success:
                        cr.status = "applied"
                        cr.resolved_at = datetime.now(timezone.utc)
                        # Apply changes to local DB user upon success (Plan Option A)
                        setattr(user, cr.attribute_name, cr.new_value)
                        user.last_sync_timestamp = datetime.now(timezone.utc)
                        logger.info(f"Applied {cr.attribute_name} for {user.sam_account_name}")
                        
                        try:
                            from shared.models.report import Report
                            reports = session.execute(
                                select(Report).where(
                                    Report.target_user_guid == user.object_guid,
                                    Report.attribute_name == cr.attribute_name,
                                    Report.status == "approved"
                                )
                            ).scalars().all()
                            for r in reports:
                                r.status = "applied"
                        except Exception as e:
                            logger.error(f"Failed to update reports: {e}")
                        
                        try:
                            redis_client.publish("system_events", json.dumps({"type": "admin_update"}))
                            redis_client.publish("system_events", json.dumps({"type": "profile_updated", "user_id": str(user.object_guid)}))
                        except Exception as re:
                            logger.error(f"Redis publish error: {re}")
                    else:
                        # Check if another pending or conflict request already exists in DB
                        # or if we already set one to conflict in this cycle.
                        conflict_key = (str(user.object_guid), cr.attribute_name)
                        
                        existing = session.execute(
                            select(ChangeRequest).where(
                                ChangeRequest.user_guid == user.object_guid,
                                ChangeRequest.attribute_name == cr.attribute_name,
                                ChangeRequest.id != cr.id,
                                ChangeRequest.status.in_(["pending", "conflict"])
                            )
                        ).scalars().first()
                        
                        if existing or conflict_key in processed_conflicts:
                            cr.status = "rejected"
                            user.sync_error_log = (user.sync_error_log or "") + f"\nMarked {cr.id} as rejected to avoid duplicate pending/conflict."
                            logger.warning(f"Duplicate active request found. Marking {cr.id} as rejected.")
                            new_report_status = "rejected"
                        else:
                            cr.status = "conflict"
                            processed_conflicts.add(conflict_key)
                            new_report_status = "conflict"

                        error_msg = ldap.conn.result.get("description", "Unknown LDAP Error")
                        cr.rejection_reason = error_msg
                        user.sync_error_log = (user.sync_error_log or "") + f"\nAD Push failed for {cr.id}: {error_msg}"
                        logger.error(f"AD Push failed for {cr.id}: {error_msg}")
                        
                        try:
                            from shared.models.report import Report
                            reports = session.execute(
                                select(Report).where(
                                    Report.target_user_guid == user.object_guid,
                                    Report.attribute_name == cr.attribute_name,
                                    Report.status == "approved"
                                )
                            ).scalars().all()
                            for r in reports:
                                r.status = new_report_status
                                r.rejection_reason = error_msg
                        except Exception as e:
                            logger.error(f"Failed to update reports: {e}")
                            
                        try:
                            redis_client.publish("system_events", json.dumps({"type": "admin_update"}))
                            redis_client.publish("system_events", json.dumps({"type": "profile_updated", "user_id": str(user.object_guid)}))
                        except Exception as re:
                            logger.error(f"Redis publish error: {re}")
            
            # Clean up expired refresh tokens (EC-7)
            try:
                from shared.models.token import RefreshToken
                expired_tokens = session.execute(
                    select(RefreshToken).where(RefreshToken.expires_at < datetime.now(timezone.utc))
                ).scalars().all()
                for t in expired_tokens:
                    session.delete(t)
            except Exception as e:
                logger.error(f"Failed to clean up expired tokens: {e}")

            session.commit()
        
        logger.info("Push cycle completed.")

    def run_cycle(self):
        """
        Runs one full sync cycle (Pull then Push) with retry.
        """
        try:
            with_retry(self.pull)
            with_retry(self.push)
        except Exception as e:
            logger.error(f"Sync cycle failed: {e}")
