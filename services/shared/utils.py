import uuid
from typing import Any

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
