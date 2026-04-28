from ldap3 import Server, Connection, ALL, SIMPLE
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def authenticate_via_ldap(username: str, password: str) -> bool:
    """
    Authenticates user against Active Directory using LDAP BIND.
    Passwords are never logged or stored.
    """
    if not password:
        return False

    try:
        server = Server(settings.AD_SERVER, get_info=ALL)
        # Assuming username is sAMAccountName, we might need to construct the DN
        # or use user@domain format. Let's use user@domain if applicable, 
        # but often it's better to use the full DN or a search-first approach if DN is unknown.
        # For simplicity and following BIND requirement:
        user_dn = f"{username}@{settings.AD_BASE_DN.replace('DC=', '').replace(',', '.')}"
        
        conn = Connection(
            server, 
            user=user_dn, 
            password=password, 
            authentication=SIMPLE,
            check_names=True
        )
        
        if conn.bind():
            conn.unbind()
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"LDAP error for user {username}: {str(e)}")
        return False
