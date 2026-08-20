import ssl
import logging
from ldap3 import Server, ServerPool, ROUND_ROBIN, Tls, ALL
from app.core.config import settings

logger = logging.getLogger(__name__)

# Настройка TLS
if settings.AD_INSECURE_SKIP_VERIFY:
    logger.warning("LDAP TLS certificate verification is DISABLED (AD_INSECURE_SKIP_VERIFY=True). This is insecure for production!")
    # ldap3 Tls validates according to ssl module constants.
    tls_config = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLS_CLIENT)
    # The Tls module configures the context, but we must override check_hostname if validation is NONE.
else:
    tls_config = Tls(
        validate=ssl.CERT_REQUIRED, 
        version=ssl.PROTOCOL_TLS_CLIENT,
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
server_pool = ServerPool([ldap_server], ROUND_ROBIN, active=False)
