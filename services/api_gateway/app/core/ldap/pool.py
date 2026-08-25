import logging
import queue
import threading
from typing import Optional
from ldap3 import Connection, REUSABLE
from app.core.redis import redis_client
from app.db.session import SessionLocal
from app.core.settings_manager import get_setting
from .connection import server_pool

logger = logging.getLogger(__name__)
# Глобальный пул соединений для сервисного аккаунта (поиск пользователей)
_search_pool_conn = None
_current_pool_version = None
_pool_lock = threading.Lock()

# Пул соединений для аутентификации (проверки пароля)
auth_pool = queue.Queue(maxsize=20)

def _create_search_pool(ad_user: str, ad_password: str) -> Optional[Connection]:
    if not ad_user or not ad_password:
        return None
    try:
        conn = Connection(
            server_pool,
            user=ad_user,
            password=ad_password,
            client_strategy=REUSABLE,
            pool_size=5,
            pool_lifetime=3600,
            check_names=True,
            raise_exceptions=True
        )
        conn.open()
        return conn
    except Exception as e:
        logger.error(f"Failed to create LDAP search pool: {e}")
        return None

def get_search_pool() -> Optional[Connection]:
    global _search_pool_conn, _current_pool_version
    
    redis_version_str = redis_client.get("ldap_credentials_version")
    redis_version = int(redis_version_str) if redis_version_str else 0

    if _search_pool_conn is None or _current_pool_version != redis_version:
        with _pool_lock:
            if _search_pool_conn is None or _current_pool_version != redis_version:
                logger.info(f"LDAP credentials version changed from {_current_pool_version} to {redis_version}. Reloading...")
                db = SessionLocal()
                try:
                    ad_user = get_setting(db, "AD_USER")
                    ad_password = get_setting(db, "AD_PASSWORD", decrypt=True)
                    
                    # Close existing if exists
                    if _search_pool_conn:
                        try:
                            _search_pool_conn.unbind()
                        except Exception:
                            pass
                    
                    _search_pool_conn = _create_search_pool(ad_user, ad_password)
                    _current_pool_version = redis_version
                finally:
                    db.close()
            
    return _search_pool_conn

def init_ldap_pool():
    """Инициализация и проверка LDAP"""
    try:
        pool = get_search_pool()
        if pool:
            logger.info("LDAP search pool initialized from DB settings.")
        else:
            logger.warning("AD_USER/AD_PASSWORD not set in DB, search pool disabled")
            # Простая проверка связи
            with Connection(server_pool, receive_timeout=5) as conn:
                if conn.open():
                    logger.info("LDAP server is reachable")
    except Exception as e:
        logger.error(f"LDAP initialization failed: {e}")
