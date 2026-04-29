from typing import Optional, Dict, Any
import ssl
import logging
import queue
from ldap3 import Server, Connection, ALL, SIMPLE, Tls, ServerPool, ROUND_ROBIN, REUSABLE
from app.core.config import settings

logger = logging.getLogger(__name__)

# 2.2. Пул соединений LDAP
# Настройка TLS
tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
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
search_pool_conn = None
# Пул соединений для аутентификации (проверки пароля)
auth_pool = queue.Queue(maxsize=20)

if settings.AD_USER and settings.AD_PASSWORD:
    search_pool_conn = Connection(
        server_pool,
        user=settings.AD_USER,
        password=settings.AD_PASSWORD,
        client_strategy=REUSABLE,
        pool_size=5,
        pool_lifetime=3600,
        check_names=True,
        raise_exceptions=True
    )

def init_ldap_pool():
    """Инициализация и проверка LDAP"""
    try:
        if search_pool_conn:
            logger.info("Initializing LDAP search pool...")
            search_pool_conn.open()
            logger.info("LDAP search pool initialized")
        else:
            logger.warning("AD_USER/AD_PASSWORD not set, search pool disabled")
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

    # 1. Поиск пользователя через сервисный аккаунт (если настроен)
    # Важно: читаем entries локально сразу после search, чтобы избежать
    # race condition при параллельных запросах к общему REUSABLE-соединению.
    search_filter = f"(sAMAccountName={username})"
    user_dn: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None

    try:
        if search_pool_conn:
            search_pool_conn.search(
                search_base=settings.AD_BASE_DN,
                search_filter=search_filter,
                attributes=["objectGUID", "displayName", "department", "title", "distinguishedName"]
            )
            # Захватываем локальную копию до следующего вызова search
            entries = list(search_pool_conn.entries)
            if entries:
                entry = entries[0]
                user_dn = entry.distinguishedName.value
                user_data = {
                    "object_guid": ad_guid_to_uuid(entry.objectGUID.value),
                    "full_name": entry.displayName.value if entry.displayName else username,
                    "department": entry.department.value if entry.department else None,
                    "job_title": entry.title.value if entry.title else None
                }

        # 2. Bind: предпочитаем DN (точный); fallback — UPN
        ad_domain = settings.AD_SERVER.split("//")[-1].rstrip("/")
        user_bind_value = user_dn if user_dn else (
            username if "@" in username else f"{username}@{ad_domain}"
        )

        # 3. Проверка пароля — используем пул соединений
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

            # 4. Если сервисного аккаунта нет — получаем данные через auth-соединение
            if not user_data:
                auth_conn.search(
                    search_base=settings.AD_BASE_DN,
                    search_filter=search_filter,
                    attributes=["objectGUID", "displayName", "department", "title"]
                )
                entries = list(auth_conn.entries)
                if entries:
                    entry = entries[0]
                    user_data = {
                        "object_guid": ad_guid_to_uuid(entry.objectGUID.value),
                        "full_name": entry.displayName.value if entry.displayName else username,
                        "department": entry.department.value if entry.department else None,
                        "job_title": entry.title.value if entry.title else None
                    }
                else:
                    user_data = {"object_guid": None, "full_name": username}

            return user_data

        finally:
            # Возвращаем соединение в пул для повторного использования (rebind)
            try:
                auth_pool.put_nowait(auth_conn)
            except queue.Full:
                auth_conn.unbind()

    except Exception as e:
        logger.error(f"LDAP exception: {str(e)}")
        return None
