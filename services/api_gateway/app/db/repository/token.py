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
    if db_token and not db_token.revoked:
        # Устанавливаем grace window 10 секунд перед полным отзывом (EC-5)
        try:
            from app.core.redis import redis_client
            grace_key = f"token_grace:{token_hash}"
            if not redis_client.exists(grace_key):
                redis_client.setex(grace_key, 10, str(db_token.user_guid))
        except Exception:
            pass
            
        db_token.revoked = True
        db.commit()


def verify_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    token_hash = hash_token(token)
    
    # 1. Сначала ищем активный токен
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked.is_(False),
        RefreshToken.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if db_token:
        return db_token
        
    # 2. Если токен не найден или отозван, проверяем grace window в Redis (EC-5)
    # Это позволяет параллельным запросам (например, с двух вкладок) пройти
    # в течение 10 секунд после первого отзыва токена.
    try:
        from app.core.redis import redis_client
        grace_key = f"token_grace:{token_hash}"
        user_guid_str = redis_client.get(grace_key)
        
        if user_guid_str:
            # Возвращаем "фантомный" токен для успешного refresh
            user_guid = uuid.UUID(user_guid_str)
            return RefreshToken(
                id=uuid.uuid4(),
                user_guid=user_guid,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=1),
                revoked=False
            )
    except Exception:
        # Игнорируем ошибки Redis
        pass
        
    return None
