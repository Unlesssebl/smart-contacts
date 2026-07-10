import logging
from typing import Optional
from app.core.config import settings
from .pool import get_search_pool
from .schemas import LdapUser
from ldap3.utils.conv import escape_filter_chars

logger = logging.getLogger(__name__)

def search_user_by_sam(username: str) -> Optional[LdapUser]:
    search_pool_conn = get_search_pool()
    if not search_pool_conn:
        logger.warning("LDAP search pool not configured. Cannot search user by SAM.")
        return None

    safe_username = escape_filter_chars(username)
    search_filter = f"(sAMAccountName={safe_username})"
    try:
        search_pool_conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter=search_filter,
            attributes=["objectGUID", "displayName", "department", "title", "distinguishedName", "mobile", "telephoneNumber", "physicalDeliveryOfficeName", "userAccountControl"]
        )
        entries = list(search_pool_conn.entries)
        if entries:
            entry = entries[0]
            return LdapUser.from_entry(entry, username)
    except Exception as e:
        logger.error(f"Error searching user by SAM: {e}")
        
    return None

def get_all_ous() -> list[str]:
    """Fetches all unique OU names from the AD tree."""
    search_pool_conn = get_search_pool()
    if not search_pool_conn:
        logger.warning("LDAP search pool not configured. Cannot fetch OUs.")
        return []

    try:
        search_pool_conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter="(objectClass=organizationalUnit)",
            attributes=["ou", "distinguishedName"]
        )
        ou_names = []
        for entry in search_pool_conn.entries:
            if entry.ou:
                val = entry.ou.value
                if isinstance(val, list):
                    ou_names.extend(val)
                elif val:
                    ou_names.append(val)

        # Deduplicate and sort
        return sorted(list(set(ou_names)))
    except Exception as e:
        logger.error(f"Error fetching OUs from AD: {e}")
        return []
