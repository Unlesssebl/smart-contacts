from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.ldap import authenticate_via_ldap
from app.core.security import create_access_token
from app.db.repository.user import get_user_by_sam, create_user_stub, get_user_by_guid, update_user_guid
from app.db.repository.token import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.core.config import settings
from app.core.redis import is_brute_force_blocked, reset_brute_force, decrement_brute_force
from app.schemas.auth import Token, UserAuthResponse, AuthResult
from shared.models.enums import UserRole
import logging

logger = logging.getLogger(__name__)

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

        # 1. Brute-force protection
        if is_brute_force_blocked(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. IP blocked for 15 minutes."
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
        
        # 3. LDAP BIND (if not dev user)
        if not ldap_user:
            try:
                ldap_user = authenticate_via_ldap(username, password)
            except ConnectionError as e:
                # Откатываем попытку входа, так как это проблема сервиса, а не пароля
                decrement_brute_force(client_ip)
                logger.error(f"LDAP is unavailable: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Auth service is temporarily unavailable"
                )
            
        if ldap_user is None:
            # Счетчик уже атомарно увеличен в is_brute_force_blocked
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # 4. Success - reset counter
        reset_brute_force(client_ip)

        # 5. User lookup/creation (Extracted)
        user = AuthService._ensure_user_from_ldap(db, username, ldap_user)

        # 6. Check for initial admin role
        init_admins = [a.strip().lower() for a in settings.INIT_ADMINS.split(",") if a.strip()]
        if username.lower() in init_admins and user.role != UserRole.IT_OPERATOR.value:
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
                        detail=f"User {username} not found in Active Directory"
                    )
            except Exception as e:
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"SSO authentication failed: {str(e)}"
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
        fields_to_sync = {
            "full_name": "full_name",
            "department": "department",
            "job_title": "job_title",
            "mobile_phone": "mobile_phone",
            "internal_phone": "internal_phone",
            "office_location": "office_location"
        }
        
        # Load pending CRs to protect fields (EC-6)
        from shared.models.change_request import ChangeRequest
        from shared.models.enums import ChangeRequestStatus
        
        pending_crs = db.query(ChangeRequest).filter(
            ChangeRequest.user_guid == user.object_guid,
            ChangeRequest.status.in_([ChangeRequestStatus.PENDING.value, ChangeRequestStatus.CONFLICT.value, ChangeRequestStatus.APPROVED.value])
        ).all()
        pending_fields = {cr.attribute_name for cr in pending_crs}

        for ldap_key, db_key in fields_to_sync.items():
            if db_key in pending_fields:
                continue
            ldap_val = getattr(ldap_user, ldap_key, None)
            if ldap_val and not getattr(user, db_key):
                setattr(user, db_key, ldap_val)
                user_updated = True
                
        # Always sync ad_dn if it changed
        ldap_ad_dn = getattr(ldap_user, "ad_dn", None)
        if ldap_ad_dn and user.ad_dn != ldap_ad_dn:
            user.ad_dn = ldap_ad_dn
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
                detail="Invalid or expired refresh token"
            )

        user = get_user_by_guid(db, db_token.user_guid)
        if not user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Validate against AD
        from app.core.ldap import search_user_by_sam
        ldap_user = search_user_by_sam(user.sam_account_name)
        if not ldap_user or ldap_user.is_disabled:
            revoke_refresh_token(db, token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled or not found in Active Directory"
            )

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
