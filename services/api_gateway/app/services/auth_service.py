import json
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.ldap import (
    authenticate_via_ldap,
    LdapAuthError,
    LdapWorkstationRestrictionError,
    LdapPasswordExpiredError,
    LdapAccountDisabledError,
    LdapAccountLockedError
)
from app.core.security import create_access_token
from app.db.repository.user import get_user_by_sam, create_user_stub, get_user_by_guid, update_user_guid
from app.db.repository.token import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.core.config import settings
from app.core import settings_manager
from app.core.redis import check_brute_force_block, record_failed_login, reset_brute_force, decrement_brute_force
from app.schemas.auth import Token, UserAuthResponse, AuthResult
from shared.models.enums import UserRole, ChangeRequestStatus, UserStatus
from shared.models.change_request import ChangeRequest
from shared.utils import parse_ou_structure, apply_canonical_mapping, format_phone

logger = logging.getLogger(__name__)

def _format_ban_detail_and_headers(retry_after: int, is_permanent: bool) -> tuple[str, dict]:
    if is_permanent:
        detail = (
            f"Доступ заблокирован из-за множественных неудачных попыток входа. "
            f"Пожалуйста, позвоните по номеру {settings.BRUTE_FORCE_HELPDESK_PHONE} "
            f"или оставьте заявку в HelpDesk."
        )
        return detail, {"Retry-After": "86400", "X-Permanent-Ban": "true"}
    else:
        if retry_after >= 3600:
            hours = max(1, round(retry_after / 3600))
            time_str = f"{hours} ч."
        elif retry_after >= 60:
            mins = max(1, (retry_after + 59) // 60)
            time_str = f"{mins} мин."
        else:
            time_str = f"{max(1, retry_after)} сек."

        detail = f"Слишком много попыток входа. Попробуйте через {time_str}."
        return detail, {"Retry-After": str(retry_after)}

class AuthService:
    @staticmethod
    def login(db: Session, username: str, password: str, client_ip: str) -> AuthResult:
        # Normalize username (remove domain part if present: 'user@DOMAIN' -> 'user' or 'DOMAIN\user' -> 'user')
        username_lower = username.lower()
        if '@' in username_lower:
            username = username_lower.split('@')[0]
        elif '\\' in username_lower:
            username = username_lower.split('\\')[1]
        else:
            username = username_lower

        # 1. Brute-force protection: check if IP is currently blocked
        is_blocked, retry_after, is_permanent = check_brute_force_block(client_ip)
        if is_blocked:
            detail, headers = _format_ban_detail_and_headers(retry_after, is_permanent)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=detail,
                headers=headers
            )

        # 2. Development Account Bypass
        ldap_user = None
        if settings.DEV_USER and username == settings.DEV_USER and password == settings.DEV_PASSWORD:
            from app.core.ldap.schemas import LdapUser
            ldap_user = LdapUser(
                object_guid="00000000-0000-0000-0000-000000000001",
                full_name="Development Admin",
                department="IT",
                job_title="Developer"
            )
            # Ensure the dev stub is always protected from AD sync reconciliation
            _dev_guid = "00000000-0000-0000-0000-000000000001"
            from app.db.session import SessionLocal
            from app.db.repository.user import get_user_by_guid
            with SessionLocal() as _db:
                _dev_user = get_user_by_guid(_db, _dev_guid)
                if _dev_user and not _dev_user.is_protected:
                    _dev_user.is_protected = True
                    _db.commit()
        
        # 3. LDAP BIND (if not dev user)
        if not ldap_user:
            try:
                ldap_user = authenticate_via_ldap(username, password)
            except LdapAuthError as lae:
                logger.warning(f"LDAP policy error for {username}: {lae}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=lae.message
                )
            except ConnectionError as e:
                logger.error(f"LDAP is unavailable: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Служба авторизации временно недоступна"
                )
            
        if ldap_user is None:
            # Record failed login attempt in Redis only when authentication fails
            is_blocked, retry_after, is_permanent = record_failed_login(client_ip, sam_account=username)
            if is_blocked:
                detail, headers = _format_ban_detail_and_headers(retry_after, is_permanent)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=detail,
                    headers=headers
                )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный логин или пароль"
            )

        # 4. Success - reset counter completely
        reset_brute_force(client_ip)

        # 5. User lookup/creation (Extracted)
        user = AuthService._ensure_user_from_ldap(db, username, ldap_user)

        # 6. Check for initial admin role
        admin_list = [a.strip().lower() for a in f"{settings.INIT_ADMINS},{settings.ADMINS}".split(",") if a.strip()]
        if settings.DEV_USER:
            admin_list.append(settings.DEV_USER.lower())

        if username.lower() in admin_list and user.role != UserRole.IT_OPERATOR.value:
            user.role = UserRole.IT_OPERATOR.value
            db.commit()
            db.refresh(user)

        # 7. Generate tokens and return result
        return AuthService._build_auth_result(user, db)

    @staticmethod
    def login_sso(db: Session, full_username: str) -> AuthResult:
        """
        Handles SSO login after successful Kerberos ticket validation.
        """
        # 1. Normalize username (remove domain part if present: 'user@DOMAIN' -> 'user' or 'DOMAIN\user' -> 'user')
        full_username_lower = full_username.lower()
        if '@' in full_username_lower:
            username = full_username_lower.split('@')[0]
        elif '\\' in full_username_lower:
            username = full_username_lower.split('\\')[1]
        else:
            username = full_username_lower

        # 2. User lookup
        user = get_user_by_sam(db, username)
        
        # If user not in DB or missing key fields, fetch from LDAP
        if not user or not getattr(user, 'department', None):
            try:
                from app.core.ldap import search_user_by_sam
                ldap_info = search_user_by_sam(username)
                if ldap_info:
                    user = AuthService._ensure_user_from_ldap(db, username, ldap_info)
                elif not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Пользователь {username} не найден в Active Directory"
                    )
            except Exception as e:
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Ошибка SSO авторизации: {str(e)}"
                    )

        # 3. Generate tokens and return result
        return AuthService._build_auth_result(user, db)

    @staticmethod
    def _build_auth_result(user, db: Session) -> AuthResult:
        access_token = create_access_token(
            subject=user.object_guid,
            role=user.role,
            sam=user.sam_account_name,
            dept=user.department
        )
        refresh_token = create_refresh_token(db, user.object_guid)

        return AuthResult(
            tokens=Token(
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                refresh_token=refresh_token
            ),
            user=UserAuthResponse(
                id=user.object_guid,
                sam_account_name=user.sam_account_name,
                full_name=user.full_name,
                role=user.role,
                is_verified=user.is_verified,
                grace_period_left=user.grace_period_left,
                avatar_color=user.avatar_color
            )
        )

    @staticmethod
    def _ensure_user_from_ldap(db: Session, username: str, ldap_user):
        """
        Ensures a user exists in the local database based on LDAP info.
        Handles stub creation and GUID migration.
        """
        ldap_guid = getattr(ldap_user, "object_guid", None)
        
        user = None
        if ldap_guid:
            user = get_user_by_guid(db, ldap_guid)
            
        if not user:
            user = get_user_by_sam(db, username)

        if not user:
            user = create_user_stub(
                db, 
                username, 
                guid=ldap_guid,
                full_name=getattr(ldap_user, "full_name", None)
            )
        
        # If user exists but GUID is different (e.g. random UUID stub), update it
        if ldap_guid and str(user.object_guid) != ldap_guid:
            update_user_guid(db, user.sam_account_name, ldap_guid)
            user = get_user_by_guid(db, ldap_guid)
            
        user_updated = False
        
        # Sync SAM account name if it changed (e.g. case sensitivity or rename)
        if user.sam_account_name != username:
            user.sam_account_name = username
            user_updated = True

        # Load mappings
        dept_map_str = settings_manager.get_setting(db, "DEPT_MAPPING")
        job_map_str = settings_manager.get_setting(db, "JOB_TITLE_MAPPING")
        dept_mapping = {}
        job_title_mapping = {}
        if dept_map_str:
            try:
                dept_mapping = json.loads(dept_map_str)
            except Exception:
                pass
        if job_map_str:
            try:
                job_title_mapping = json.loads(job_map_str)
            except Exception:
                pass

        # Load pending CRs to protect fields (EC-6)
        pending_crs = db.query(ChangeRequest).filter(
            ChangeRequest.user_guid == user.object_guid,
            ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value, ChangeRequestStatus.APPROVED.value])
        ).all()
        pending_fields = {cr.attribute_name for cr in pending_crs}

        # Sync job title
        raw_job = getattr(ldap_user, "job_title", None)
        if raw_job:
            if user.job_title_raw != raw_job:
                user.job_title_raw = raw_job
                user_updated = True
            canonical_job = apply_canonical_mapping(raw_job, job_title_mapping)
            if "job_title" not in pending_fields and canonical_job and user.job_title != canonical_job:
                user.job_title = canonical_job
                user_updated = True

        # Sync scalar contact fields
        scalar_fields = {
            "full_name": getattr(ldap_user, "full_name", None),
            "mobile_phone": format_phone(getattr(ldap_user, "mobile_phone", None)),
            "internal_phone": format_phone(getattr(ldap_user, "internal_phone", None)),
            "office_location": getattr(ldap_user, "office_location", None),
        }
        for field_name, field_val in scalar_fields.items():
            if field_name not in pending_fields and field_val and getattr(user, field_name) != field_val:
                setattr(user, field_name, field_val)
                user_updated = True

        # Always sync ad_dn if it changed
        ldap_ad_dn = getattr(ldap_user, "ad_dn", None)
        if ldap_ad_dn and user.ad_dn != ldap_ad_dn:
            user.ad_dn = ldap_ad_dn
            user_updated = True

        if user.ad_dn:
            ou_map_str = settings_manager.get_setting(db, "OU_MAPPING")
            ou_map = {}
            if ou_map_str:
                try:
                    ou_map = json.loads(ou_map_str)
                except Exception:
                    pass
            org, raw_dept, _ = parse_ou_structure(user.ad_dn, ou_map, fallback_dept=getattr(ldap_user, "department", None))
            if "organization" not in pending_fields and org and user.organization != org:
                user.organization = org
                user_updated = True
            if raw_dept:
                if user.department_raw != raw_dept:
                    user.department_raw = raw_dept
                    user_updated = True
                canonical_dept = apply_canonical_mapping(raw_dept, dept_mapping)
                if "department" not in pending_fields and canonical_dept and user.department != canonical_dept:
                    user.department = canonical_dept
                    user_updated = True

        if user_updated:
            db.commit()
            db.refresh(user)

        return user

    @staticmethod
    def refresh(db: Session, token: str) -> Token:
        db_token = verify_refresh_token(db, token)
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный или истекший refresh-токен"
            )

        user = get_user_by_guid(db, db_token.user_guid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Пользователь не найден"
            )

        if user.status != UserStatus.ACTIVE.value:
            revoke_refresh_token(db, token)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Учетная запись отключена"
            )

        # Validate against AD (revoke only if explicitly disabled in AD)
        try:
            from app.core.ldap import search_user_by_sam
            ldap_user = search_user_by_sam(user.sam_account_name)
            if ldap_user and ldap_user.is_disabled:
                revoke_refresh_token(db, token)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Учетная запись отключена в Active Directory"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"AD check during token refresh failed for {user.sam_account_name}: {e}")


        # Token rotation: revoke old, create new
        revoke_refresh_token(db, token)
        
        new_access_token = create_access_token(
            subject=user.object_guid,
            role=user.role,
            sam=user.sam_account_name,
            dept=user.department
        )
        new_refresh_token = create_refresh_token(db, user.object_guid)

        return Token(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=new_refresh_token
        )
