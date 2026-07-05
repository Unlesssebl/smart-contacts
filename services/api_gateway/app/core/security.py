from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from jose import jwt
from app.core.config import settings
import hashlib

def create_access_token(subject: Union[str, Any], role: str, sam: str, dept: Optional[str]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "sam": sam,
        "dept": dept or ""
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def hash_token(token: str) -> str:
    """
    Creates a SHA-256 hash of the token for storage.
    """
    return hashlib.sha256(token.encode()).hexdigest()

