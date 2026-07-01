import uuid
import re
from typing import List, Optional, Tuple, Any
import logging

from .config import settings

logger = logging.getLogger(__name__)


from shared.utils import ad_guid_to_uuid


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


from sqlalchemy import select
from .db import SystemSetting
import json

_ou_mapping_cache: Optional[dict[str, str]] = None
_ou_mapping_cache_time: float = 0

def get_ou_mapping(session) -> dict[str, str]:
    """Returns OU mapping from DB, cached for 60 seconds."""
    global _ou_mapping_cache, _ou_mapping_cache_time
    import time
    
    current_time = time.time()
    if _ou_mapping_cache is not None and current_time - _ou_mapping_cache_time < 60:
        return _ou_mapping_cache
        
    setting = session.get(SystemSetting, "OU_MAPPING")
    mapping = {}
    if setting and setting.value:
        try:
            mapping = json.loads(setting.value)
        except json.JSONDecodeError:
            logger.error("Failed to parse OU_MAPPING JSON from DB")
            mapping = {}
            
    _ou_mapping_cache = mapping
    _ou_mapping_cache_time = current_time
    return _ou_mapping_cache

def match_organization_by_ou(dn: str, session) -> Tuple[Optional[str], List[str]]:
    """
    Matches the user's AD Organizational Units (OU) against the mapping in DB.
    """
    mapping = get_ou_mapping(session)
    if not mapping:
        return None, ["OU mapping is empty or could not be loaded."]

    user_ous = re.findall(r"OU=([^,]+)", dn)
    
    # Priority 1: Exact case-sensitive match
    exact_matches = [ou for ou in user_ous if ou in mapping]
    
    # Priority 2: Case-insensitive match
    case_insensitive_matches = []
    mapping_lower = {k.lower(): v for k, v in mapping.items()}
    for ou in user_ous:
        if ou.lower() in mapping_lower:
            case_insensitive_matches.append(ou)

    matches = list(dict.fromkeys(exact_matches + case_insensitive_matches))
    
    if not matches:
        return None, []
    
    if len(matches) == 1:
        # Get the actual organization name from mapping
        key = matches[0]
        org_name = mapping.get(key) or mapping_lower.get(key.lower())
        return org_name, []
    
    # Multiple matches found
    # Try to pick exact case match if exists, otherwise first match
    selected_ou = exact_matches[0] if exact_matches else matches[0]
    org_name = mapping.get(selected_ou) or mapping_lower.get(selected_ou.lower())
    warning = f"Warning: Multiple OUs matched in DN: {matches}. Using {selected_ou} -> {org_name}."
    return org_name, [warning]
