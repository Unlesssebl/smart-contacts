from pydantic import BaseModel
from typing import Optional, Any
from shared.utils import ad_guid_to_uuid

class LdapUser(BaseModel):
    object_guid: Optional[str] = None
    full_name: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    ad_dn: Optional[str] = None
    mobile_phone: Optional[str] = None
    internal_phone: Optional[str] = None
    office_location: Optional[str] = None
    is_disabled: bool = False

    @classmethod
    def from_entry(cls, entry: Any, fallback_username: str) -> 'LdapUser':
        return cls(
            object_guid=ad_guid_to_uuid(entry.objectGUID.value) if getattr(entry, "objectGUID", None) else None,
            full_name=entry.displayName.value if getattr(entry, "displayName", None) else fallback_username,
            department=entry.department.value if getattr(entry, "department", None) else None,
            job_title=entry.title.value if getattr(entry, "title", None) else None,
            ad_dn=entry.distinguishedName.value if getattr(entry, "distinguishedName", None) else None,
            mobile_phone=entry.mobile.value if getattr(entry, "mobile", None) else None,
            internal_phone=entry.telephoneNumber.value if getattr(entry, "telephoneNumber", None) else None,
            office_location=entry.physicalDeliveryOfficeName.value if getattr(entry, "physicalDeliveryOfficeName", None) else None,
            is_disabled=bool(int(entry.userAccountControl.value) & 2) if getattr(entry, "userAccountControl", None) else False
        )
