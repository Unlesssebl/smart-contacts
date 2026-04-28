from typing import Optional, Dict, Any
import ssl
import logging
import uuid
from ldap3 import Server, Connection, ALL, SIMPLE, Tls, SUBTREE
from app.core.config import settings

logger = logging.getLogger(__name__)

def authenticate_via_ldap(username: str, password: str) -> Optional[Dict[str, Any]]:
    if not password:
        return None

    try:
        # Configure TLS to ignore certificate errors
        tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
        
        use_ssl = settings.AD_SERVER.startswith("ldaps://")
        server = Server(
            settings.AD_SERVER, 
            get_info=ALL, 
            connect_timeout=10, 
            use_ssl=use_ssl,
            tls=tls_config
        )
        
        # Determine bind user
        user_bind_value = username if "@" in username else f"{username}@corporate.loc"
        
        logger.info(f"Attempting LDAP bind (SSL={use_ssl}) for: {user_bind_value}")
        
        conn = Connection(
            server, 
            user=user_bind_value, 
            password=password, 
            authentication=SIMPLE,
            check_names=True,
            raise_exceptions=False
        )
        
        if not use_ssl:
            try:
                conn.open()
                conn.start_tls()
            except Exception:
                pass 

        if not conn.bind():
            logger.warning(f"Failed LDAP bind for {user_bind_value}: {conn.result}")
            return None

        logger.info(f"Successfully authenticated user: {username}")
        
        # Search for the user to get their objectGUID
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
            guid_bytes = entry.objectGUID.value
            # Convert bytes to string UUID
            guid_str = str(uuid.UUID(bytes_le=guid_bytes))
            
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
