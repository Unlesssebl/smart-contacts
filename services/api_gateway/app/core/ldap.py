from typing import Optional, Dict, Any
import ssl
import logging
import uuid
from ldap3 import Server, Connection, ALL, SIMPLE, Tls, SUBTREE, ServerPool, ROUND_ROBIN
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

def ad_guid_to_uuid(binary_guid: Any) -> str:
    """
    3.3. Конвертирует AD objectGUID в строку UUID v4.
    Поддерживает:
    - Бинарные данные (16 байт, little-endian)
    - Списки байтов (ldap3 style)
    - Строковые форматы
    """
    if isinstance(binary_guid, list):
        if not binary_guid:
            raise ValueError("GUID list is empty")
        binary_guid = binary_guid[0]
    
    if isinstance(binary_guid, str):
        return str(uuid.UUID(binary_guid.strip("{}")))
    
    if isinstance(binary_guid, bytes):
        if len(binary_guid) == 16:
            return str(uuid.UUID(bytes_le=binary_guid))
        try:
            return str(uuid.UUID(binary_guid.decode().strip("{}")))
        except Exception:
            pass
        
    raise ValueError(f"Unsupported GUID format: {type(binary_guid)}")

def authenticate_via_ldap(username: str, password: str) -> Optional[Dict[str, Any]]:
    if not password:
        return None

    try:
        # Определяем bind user
        user_bind_value = username if "@" in username else f"{username}@corporate.loc"
        
        logger.info(f"Attempting LDAP bind for: {user_bind_value}")
        
        # Используем Connection без контекстного менеджера здесь, так как мы сразу биндимся
        # Но для пула лучше иметь долгоживущий объект. 
        # В ldap3 Connection может переиспользовать сокеты если использовать пул.
        conn = Connection(
            server_pool, 
            user=user_bind_value, 
            password=password, 
            authentication=SIMPLE,
            check_names=True,
            raise_exceptions=True # Включаем исключения для лучшей обработки ошибок
        )
        
        if not conn.bind():
            logger.warning(f"Failed LDAP bind for {user_bind_value}: {conn.result}")
            return None

        logger.info(f"Successfully authenticated user: {username}")
        
        # Поиск пользователя
        search_filter = f"(sAMAccountName={username})"
        conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=["objectGUID", "displayName", "department", "title"]
        )
        
        user_data = None
        if conn.entries:
            entry = conn.entries[0]
            guid_str = ad_guid_to_uuid(entry.objectGUID.value)
            
            user_data = {
                "object_guid": guid_str,
                "full_name": entry.displayName.value if entry.displayName else username,
                "department": entry.department.value if entry.department else None,
                "job_title": entry.title.value if entry.title else None
            }
        
        conn.unbind()
        return user_data or {"object_guid": None}
        
    except Exception as e:
        logger.error(f"LDAP exception: {str(e)}")
        return None
