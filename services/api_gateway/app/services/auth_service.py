from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.ldap import authenticate_via_ldap
from app.core.security import create_access_token
from app.db.repository.user import get_user_by_sam, create_user_stub, get_user_by_guid, update_user_guid
from app.db.repository.token import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.core.config import settings
from app.core.redis import is_brute_force_blocked, reset_brute_force
from app.schemas.auth import LoginResponse, Token, UserAuthResponse, AuthResult
import uuid

class AuthService:
    @staticmethod
    def login(db: Session, username: str, password: str, client_ip: str) -> AuthResult:
        # 1. Brute-force protection
        if is_brute_force_blocked(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. IP blocked for 15 minutes."
            )

        # 2. Development Account Bypass
        ldap_user = None
        if settings.DEV_USER and username == settings.DEV_USER and password == settings.DEV_PASSWORD:
            ldap_user = {
                "object_guid": "00000000-0000-0000-0000-000000000001",
                "full_name": "Development Admin",
                "department": "IT",
                "job_title": "Developer"
            }
        
        # 3. LDAP BIND (if not dev user)
        if not ldap_user:
            ldap_user = authenticate_via_ldap(username, password)
            
        if ldap_user is None:
            # Счетчик уже атомарно увеличен в is_brute_force_blocked
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # 4. Success - reset counter
        reset_brute_force(client_ip)

        # 4. User lookup/creation (Extracted)
        user = AuthService._ensure_user_from_ldap(db, username, ldap_user)

        # 5. Check for initial admin role
        init_admins = [a.strip().lower() for a in settings.INIT_ADMINS.split(",") if a.strip()]
        if username.lower() in init_admins and user.role != "it_operator":
            user.role = "it_operator"
            db.commit()
            db.refresh(user)

        # 6. Generate tokens
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
                grace_period_left=user.grace_period_left
            )
        )

    @staticmethod
    def login_sso(db: Session, full_username: str) -> AuthResult:
        """
        Handles SSO login after successful Kerberos ticket validation.
        """
        # 1. Normalize username (remove domain part if present: 'user@DOMAIN' -> 'user')
        username = full_username.split('@')[0].lower() if '@' in full_username else full_username.lower()

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

        # 3. Generate tokens
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
                grace_period_left=user.grace_period_left
            )
        )

    @staticmethod
    def _ensure_user_from_ldap(db: Session, username: str, ldap_user: dict):
        """
        Ensures a user exists in the local database based on LDAP info.
        Handles stub creation and GUID migration.
        """
        user = get_user_by_sam(db, username)
        ldap_guid = ldap_user.get("object_guid")

        if not user:
            user = create_user_stub(
                db, 
                username, 
                guid=ldap_guid,
                full_name=ldap_user.get("full_name")
            )
        
        # If user exists but GUID is different (e.g. random UUID stub), update it
        if ldap_guid and str(user.object_guid) != ldap_guid:
            update_user_guid(db, username, ldap_guid)
            user = get_user_by_guid(db, ldap_guid)
            
        # Update empty fields from LDAP to ensure users outside of the standard sync OU
        # still get their profiles populated upon login.
        user_updated = False
        fields_to_sync = {
            "full_name": "full_name",
            "department": "department",
            "job_title": "job_title",
            "mobile_phone": "mobile_phone",
            "internal_phone": "internal_phone",
            "office_location": "office_location"
        }
        
        for ldap_key, db_key in fields_to_sync.items():
            ldap_val = ldap_user.get(ldap_key)
            if ldap_val and not getattr(user, db_key):
                setattr(user, db_key, ldap_val)
                user_updated = True
                
        # Always sync ad_dn if it changed
        if ldap_user.get("ad_dn") and user.ad_dn != ldap_user.get("ad_dn"):
            user.ad_dn = ldap_user.get("ad_dn")
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
