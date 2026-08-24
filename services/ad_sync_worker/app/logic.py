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


from shared.utils import parse_ou_structure, apply_canonical_mapping, ttl_cache


def prune_ou_mapping(session, valid_ous: set[str]) -> int:
    """Removes mappings for OUs absent from the authoritative AD snapshot."""
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
        get_ou_mapping.cache_clear()
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


@ttl_cache(ttl_seconds=60.0)
def get_ou_mapping(session) -> dict[str, Any]:
    """Returns OU mapping from DB, cached for 60 seconds."""
    setting = session.get(SystemSetting, "OU_MAPPING")
    mapping = {}
    if setting and setting.value:
        try:
            mapping = json.loads(setting.value)
        except json.JSONDecodeError:
            logger.error("Failed to parse OU_MAPPING JSON from DB")
            mapping = {}
    return mapping if isinstance(mapping, dict) else {}


@ttl_cache(ttl_seconds=60.0)
def get_dept_mapping(session) -> dict[str, str]:
    """Returns DEPT_MAPPING from DB, cached for 60 seconds."""
    setting = session.get(SystemSetting, "DEPT_MAPPING")
    mapping = {}
    if setting and setting.value:
        try:
            mapping = json.loads(setting.value)
        except json.JSONDecodeError:
            logger.error("Failed to parse DEPT_MAPPING JSON from DB")
            mapping = {}
    return mapping if isinstance(mapping, dict) else {}


@ttl_cache(ttl_seconds=60.0)
def get_job_title_mapping(session) -> dict[str, str]:
    """Returns JOB_TITLE_MAPPING from DB, cached for 60 seconds."""
    setting = session.get(SystemSetting, "JOB_TITLE_MAPPING")
    mapping = {}
    if setting and setting.value:
        try:
            mapping = json.loads(setting.value)
        except json.JSONDecodeError:
            logger.error("Failed to parse JOB_TITLE_MAPPING JSON from DB")
            mapping = {}
    return mapping if isinstance(mapping, dict) else {}


def extract_ou_structure(
    dn: str,
    session,
    fallback_dept: Optional[str] = None
) -> tuple[Optional[str], Optional[str], list[str]]:
    """
    Extracts organization and department from DN using OU_MAPPING from DB.
    """
    mapping = get_ou_mapping(session)
    return parse_ou_structure(dn, mapping, fallback_dept)


def match_organization_by_ou(dn: str, session) -> tuple[Optional[str], list[str]]:
    """
    Matches the user's AD Organizational Units (OU) against the mapping in DB.
    """
    org, _, warnings = extract_ou_structure(dn, session)
    return org, warnings

