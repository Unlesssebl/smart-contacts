import json
import logging
import re
import time
from typing import Any, Optional

from shared.models.system_setting import SystemSetting


logger = logging.getLogger(__name__)

EXCLUDED_ORGANIZATION_OUS = {
    "!Дубли учётных записей",
    "!ПЕРЕНОС",
    "SERVICE_USERS",
    "WIFI GUEST",
    "Филиалы организаций",
}


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


_ou_mapping_cache: Optional[dict[str, Any]] = None
_ou_mapping_cache_time: float = 0


def build_known_ou_tree(paths: set[tuple[str, ...]]) -> dict[str, Any]:
    tree: dict[str, Any] = {}
    for path in paths:
        current = tree
        for node in path:
            if node not in current:
                current[node] = {}
            current = current[node]
    return tree


def direct_corporate_ous(paths: set[tuple[str, ...]]) -> set[str]:
    return {
        path[1]
        for path in paths
        if len(path) >= 2
        and path[0] == "CORPORATE_USERS"
        and path[1] not in EXCLUDED_ORGANIZATION_OUS
    }


def save_known_ous(session, paths: set[tuple[str, ...]], *, replace: bool = False):
    """Saves known OUs, replacing the snapshot on a full AD sync."""
    setting = session.get(SystemSetting, "KNOWN_OUS")
    if not replace and setting and setting.value:
        try:
            tree = json.loads(setting.value)
            if not isinstance(tree, dict):
                tree = {}
        except json.JSONDecodeError:
            tree = {}
    else:
        tree = {}

    fresh_tree = build_known_ou_tree(paths)
    if replace:
        tree = fresh_tree
    else:
        for path in paths:
            current = tree
            for node in path:
                if node not in current:
                    current[node] = {}
                current = current[node]
            
    merged_json = json.dumps(tree, ensure_ascii=False)
    
    if setting:
        setting.value = merged_json
    else:
        session.add(SystemSetting(key="KNOWN_OUS", value=merged_json))
    session.commit()


def prune_ou_mapping(session, valid_ous: set[str]) -> int:
    """Removes mappings for OUs absent from the authoritative AD snapshot."""
    global _ou_mapping_cache, _ou_mapping_cache_time
    setting = session.get(SystemSetting, "OU_MAPPING")
    if not setting or not setting.value:
        return 0

    try:
        mapping = json.loads(setting.value)
    except json.JSONDecodeError:
        logger.error("Failed to parse OU_MAPPING JSON while pruning stale entries")
        return 0
    if not isinstance(mapping, dict):
        return 0

    pruned = {ou: value for ou, value in mapping.items() if ou in valid_ous}
    removed = len(mapping) - len(pruned)
    if removed:
        setting.value = json.dumps(pruned, ensure_ascii=False)
        session.commit()
        _ou_mapping_cache = None
        _ou_mapping_cache_time = 0
    return removed


def get_known_ous(session) -> list[str]:
    """Returns the list of known OU names from system_settings."""
    setting = session.get(SystemSetting, "KNOWN_OUS")
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except json.JSONDecodeError:
            return []
    return []

def get_ou_mapping(session) -> dict[str, Any]:
    """Returns OU mapping from DB, cached for 60 seconds."""
    global _ou_mapping_cache, _ou_mapping_cache_time
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

def _organization_name(mapping_value: Any) -> Optional[str]:
    if isinstance(mapping_value, dict):
        value = mapping_value.get("org")
        return value if isinstance(value, str) and value else None
    return mapping_value if isinstance(mapping_value, str) and mapping_value else None


def match_organization_by_ou(dn: str, session) -> tuple[Optional[str], list[str]]:
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
        org_name = _organization_name(mapping.get(key) or mapping_lower.get(key.lower()))
        return org_name, []
    
    # Multiple matches found
    # Try to pick exact case match if exists, otherwise first match
    selected_ou = exact_matches[0] if exact_matches else matches[0]
    org_name = _organization_name(
        mapping.get(selected_ou) or mapping_lower.get(selected_ou.lower())
    )
    warning = f"Warning: Multiple OUs matched in DN: {matches}. Using {selected_ou} -> {org_name}."
    return org_name, [warning]
