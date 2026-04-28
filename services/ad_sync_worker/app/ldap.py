from typing import List, Dict, Any, Optional, Generator
from ldap3 import Server, Connection, ALL, SUBTREE
import logging

from .config import settings

logger = logging.getLogger(__name__)


class LDAPClient:
    def __init__(self):
        self.server = Server(settings.AD_SERVER, get_info=ALL)
        self.conn = Connection(
            self.server,
            user=settings.AD_USER,
            password=settings.AD_PASSWORD,
            authentication="SIMPLE",
            auto_bind=True
        )

    def search_paged(
        self, 
        search_filter: str, 
        attributes: List[str], 
        page_size: int = 1000
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Performs a paged LDAP search.
        """
        paged_search = self.conn.extend.standard.paged_search(
            search_base=settings.AD_BASE_DN,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=attributes,
            paged_size=page_size,
            generator=True
        )

        for entry in paged_search:
            if "attributes" in entry:
                yield entry["attributes"]

    def modify_attribute(self, dn: str, attribute: str, value: str) -> bool:
        """
        Updates a single attribute for a given DN.
        """
        try:
            from ldap3 import MODIFY_REPLACE
            self.conn.modify(dn, {attribute: [(MODIFY_REPLACE, [value])]})
            if self.conn.result["description"] == "success":
                return True
            else:
                logger.error(f"LDAP Modify failed for {dn}: {self.conn.result['description']}")
                return False
        except Exception as e:
            logger.error(f"LDAP Modify exception for {dn}: {e}")
            return False

    def get_dn_by_guid(self, guid_str: str) -> Optional[str]:
        """
        Finds DN of an object by its objectGUID.
        """
        import uuid
        guid_bytes = uuid.UUID(guid_str).bytes_le
        guid_filter = "".join(f"\\{b:02x}" for b in guid_bytes)
        
        self.conn.search(
            search_base=settings.AD_BASE_DN,
            search_filter=f"(objectGUID={guid_filter})",
            attributes=["distinguishedName"]
        )
        
        if self.conn.entries:
            return self.conn.entries[0].entry_dn
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.unbind()
