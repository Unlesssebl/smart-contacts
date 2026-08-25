import pytest
from pydantic import ValidationError
from app.schemas.change_request import ChangeRequestCreate, ChangeRequestUpdateValue
from app.schemas.report import ReportChangeItem, ReportUpdateValue

def test_change_request_ad_schema_max_lengths():
    # Valid lengths
    cr = ChangeRequestCreate(
        attribute_name="department",
        new_value="A" * 64
    )
    assert cr.new_value == "A" * 64

    # Exceeding department limit (64)
    with pytest.raises(ValidationError) as exc_info:
        ChangeRequestCreate(
            attribute_name="department",
            new_value="A" * 65
        )
    assert "превышает допустимый лимит Active Directory (64 символов)" in str(exc_info.value)

    # Exceeding office_location limit (128)
    with pytest.raises(ValidationError) as exc_info:
        ChangeRequestCreate(
            attribute_name="office_location",
            new_value="B" * 129
        )
    assert "превышает допустимый лимит Active Directory (128 символов)" in str(exc_info.value)

def test_change_request_control_character_sanitization():
    cr = ChangeRequestCreate(
        attribute_name="office_location",
        new_value="Building 1\r\nRoom 204\t"
    )
    assert cr.new_value == "Building 1 Room 204"

def test_change_request_update_value_sanitization():
    update = ChangeRequestUpdateValue(new_value="  IT Department\r\n  ")
    assert update.new_value == "IT Department"

def test_report_change_item_validation():
    # Valid report change item
    rep = ReportChangeItem(
        attribute_name="office_location",
        new_value="Office 402\n"
    )
    assert rep.new_value == "Office 402"

    # Exceeding length limit for report item
    with pytest.raises(ValidationError) as exc_info:
        ReportChangeItem(
            attribute_name="department",
            new_value="D" * 65
        )
    assert "превышает допустимый лимит Active Directory" in str(exc_info.value)
