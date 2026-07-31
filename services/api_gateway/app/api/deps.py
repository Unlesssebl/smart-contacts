from fastapi import Depends, HTTPException, status, Request
from jose import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.db.repository.user import get_user_by_guid
from shared.models.user import User
from shared.models.enums import UserRole, UserStatus
from jose.exceptions import JWTError

def get_current_user_guid(request: Request) -> str:
    # 1. Get token from cookies or Authorization header (fallback for Swagger)
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 2. CSRF Protection for state-changing methods
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        
        # Bypass CSRF if using Bearer token (for non-browser clients / scripts)
        is_bearer = request.headers.get("Authorization", "").startswith("Bearer ")
        
        if not is_bearer:
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token validation failed")

    # 3. Validate JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_guid = payload.get("sub")
        if user_guid is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_guid
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

def get_current_user(
    db: Session = Depends(get_db), 
    user_guid: str = Depends(get_current_user_guid)
) -> User:
    user = get_user_by_guid(db, user_guid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deleted")
    
    # 4. Enforce user status (immediate revocation)
    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
        
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.IT_OPERATOR.value, UserRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges",
        )
    return current_user
