from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.db.repository.user import get_user_by_guid
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user_guid(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_guid = payload.get("sub")
        if user_guid is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_guid
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

async def get_current_user(
    db: Session = Depends(get_db), 
    user_guid: str = Depends(get_current_user_guid)
) -> User:
    user = get_user_by_guid(db, user_guid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
