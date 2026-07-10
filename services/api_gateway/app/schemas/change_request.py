from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime
import re

INTERNAL_PHONE_PATTERN = r"^\d{2}-?\d{2}$"
MOBILE_PHONE_PATTERN = r"^\+7\d{10}$"

class ChangeRequestBase(BaseModel):
    attribute_name: str
    new_value: Optional[str] = None

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
        # Если значение пустое или None, пропускаем валидацию (это запрос на удаление)
        if not v or v in ("<Удалить>", "[]"):
            return None
        attr = info.data.get("attribute_name")
        if attr == "internal_phone":
            # Разрешаем 0000 и 00-00
            if not re.match(INTERNAL_PHONE_PATTERN, v):
                raise ValueError(r"Internal phone must match pattern \d{2}-\d{2} or \d{4}")
        elif attr == "mobile_phone":
            # Нормализация: убираем пробелы, скобки и тире
            v_clean = re.sub(r"[\s\(\)\-]", "", v)
            # Автоматически заменяем 8 на +7
            if len(v_clean) == 11 and v_clean.startswith("8"):
                v_clean = "+7" + v_clean[1:]
            elif len(v_clean) == 11 and v_clean.startswith("7"):
                v_clean = "+" + v_clean
            
            if not re.match(MOBILE_PHONE_PATTERN, v_clean):
                raise ValueError(r"Mobile phone must match pattern +7 (999) 999-99-99")
            return v_clean
        return v

class ChangeRequestRead(ChangeRequestBase):
    id: UUID
    user_id: UUID = Field(alias="user_guid")
    user_name: Optional[str] = None
    field_name: str = Field(alias="attribute_name")
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
