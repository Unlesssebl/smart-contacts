import secrets
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")

    # 2. CSRF Protection for state-changing methods
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        
        # Bypass CSRF if using Bearer token (for non-browser clients / scripts)
        is_bearer = request.headers.get("Authorization", "").startswith("Bearer ")
        
        if not is_bearer:
            if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ошибка проверки CSRF-токена")

    # 3. Validate JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_guid = payload.get("sub")
        if user_guid is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")
        return user_guid
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Не удалось проверить учетные данные")

import json
import uuid
from datetime import datetime
from app.core.redis import redis_client

USER_CACHE_TTL = 30  # seconds

from sqlalchemy import event

def invalidate_user_cache(user_guid: str | uuid.UUID) -> None:
    """Invalidates the Redis cache entry for a user."""
    try:
        redis_client.delete(f"user_cache:{user_guid}")
    except Exception:
        pass

@event.listens_for(User, "after_update")
def _invalidate_cache_on_user_update(mapper, connection, target):
    if target and hasattr(target, "object_guid") and target.object_guid:
        invalidate_user_cache(target.object_guid)

@event.listens_for(User, "after_delete")
def _invalidate_cache_on_user_delete(mapper, connection, target):
    if target and hasattr(target, "object_guid") and target.object_guid:
        invalidate_user_cache(target.object_guid)

def _serialize_user(user: User) -> str:
    data = {
        c.name: getattr(user, c.name)
        for c in user.__table__.columns
    }
    if data.get("object_guid"):
        data["object_guid"] = str(data["object_guid"])
    if data.get("created_at") and isinstance(data["created_at"], datetime):
        data["created_at"] = data["created_at"].isoformat()
    if data.get("updated_at") and isinstance(data["updated_at"], datetime):
        data["updated_at"] = data["updated_at"].isoformat()
    if data.get("last_sync_timestamp") and isinstance(data["last_sync_timestamp"], datetime):
        data["last_sync_timestamp"] = data["last_sync_timestamp"].isoformat()
    return json.dumps(data)

def _deserialize_user(raw_json: str) -> User:
    data = json.loads(raw_json)
    if data.get("object_guid"):
        data["object_guid"] = uuid.UUID(data["object_guid"])
    for dt_col in ("created_at", "updated_at", "last_sync_timestamp"):
        if data.get(dt_col) and isinstance(data[dt_col], str):
            try:
                data[dt_col] = datetime.fromisoformat(data[dt_col])
            except Exception:
                data[dt_col] = None
    return User(**data)

def get_current_user(
    db: Session = Depends(get_db), 
    user_guid: str = Depends(get_current_user_guid)
) -> User:
    cache_key = f"user_cache:{user_guid}"
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            user = _deserialize_user(cached_data)
            if user.status != UserStatus.ACTIVE.value:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Учетная запись отключена")
            return user
    except HTTPException:
        raise
    except Exception:
        pass

    user = get_user_by_guid(db, user_guid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден или удален")
    
    # 4. Enforce user status (immediate revocation)
    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Учетная запись отключена")
        
    try:
        redis_client.setex(cache_key, USER_CACHE_TTL, _serialize_user(user))
    except Exception:
        pass

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.IT_OPERATOR.value, UserRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции",
        )
    return current_user


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User | None:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_guid = payload.get("sub")
        if not user_guid:
            return None
            
        cache_key = f"user_cache:{user_guid}"
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                user = _deserialize_user(cached_data)
                if user.status == UserStatus.ACTIVE.value:
                    return user
                return None
        except Exception:
            pass

        user = get_user_by_guid(db, user_guid)
        if user and user.status == UserStatus.ACTIVE.value:
            try:
                redis_client.setex(cache_key, USER_CACHE_TTL, _serialize_user(user))
            except Exception:
                pass
            return user
        return None
    except Exception:
        return None

