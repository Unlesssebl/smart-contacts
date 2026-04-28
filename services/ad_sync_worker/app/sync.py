import logging
import os
from datetime import datetime
from sqlalchemy import select, update
from .config import settings
from .db import SessionLocal, User, ChangeRequest
from .ldap import LDAPClient
from .logic import ad_guid_to_uuid, determine_status, match_organization
from .utils import with_retry

logger = logging.getLogger(__name__)

USN_FILE = "last_usn.txt"

class SyncWorker:
    def __init__(self):
        self.last_usn = self._load_last_usn()

    def _load_last_usn(self) -> int:
        if os.path.exists(USN_FILE):
            try:
                with open(USN_FILE, "r") as f:
                    return int(f.read().strip())
            except Exception:
                return 0
        return 0

    def _save_last_usn(self, usn: int):
        self.last_usn = usn
        with open(USN_FILE, "w") as f:
            f.write(str(usn))

    def pull(self):
        """
        Poll AD for changes since last_usn.
        """
        logger.info(f"Starting Pull cycle. Last USN: {self.last_usn}")
        
        filter_str = f"(&(objectClass=user)(objectCategory=person)(uSNChanged>={self.last_usn}))"
        attributes = [
            "objectGUID", "sAMAccountName", "displayName", "mobile", 
            "telephoneNumber", "department", "physicalDeliveryOfficeName", 
            "userAccountControl", "uSNChanged", "memberOf", "title"
        ]

        max_usn = self.last_usn

        with LDAPClient() as ldap:
            for entry in ldap.search_paged(filter_str, attributes):
                self._process_ad_entry(entry)
                current_usn = int(entry.get("uSNChanged", 0))
                if current_usn > max_usn:
                    max_usn = current_usn

        if max_usn > self.last_usn:
            self._save_last_usn(max_usn + 1)
        
        logger.info("Pull cycle completed.")

    def _process_ad_entry(self, entry: dict):
        guid_bytes = entry.get("objectGUID")
        if not guid_bytes:
            return
        
        guid_str = ad_guid_to_uuid(guid_bytes)
        sam = str(entry.get("sAMAccountName", ""))
        uac = int(entry.get("userAccountControl", 0))
        
        status = determine_status(uac, sam)
        org, warnings = match_organization(entry.get("memberOf", []))
        
        with SessionLocal() as session:
            user = session.get(User, guid_str)
            
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
                    internal_phone=str(entry.get("telephoneNumber", "")),
                    mobile_phone=str(entry.get("mobile", "")),
                    sync_error_log="\n".join(warnings) if warnings else None,
                    last_sync_timestamp=datetime.now()
                )
                session.add(user)
                logger.info(f"Created new user: {sam} ({guid_str})")
            else:
                # Update existing user
                user.sam_account_name = sam
                user.status = status
                user.full_name = str(entry.get("displayName", ""))
                user.job_title = str(entry.get("title", ""))
                user.department = str(entry.get("department", ""))
                user.office_location = str(entry.get("physicalDeliveryOfficeName", ""))
                user.organization = org
                
                # Update phones ONLY if no pending change requests (Conflict Resolution)
                # We check for 'pending' or 'conflict' status
                pending_cr = session.execute(
                    select(ChangeRequest).where(
                        ChangeRequest.user_guid == user.object_guid,
                        ChangeRequest.status.in_(["pending", "conflict"])
                    )
                ).scalars().all()
                
                pending_fields = {cr.attribute_name for cr in pending_cr}
                
                if "internal_phone" not in pending_fields:
                    user.internal_phone = str(entry.get("telephoneNumber", ""))
                
                if "mobile_phone" not in pending_fields:
                    user.mobile_phone = str(entry.get("mobile", ""))

                if "office_location" not in pending_fields:
                    user.office_location = str(entry.get("physicalDeliveryOfficeName", ""))

                if "department" not in pending_fields:
                    user.department = str(entry.get("department", ""))

                if "full_name" not in pending_fields:
                    user.full_name = str(entry.get("displayName", ""))

                if warnings:
                    user.sync_error_log = (user.sync_error_log or "") + "\n" + "\n".join(warnings)
                
                user.last_sync_timestamp = datetime.now()
                logger.info(f"Updated user: {sam}")

            session.commit()

    def push(self):
        """
        Push approved change requests to AD.
        """
        logger.info("Starting Push cycle.")
        
        with SessionLocal() as session:
            approved_requests = session.execute(
                select(ChangeRequest).where(ChangeRequest.status == "approved")
            ).scalars().all()

            if not approved_requests:
                logger.info("No approved requests to push.")
                return

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
                        cr.resolved_at = datetime.now()
                        user.last_sync_timestamp = datetime.now()
                        logger.info(f"Applied {cr.attribute_name} for {user.sam_account_name}")
                    else:
                        user.sync_error_log = (user.sync_error_log or "") + f"\nAD Push failed for {cr.id}"
            
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
