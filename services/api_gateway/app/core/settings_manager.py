import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from shared.models.system_setting import SystemSetting
from app.core.config import settings
from app.core.redis import redis_client

# Generate a valid 32-byte url-safe base64 key from SECRET_KEY
def get_fernet_key(secret: str) -> bytes:
    # Use SHA-256 to ensure it's exactly 32 bytes
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)

cipher_suite = Fernet(get_fernet_key(settings.SECRET_KEY))

def encrypt_value(value: str) -> str:
    if not value:
        return value
    return cipher_suite.encrypt(value.encode("utf-8")).decode("utf-8")

def decrypt_value(value: str) -> str:
    if not value:
        return value
    try:
        return cipher_suite.decrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""

def get_setting(db: Session, key: str, decrypt: bool = False) -> Optional[str]:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        return None
    if decrypt:
        return decrypt_value(setting.value)
    return setting.value

def set_setting(db: Session, key: str, value: str, encrypt: bool = False):
    final_value = encrypt_value(value) if encrypt else value
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = final_value
    else:
        setting = SystemSetting(key=key, value=final_value)
        db.add(setting)
    db.commit()

def bump_ldap_credentials_version():
    """Инвалидация кэша конфигурации LDAP."""
    redis_client.incr("ldap_credentials_version")
