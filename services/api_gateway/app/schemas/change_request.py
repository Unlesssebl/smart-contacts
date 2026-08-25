from pydantic import BaseModel, ConfigDict, computed_field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
import re

INTERNAL_PHONE_PATTERN = r"^\d{2}-?\d{2}$"
MOBILE_PHONE_PATTERN = r"^\+7\d{10}$"

class ChangeRequestBase(BaseModel):
    attribute_name: str
    new_value: Optional[str] = None

# Active Directory Schema max length limits (rangeUpper) for text attributes
AD_FIELD_MAX_LENGTHS = {
    "office_location": 128,
    "department": 64,
    "organization": 64,
    "job_title": 128,
    "full_name": 256,
    "email": 256,
}

def sanitize_and_validate_value(attr: Optional[str], v: Optional[str]) -> Optional[str]:
    # Если значение пустое или None, пропускаем валидацию (это запрос на удаление)
    if not v or v in ("<Удалить>", "[]"):
        return None

    # Очистка от управляющих символов (переносы строк, табуляции, нулевые байты)
    v_clean = re.sub(r"[\r\n\t\x00-\x1f]", " ", str(v))
    v_clean = re.sub(r"\s+", " ", v_clean).strip()

    if not v_clean:
        return None

    if attr in AD_FIELD_MAX_LENGTHS:
        max_len = AD_FIELD_MAX_LENGTHS[attr]
        if len(v_clean) > max_len:
            raise ValueError(f"Значение для '{attr}' превышает допустимый лимит Active Directory ({max_len} символов)")

    if attr == "internal_phone":
        # Разрешаем 0000 и 00-00
        if not re.match(INTERNAL_PHONE_PATTERN, v_clean):
            raise ValueError(r"Внутренний телефон должен соответствовать формату \d{2}-\d{2} или \d{4}")
        return v_clean
    elif attr == "mobile_phone":
        # Нормализация: убираем пробелы, скобки и тире
        phone_digits = re.sub(r"[\s\(\)\-]", "", v_clean)
        # Автоматически заменяем 8 на +7
        if len(phone_digits) == 11 and phone_digits.startswith("8"):
            phone_digits = "+7" + phone_digits[1:]
        elif len(phone_digits) == 11 and phone_digits.startswith("7"):
            phone_digits = "+" + phone_digits
        
        if not re.match(MOBILE_PHONE_PATTERN, phone_digits):
            raise ValueError(r"Мобильный телефон должен соответствовать формату +7 (999) 999-99-99")
        return phone_digits

    return v_clean

class ChangeRequestCreate(ChangeRequestBase):
    @field_validator("attribute_name")
    @classmethod
    def validate_attribute_name(cls, v: str) -> str:
        allowed = [
            "internal_phone", "mobile_phone", "office_location",
            "department", "full_name", "organization", "job_title", "email"
        ]
        if v not in allowed:
            raise ValueError(f"Attribute {v} is not allowed for change requests")
        return v

    @field_validator("new_value")
    @classmethod
    def validate_new_value(cls, v: Optional[str], info) -> Optional[str]:
        attr = info.data.get("attribute_name")
        return sanitize_and_validate_value(attr, v)

class ChangeRequestRead(ChangeRequestBase):
    id: UUID
    user_guid: UUID
    user_name: Optional[str] = None
    attribute_name: str
    old_value: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    is_protected: bool = False
    user_status: str = "active"
    created_at: datetime

    @computed_field
    @property
    def user_id(self) -> UUID:
        return self.user_guid

    @computed_field
    @property
    def field_name(self) -> str:
        return self.attribute_name

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ChangeRequestUpdateValue(BaseModel):
    new_value: Optional[str] = None

    @field_validator("new_value")
    @classmethod
    def validate_new_value(cls, v: Optional[str]) -> Optional[str]:
        if not v or v in ("<Удалить>", "[]"):
            return None
        v_clean = re.sub(r"[\r\n\t\x00-\x1f]", " ", str(v))
        v_clean = re.sub(r"\s+", " ", v_clean).strip()
        return v_clean or None

class BulkReviewActionRequest(BaseModel):
    request_ids: list[UUID] = []
    report_ids: list[UUID] = []

class BulkReviewResult(BaseModel):
    approved: int = 0
    rejected: int = 0
    skipped: int = 0
    errors: list[str] = []
