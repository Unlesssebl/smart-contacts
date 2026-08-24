import re
import uuid
from typing import Any, Optional

def ad_guid_to_uuid(binary_guid: Any) -> str:
    """
    Конвертирует AD objectGUID в строку UUID v4.
    Поддерживает:
    - Бинарные данные (16 байт, little-endian)
    - Списки байтов (ldap3 style)
    - Строковые форматы
    """
    if isinstance(binary_guid, list):
        if not binary_guid:
            raise ValueError("GUID list is empty")
        binary_guid = binary_guid[0]
    
    if isinstance(binary_guid, str):
        return str(uuid.UUID(binary_guid.strip("{}")))
    
    if isinstance(binary_guid, bytes):
        if len(binary_guid) == 16:
            return str(uuid.UUID(bytes_le=binary_guid))
        try:
            return str(uuid.UUID(binary_guid.decode().strip("{}")))
        except Exception:
            pass
        
    raise ValueError(f"Unsupported GUID format: {type(binary_guid)}")


EXCLUDED_ORGANIZATION_OUS = {
    "!Дубли учётных записей",
    "!ПЕРЕНОС",
    "SERVICE_USERS",
    "WIFI GUEST",
    "Филиалы организаций",
}


def parse_ou_structure(
    dn: Optional[str],
    mapping: Optional[dict[str, Any]] = None,
    fallback_dept: Optional[str] = None
) -> tuple[Optional[str], Optional[str], list[str]]:
    """
    Extracts (organization, department, warnings) from AD distinguishedName (DN)
    and optional OU_MAPPING dictionary.

    - Organization: strictly matched via OU_MAPPING (unmapped OUs remain None).
    - Department: built from nested OUs under the mapped Organization OU in top-down order.
    - Warnings: notes if multiple OUs matched mapping.
    """
    if not dn:
        clean_fallback = fallback_dept.strip() if fallback_dept and fallback_dept.strip() not in ("", "[]") else None
        return None, clean_fallback, []

    user_ous = re.findall(r"OU=([^,]+)", dn)
    if not user_ous:
        clean_fallback = fallback_dept.strip() if fallback_dept and fallback_dept.strip() not in ("", "[]") else None
        return None, clean_fallback, []

    mapping = mapping or {}
    
    def extract_org_name(val: Any) -> Optional[str]:
        if isinstance(val, dict):
            org = val.get("org")
            return org if isinstance(org, str) and org else None
        return val if isinstance(val, str) and val else None

    # Priority 1: Exact case-sensitive match
    exact_matches = [ou for ou in user_ous if ou in mapping and ou not in EXCLUDED_ORGANIZATION_OUS]
    
    # Priority 2: Case-insensitive match
    mapping_lower = {k.lower(): v for k, v in mapping.items() if k not in EXCLUDED_ORGANIZATION_OUS}
    case_insensitive_matches = [ou for ou in user_ous if ou.lower() in mapping_lower and ou not in EXCLUDED_ORGANIZATION_OUS]
    
    matches = list(dict.fromkeys(exact_matches + case_insensitive_matches))

    warnings: list[str] = []
    org_name: Optional[str] = None
    dept_ous: list[str] = []

    if matches:
        selected_ou = exact_matches[0] if exact_matches else matches[0]
        org_name = extract_org_name(
            mapping.get(selected_ou) or mapping_lower.get(selected_ou.lower())
        )
        if len(matches) > 1:
            warnings.append(f"Warning: Multiple OUs matched in DN: {matches}. Using {selected_ou} -> {org_name}.")
        
        org_idx = user_ous.index(selected_ou)
        # All OUs before org_idx in user_ous are child OUs under this mapped organization
        dept_ous = user_ous[:org_idx]
    else:
        # If no mapping matched, organization remains None and department OUs are empty
        org_name = None
        dept_ous = []

    # Build department string from dept_ous (which is leaf-to-root)
    clean_dept_ous = [
        ou.strip() for ou in reversed(dept_ous)
        if ou.strip()
        and ou not in EXCLUDED_ORGANIZATION_OUS
        and (not org_name or ou.strip().lower() != org_name.lower())
        and ou.strip().lower() not in mapping_lower
    ]
    dept_name = " / ".join(clean_dept_ous) if clean_dept_ous else None

    if not dept_name and fallback_dept and org_name:
        fb = fallback_dept.strip()
        if (
            fb
            and fb != "[]"
            and fb.lower() != org_name.lower()
            and fb.lower() not in mapping_lower
        ):
            dept_name = fb

    if not org_name:
        dept_name = None

    return org_name, dept_name, warnings


