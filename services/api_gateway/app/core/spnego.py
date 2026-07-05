import spnego
import base64
import os
from typing import Optional
from app.core.config import settings

def validate_kerberos_ticket(auth_header: str) -> Optional[str]:
    """
    Validates a Negotiate (Kerberos) ticket from the Authorization header.
    Returns the user principal name (UPN) or sAMAccountName if valid, None otherwise.
    """
    if not auth_header or not auth_header.startswith("Negotiate "):
        return None

    # Ensure keytab is available for gssapi
    if os.path.exists(settings.KRB5_KEYTAB):
        os.environ["KRB5_KTNAME"] = settings.KRB5_KEYTAB

    try:
        # Extract the base64 encoded token
        token_b64 = auth_header[len("Negotiate "):]
        in_token = base64.b64decode(token_b64)

        # Initialize SPNEGO server context
        # protocol="negotiate" supports both Kerberos and NTLM (if configured)
        server = spnego.server(hostname=None, service=settings.KRB5_SERVICE_NAME, protocol="negotiate")
        
        # Step through the authentication
        out_token = server.step(in_token)
        
        if server.complete:
            # Authentication successful
            # server.user_obj or server.client_principal usually contains the username
            # In Kerberos context, it's often 'user@DOMAIN'
            return server.client_principal
            
    except Exception as e:
        # In production, log the error but don't leak details to the client
        print(f"Kerberos validation error: {e}")
        return None

    return None
