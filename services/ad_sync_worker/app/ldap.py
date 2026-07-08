from typing import List, Dict, Any, Optional, Generator
from ldap3 import Server, Connection, ALL, SUBTREE, Tls
from ldap3.core.exceptions import LDAPBindError
import ssl
import logging
import base64
import hashlib
from cryptography.fernet import Fernet
from app.db import SessionLocal
from shared.models.system_setting import SystemSetting

from .config import settings

logger = logging.getLogger(__name__)

class InvalidLDAPCredentialsError(Exception):
    pass

class LDAPClient:
    def __init__(self):
        # Fetch credentials from DB
        with SessionLocal() as db:
            ad_user_setting = db.query(SystemSetting).filter(SystemSetting.key == "AD_USER").first()
            ad_password_setting = db.query(SystemSetting).filter(SystemSetting.key == "AD_PASSWORD").first()
            
            ad_user = ad_user_setting.value if ad_user_setting else None
            ad_password_encrypted = ad_password_setting.value if ad_password_setting else None
            
        if not ad_user or not ad_password_encrypted:
            raise InvalidLDAPCredentialsError("AD_USER or AD_PASSWORD is not set in DB")
            
        # Decrypt password
        digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        fernet_key = base64.urlsafe_b64encode(digest)
        cipher_suite = Fernet(fernet_key)
        
        try:
            ad_password = cipher_suite.decrypt(ad_password_encrypted.encode("utf-8")).decode("utf-8")
        except Exception as e:
            raise InvalidLDAPCredentialsError(f"Failed to decrypt AD_PASSWORD: {e}")

        tls_config = None
        if settings.AD_SERVER.startswith("ldaps://"):
            if settings.AD_INSECURE_SKIP_VERIFY:
                logger.warning("LDAP TLS certificate verification is DISABLED (AD_INSECURE_SKIP_VERIFY=True).")
                tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
            else:
                tls_config = Tls(
                    validate=ssl.CERT_REQUIRED,
                    version=ssl.PROTOCOL_TLSv1_2,
                    ca_certs_file=settings.AD_CA_CERT_PATH
                )

        self.server = Server(
            settings.AD_SERVER, 
            get_info=ALL,
            use_ssl=settings.AD_SERVER.startswith("ldaps://"),
            tls=tls_config
        )
        try:
            self.conn = Connection(
                self.server,
                user=ad_user,
                password=ad_password,
                authentication="SIMPLE",
                auto_bind=True
            )
        except LDAPBindError as e:
            raise InvalidLDAPCredentialsError(f"LDAP Authentication Failed: {e}")

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
        
        # Search from the domain root to find users outside of the standard AD_BASE_DN
        root_dn = ",".join(part for part in settings.AD_BASE_DN.split(",") if part.upper().startswith("DC="))
        if not root_dn:
            root_dn = settings.AD_BASE_DN
            
        self.conn.search(
            search_base=root_dn,
            search_filter=f"(objectGUID={guid_filter})",
            attributes=["distinguishedName"],
            search_scope=SUBTREE
        )
        
        if self.conn.entries:
            return self.conn.entries[0].entry_dn
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.unbind()
