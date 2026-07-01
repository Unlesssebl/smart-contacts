from typing import Optional, Dict, Any
import ssl
import logging
import queue
from ldap3 import Server, Connection, ALL, SIMPLE, Tls, ServerPool, ROUND_ROBIN, REUSABLE
from app.core.config import settings
from app.core.redis import redis_client
from app.db.session import SessionLocal
from app.core.settings_manager import get_setting

logger = logging.getLogger(__name__)

# 2.2. Пул соединений LDAP
# Настройка TLS
if settings.AD_INSECURE_SKIP_VERIFY:
    logger.warning("LDAP TLS certificate verification is DISABLED (AD_INSECURE_SKIP_VERIFY=True). This is insecure for production!")
    tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
else:
    tls_config = Tls(
        validate=ssl.CERT_REQUIRED, 
        version=ssl.PROTOCOL_TLSv1_2,
        ca_certs_file=settings.AD_CA_CERT_PATH
    )

use_ssl = settings.AD_SERVER.startswith("ldaps://")

# Создаем пул серверов
ldap_server = Server(
    settings.AD_SERVER,
    get_info=ALL,
    connect_timeout=10,
    use_ssl=use_ssl,
    tls=tls_config
)
server_pool = ServerPool([ldap_server], ROUND_ROBIN, active=True, exhaust=True)

# Глобальный пул соединений для сервисного аккаунта (поиск пользователей)
_search_pool_conn = None
_current_pool_version = None

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
    
    redis_version = redis_client.get("ldap_credentials_version")
    if redis_version:
        redis_version = int(redis_version)
    else:
        redis_version = 0

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

from shared.utils import ad_guid_to_uuid

def authenticate_via_ldap(username: str, password: str) -> Optional[Dict[str, Any]]:
    if not password:
        return None

    search_pool_conn = get_search_pool()
    search_filter = f"(sAMAccountName={username})"
    user_dn: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None
    ad_user_for_domain = None

    try:
        if search_pool_conn:
            # We need to get the AD_USER to extract the domain for bind fallback later
            db = SessionLocal()
            try:
                ad_user_for_domain = get_setting(db, "AD_USER")
            finally:
                db.close()
                
            search_pool_conn.search(
                search_base=settings.AD_BASE_DN,
                search_filter=search_filter,
                attributes=["objectGUID", "displayName", "department", "title", "distinguishedName", "mobile", "telephoneNumber", "physicalDeliveryOfficeName"]
            )
            entries = list(search_pool_conn.entries)
            if entries:
                entry = entries[0]
                user_dn = entry.distinguishedName.value
                user_data = {
                    "object_guid": ad_guid_to_uuid(entry.objectGUID.value),
                    "full_name": entry.displayName.value if entry.displayName else username,
                    "department": entry.department.value if entry.department else None,
                    "job_title": entry.title.value if entry.title else None,
                    "mobile_phone": entry.mobile.value if entry.mobile else None,
                    "internal_phone": entry.telephoneNumber.value if entry.telephoneNumber else None,
                    "office_location": entry.physicalDeliveryOfficeName.value if entry.physicalDeliveryOfficeName else None
                }

        # Bind: fallback — UPN
        ad_domain = ad_user_for_domain.split("@")[-1] if ad_user_for_domain and "@" in ad_user_for_domain else "corporate.loc"
        user_bind_value = user_dn if user_dn else (
            username if "@" in username else f"{username}@{ad_domain}"
        )

        # Проверка пароля — используем пул соединений
        try:
            auth_conn = auth_pool.get_nowait()
            auth_conn.user = user_bind_value
            auth_conn.password = password
        except queue.Empty:
            auth_conn = Connection(
                server_pool,
                user=user_bind_value,
                password=password,
                authentication=SIMPLE,
                check_names=True,
                raise_exceptions=False
            )

        try:
            logger.info(f"Attempting LDAP bind for: {user_bind_value}")
            if not auth_conn.bind():
                logger.warning(f"Failed LDAP bind for {user_bind_value}: {auth_conn.result}")
                return None

            logger.info(f"Successfully authenticated user: {username}")

            if not user_data:
                auth_conn.search(
                    search_base=settings.AD_BASE_DN,
                    search_filter=search_filter,
                    attributes=["objectGUID", "displayName", "department", "title", "mobile", "telephoneNumber", "physicalDeliveryOfficeName"]
                )
                entries = list(auth_conn.entries)
                if entries:
                    entry = entries[0]
                    user_data = {
                        "object_guid": ad_guid_to_uuid(entry.objectGUID.value),
                        "full_name": entry.displayName.value if entry.displayName else username,
                        "department": entry.department.value if entry.department else None,
                        "job_title": entry.title.value if entry.title else None,
                        "mobile_phone": entry.mobile.value if entry.mobile else None,
                        "internal_phone": entry.telephoneNumber.value if entry.telephoneNumber else None,
                        "office_location": entry.physicalDeliveryOfficeName.value if entry.physicalDeliveryOfficeName else None
                    }
                else:
                    user_data = {"object_guid": None, "full_name": username}

            return user_data

        finally:
            try:
                auth_pool.put_nowait(auth_conn)
            except queue.Full:
                auth_conn.unbind()

    except Exception as e:
        logger.error(f"LDAP exception: {str(e)}")
        return None

def search_user_by_sam(username: str) -> Optional[Dict[str, Any]]:
    search_pool_conn = get_search_pool()
    if not search_pool_conn:
        logger.warning("LDAP search pool not configured. Cannot search user by SAM.")
        return None

    search_filter = f"(sAMAccountName={username})"
    try:
        search_pool_conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter=search_filter,
            attributes=["objectGUID", "displayName", "department", "title", "mobile", "telephoneNumber", "physicalDeliveryOfficeName"]
        )
        entries = list(search_pool_conn.entries)
        if entries:
            entry = entries[0]
            return {
                "object_guid": ad_guid_to_uuid(entry.objectGUID.value),
                "full_name": entry.displayName.value if entry.displayName else username,
                "department": entry.department.value if entry.department else None,
                "job_title": entry.title.value if entry.title else None,
                "mobile_phone": entry.mobile.value if entry.mobile else None,
                "internal_phone": entry.telephoneNumber.value if entry.telephoneNumber else None,
                "office_location": entry.physicalDeliveryOfficeName.value if entry.physicalDeliveryOfficeName else None
            }
    except Exception as e:
        logger.error(f"Error searching user by SAM: {e}")
        
    return None
