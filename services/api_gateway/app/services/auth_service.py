from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.ldap import authenticate_via_ldap
from app.core.security import create_access_token
from app.db.repository.user import get_user_by_sam, create_user_stub, get_user_by_guid
from app.db.repository.token import create_refresh_token, verify_refresh_token, revoke_refresh_token
from app.core.config import settings
from app.core.redis import check_brute_force, increment_brute_force, reset_brute_force
from app.schemas.auth import LoginResponse, Token, UserAuthResponse
import uuid

class AuthService:
    @staticmethod
    def login(db: Session, username: str, password: str, client_ip: str) -> LoginResponse:
        # 1. Brute-force protection
        if check_brute_force(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. IP blocked for 15 minutes."
            )

        # 2. LDAP BIND
        ldap_user = authenticate_via_ldap(username, password)
        if ldap_user is None:
            increment_brute_force(client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # 3. Success - reset counter
        reset_brute_force(client_ip)

        # 4. User lookup/creation
        user = get_user_by_sam(db, username)
        if not user:
            user = create_user_stub(
                db, 
                username, 
                guid=ldap_user.get("object_guid"),
                full_name=ldap_user.get("full_name")
            )
        elif ldap_user.get("object_guid") and str(user.object_guid) != ldap_user.get("object_guid"):
            # Update GUID if it was a stub with random UUID
            # This handles cases where a stub was created before this fix
            from sqlalchemy import update
            from app.models.user import User as UserModel
            db.execute(
                update(UserModel).where(UserModel.sam_account_name == username).values(object_guid=ldap_user.get("object_guid"))
            )
            db.commit()
            user = get_user_by_guid(db, ldap_user.get("object_guid"))

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

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=refresh_token,
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
