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
    - Department: built strictly from nested OUs under the mapped Organization OU in top-down order.
    - Warnings: notes if multiple OUs matched mapping.
    """
    if not dn:
        return None, None, []

    user_ous = re.findall(r"OU=([^,]+)", dn)
    if not user_ous:
        return None, None, []

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

    # Build department string strictly from dept_ous (which is leaf-to-root)
    clean_dept_ous = [
        ou.strip() for ou in reversed(dept_ous)
        if ou.strip()
        and ou not in EXCLUDED_ORGANIZATION_OUS
        and (not org_name or ou.strip().lower() != org_name.lower())
        and ou.strip().lower() not in mapping_lower
    ]
    dept_name = " / ".join(clean_dept_ous) if clean_dept_ous else None

    if not org_name:
        dept_name = None

    return org_name, dept_name, warnings


HOMOGLYPHS = str.maketrans({
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х',
    'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р', 'x': 'х', 'y': 'у'
})


def _sanitize_string(s: str) -> str:
    if not s:
        return ""
    # Normalize 'ё', non-breaking spaces, and duplicate whitespace
    res = s.replace('ё', 'е').replace('Ё', 'Е').replace('\u00a0', ' ')
    res = res.translate(HOMOGLYPHS)
    return re.sub(r'\s+', ' ', res).strip().lower()


def apply_canonical_mapping(
    raw_value: Optional[str],
    mapping: Optional[dict[str, str]] = None
) -> Optional[str]:
    """
    Applies canonical normalization mapping to a department or job_title string.
    Supports both whole string replacement and sub-part replacement for ' / ' separated paths.
    Matching is done case-insensitively with exact-case preference and typo/sanitization tolerance.
    """
    if not raw_value or not raw_value.strip() or raw_value.strip() in ("", "[]"):
        return None

    raw_clean = raw_value.strip()
    if not mapping:
        return raw_clean

    # Build case-insensitive and sanitized lookups
    mapping_lower = {k.lower().strip(): v.strip() for k, v in mapping.items() if k and v}
    mapping_sanitized = {_sanitize_string(k): v.strip() for k, v in mapping.items() if k and v}

    # 1. Direct full match (case-sensitive first, then case-insensitive, then sanitized)
    if raw_clean in mapping:
        return mapping[raw_clean]
    if raw_clean.lower() in mapping_lower:
        return mapping_lower[raw_clean.lower()]
    sanitized_raw = _sanitize_string(raw_clean)
    if sanitized_raw in mapping_sanitized:
        return mapping_sanitized[sanitized_raw]

    # 2. If it's a composite department path ("A / B / C"), check sub-parts
    if " / " in raw_clean:
        parts = [p.strip() for p in raw_clean.split(" / ")]
        new_parts = []
        changed = False
        for part in parts:
            if part in mapping:
                new_parts.append(mapping[part])
                changed = True
            elif part.lower() in mapping_lower:
                new_parts.append(mapping_lower[part.lower()])
                changed = True
            else:
                sanitized_part = _sanitize_string(part)
                if sanitized_part in mapping_sanitized:
                    new_parts.append(mapping_sanitized[sanitized_part])
                    changed = True
                else:
                    new_parts.append(part)
        if changed:
            return " / ".join(new_parts)

    return raw_clean

def format_phone(phone: Optional[str]) -> Optional[str]:
    """
    Cleans up the phone string from AD/User input. 
    Applies mobile mask if it matches a Russian mobile pattern (10 or 11 digits).
    Leaves other strings as they are to avoid data loss.
    """
    if not phone or phone == "[]":
        return None
        
    cleaned = str(phone).strip()
    if not cleaned or cleaned == "[]":
        return None
        
    digits_only = re.sub(r'\D', '', cleaned)
    
    if len(digits_only) == 4:
        return f"{digits_only[:2]}-{digits_only[2:]}"
    
    if len(digits_only) == 11 and (digits_only.startswith('7') or digits_only.startswith('8')):
        code = digits_only[1:4]
        p1 = digits_only[4:7]
        p2 = digits_only[7:9]
        p3 = digits_only[9:11]
        return f"+7 ({code}) {p1}-{p2}-{p3}"
        
    if len(digits_only) == 10:
        code = digits_only[0:3]
        p1 = digits_only[3:6]
        p2 = digits_only[6:8]
        p3 = digits_only[8:10]
        return f"+7 ({code}) {p1}-{p2}-{p3}"
        
    return cleaned


def ttl_cache(ttl_seconds: float = 60.0):
    """
    Memory cache decorator with time-to-live (TTL).
    Caches function result based on arguments for ttl_seconds.
    """
    import functools
    import time
    from typing import Callable

    def decorator(func: Callable):
        cache: dict[Any, tuple[float, Any]] = {}
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Session objects or complex objects are represented by id/identity if needed
            key = tuple(id(a) if hasattr(a, "__dict__") and not isinstance(a, (str, int, float, bool, tuple, list, dict)) else str(a) for a in args)
            now = time.time()
            if key in cache:
                cached_time, result = cache[key]
                if now - cached_time < ttl_seconds:
                    return result
            result = func(*args, **kwargs)
            cache[key] = (now, result)
            return result
        
        def cache_clear():
            cache.clear()

        wrapper.cache_clear = cache_clear
        return wrapper
    return decorator


ATTRIBUTE_LABELS: dict[str, str] = {
    "job_title": "должность",
    "department": "отдел",
    "email": "email",
    "internal_phone": "внутренний телефон",
    "mobile_phone": "мобильный телефон",
    "office_location": "офис / расположение",
    "organization": "организация",
    "full_name": "ФИО",
}


def get_attribute_label(name: Optional[str]) -> str:
    if not name:
        return "атрибут"
    return ATTRIBUTE_LABELS.get(name, name.replace("_", " "))


def build_field_applied_notification(field: str) -> tuple[str, str]:
    label = get_attribute_label(field)
    title = f"{label.capitalize()} обновлён"
    body = f"Ваша заявка на изменение поля «{label}» принята и успешно применена в Active Directory"
    return title, body


def build_field_rejected_notification(field: str, reason: Optional[str] = None) -> tuple[str, str]:
    label = get_attribute_label(field)
    title = f"Заявка на «{label}» отклонена"
    body = f"Заявка на изменение поля «{label}» была отклонена администратором"
    if reason:
        body += f": {reason}"
    return title, body


def build_report_notification(
    attribute_name: str,
    status: str,
    target_user_name: Optional[str] = None,
    rejection_reason: Optional[str] = None,
) -> tuple[str, str, str]:
    label = get_attribute_label(attribute_name)
    target_desc = f" по сотруднику «{target_user_name}»" if target_user_name else ""
    is_success = status in ["approved", "applied"]

    if is_success:
        notif_type = "report_approved"
        title = "Сообщение об ошибке принято"
        body = f"Ваше сообщение об ошибке{target_desc} (поле «{label}») рассмотрено и данные успешно обновлены"
    else:
        notif_type = "report_rejected"
        title = "Сообщение об ошибке отклонено"
        reason_str = f": {rejection_reason}" if rejection_reason else ""
        body = f"Ваше сообщение об ошибке{target_desc} (поле «{label}») отклонено администратором{reason_str}"

    return notif_type, title, body


def build_ticket_closed_notification(
    category: Optional[str] = None,
) -> tuple[str, str, str]:
    is_suggestion = category == "suggestion"
    notif_type = "ticket_closed"
    title = "Предложение по улучшению рассмотрено" if is_suggestion else "Обращение в поддержку рассмотрено"
    body = (
        "Ваше предложение по улучшению сервиса было рассмотрено и закрыто администратором"
        if is_suggestion
        else "Ваше обращение в службу поддержки было рассмотрено и закрыто администратором"
    )
    return notif_type, title, body

