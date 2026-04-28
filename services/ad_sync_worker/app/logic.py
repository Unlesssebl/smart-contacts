import uuid
import re
from typing import List, Optional, Tuple, Any, Union
import logging

from .config import settings

logger = logging.getLogger(__name__)


def ad_guid_to_uuid(binary_guid: Any) -> str:
    """
    Converts AD objectGUID to a UUID string.
    Handles:
    - Binary bytes (16 bytes, little-endian)
    - Lists of bytes (ldap3 style)
    - Formatted strings like '{uuid}' or 'uuid'
    """
    if isinstance(binary_guid, list):
        if not binary_guid:
            raise ValueError("GUID list is empty")
        binary_guid = binary_guid[0]
    
    if isinstance(binary_guid, str):
        # Handle string format "{89bdc9c6-7a3a-44e2-afdb-8c5d1f32ba8c}"
        return str(uuid.UUID(binary_guid.strip("{}")))
    
    if isinstance(binary_guid, bytes):
        if len(binary_guid) == 16:
            return str(uuid.UUID(bytes_le=binary_guid))
        # Could be a string encoded as bytes
        try:
            return str(uuid.UUID(binary_guid.decode().strip("{}")))
        except Exception:
            pass
        
    raise ValueError(f"Unsupported GUID format: {type(binary_guid)} (len={len(binary_guid) if hasattr(binary_guid, '__len__') else 'N/A'})")


def determine_status(uac: int, sam_account_name: str) -> str:
    """
    Status Logic:
    1. If (userAccountControl & 0x0002) != 0 -> RESIGNED
    2. If sam_account_name ends with -uv -> RESIGNED
    3. If sam_account_name ends with -time -> ON_LEAVE
    4. Otherwise -> ACTIVE
    """
    if uac & 0x0002:
        return "RESIGNED"
    
    if sam_account_name.lower().endswith("-uv"):
        return "RESIGNED"
    
    if sam_account_name.lower().endswith("-time"):
        return "ON_LEAVE"
    
    return "ACTIVE"


def parse_cn(dn: str) -> str:
    """Extracts CN from a DN string."""
    match = re.search(r"CN=([^,]+)", dn)
    if match:
        return match.group(1)
    return dn


def match_organization(member_of: List[str]) -> Tuple[Optional[str], List[str]]:
    """
    Matches memberOf CNs against the list in CN.md.
    Returns (selected_org, warnings).
    """
    try:
        with open(settings.CN_LIST_PATH, "r", encoding="utf-8") as f:
            valid_cns = [line.strip() for line in f if line.strip()]
    except Exception as e:
        logger.error(f"Failed to read CN list: {e}")
        return None, [f"Error reading CN list: {e}"]

    user_cns = [parse_cn(dn) for dn in member_of]
    
    # Priority 1: Exact case-sensitive match
    exact_matches = [cn for cn in user_cns if cn in valid_cns]
    
    # Priority 2: Case-insensitive match
    case_insensitive_matches = []
    valid_cns_lower = {cn.lower(): cn for cn in valid_cns}
    for cn in user_cns:
        if cn.lower() in valid_cns_lower:
            case_insensitive_matches.append(valid_cns_lower[cn.lower()])

    matches = list(dict.fromkeys(exact_matches + case_insensitive_matches))
    
    if not matches:
        return None, []
    
    if len(matches) == 1:
        return matches[0], []
    
    # Multiple matches found
    # Try to pick exact case match if exists, otherwise first match
    selected = exact_matches[0] if exact_matches else matches[0]
    warning = f"Warning: Multiple organizations found in memberOf: {matches}. Using {selected}."
    return selected, [warning]
