from typing import Optional, Dict, Any
import ssl
import logging
import uuid
from ldap3 import Server, Connection, ALL, SIMPLE, Tls, SUBTREE, ServerPool, ROUND_ROBIN, REUSABLE
from app.core.config import settings

logger = logging.getLogger(__name__)

# 2.2. Пул соединений LDAP
# Настройка TLS
tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
use_ssl = settings.AD_SERVER.startswith("ldaps://")

# Создаем пул серверов (даже если сервер один)
ldap_server = Server(
    settings.AD_SERVER,
    get_info=ALL,
    connect_timeout=10,
    use_ssl=use_ssl,
    tls=tls_config
)
server_pool = ServerPool([ldap_server], ROUND_ROBIN, active=True, exhaust=True)

# Создаем глобальный объект Connection с пулом для переиспользования сокетов
ldap_pool_conn = Connection(
    server_pool,
    client_strategy=REUSABLE,
    pool_size=10,
    pool_lifetime=3600,
    check_names=True,
    raise_exceptions=True
)

from shared.utils import ad_guid_to_uuid

def authenticate_via_ldap(username: str, password: str) -> Optional[Dict[str, Any]]:
    if not password:
        return None

    try:
        # Определяем bind user
        user_bind_value = username if "@" in username else f"{username}@corporate.loc"
        
        logger.info(f"Attempting LDAP bind for: {user_bind_value}")
        
        # Вместо создания нового соединения, используем rebind на глобальном пуле
        # В ldap3 Connection может переиспользовать сокеты если использовать пул.
        try:
            if not ldap_pool_conn.rebind(user=user_bind_value, password=password):
                logger.warning(f"Failed LDAP bind for {user_bind_value}: {ldap_pool_conn.result}")
                return None
        except Exception as e:
            logger.warning(f"Failed LDAP bind for {user_bind_value}: {str(e)}")
            return None

        logger.info(f"Successfully authenticated user: {username}")
        
        # Поиск пользователя
        search_filter = f"(sAMAccountName={username})"
        ldap_pool_conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=["objectGUID", "displayName", "department", "title"]
        )
        
        user_data = None
        if ldap_pool_conn.entries:
            entry = ldap_pool_conn.entries[0]
            guid_str = ad_guid_to_uuid(entry.objectGUID.value)
            
            user_data = {
                "object_guid": guid_str,
                "full_name": entry.displayName.value if entry.displayName else username,
                "department": entry.department.value if entry.department else None,
                "job_title": entry.title.value if entry.title else None
            }
        
        # Пул сам управляет соединениями, unbind делать не нужно
        return user_data or {"object_guid": None}
        
    except Exception as e:
        logger.error(f"LDAP exception: {str(e)}")
        return None
