from sqlalchemy.orm import Session
from shared.models.token import RefreshToken
from app.core.security import hash_token
from datetime import datetime, timedelta, timezone
from app.core.config import settings
import uuid
from typing import Optional

def create_refresh_token(db: Session, user_guid: uuid.UUID) -> str:
    token = str(uuid.uuid4())
    token_hash = hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_token = RefreshToken(
        id=uuid.uuid4(),
        user_guid=user_guid,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    return token

def revoke_refresh_token(db: Session, token: str):
    token_hash = hash_token(token)
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if db_token:
        db_token.revoked = True
        db.commit()

def verify_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    token_hash = hash_token(token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked.is_(False),
        RefreshToken.expires_at > datetime.now(timezone.utc)
    ).first()
    return db_token
