import pytest
from fastapi.testclient import TestClient

@pytest.mark.skip(reason="Kerberos not configured yet")
def test_login_sso_success(client: TestClient, mock_kerberos, test_admin_user):
    """
    Tests that SPNEGO auth endpoint succeeds when validate_kerberos_ticket
    returns a valid service account UPN that exists in the DB.
    """
    # mock_kerberos makes the auth bypass real negotiation
    response = client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate YII..."})
    
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert data["user"]["sam_account_name"] == test_admin_user.sam_account_name
    
    # Check that cookies were set
    cookies = response.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies

@pytest.mark.skip(reason="Kerberos not configured yet")
def test_login_sso_invalid_ticket(client: TestClient, mocker):
    """
    Tests that an invalid Kerberos ticket returns a 401.
    """
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=None
    )
    
    response = client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate invalid"})
    
    assert response.status_code == 401
    assert "Kerberos authentication failed" in response.json()["detail"]

def test_get_me_unauthorized(client: TestClient):
    """
    Tests that accessing protected route without a token fails.
    """
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_get_me_authorized(client: TestClient, mock_kerberos, test_admin_user):
    """
    Tests that accessing protected route with a valid token succeeds.
    """
    # 1. Login to get token
    login_resp = client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    access_token = login_resp.cookies.get("access_token")
    assert access_token is not None
    
    # 2. Use token to get profile
    # TestClient automatically handles cookies, but we can also set headers explicitly if needed.
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == 200
    data = response.json()
    assert data["sam_account_name"] == test_admin_user.sam_account_name

def test_logout(client: TestClient, mock_kerberos, test_admin_user):
    """
    Tests that logout clears cookies.
    """
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    
    # Cookies should be empty or expired
    # In FastAPI TestClient, clearing a cookie means it either gets deleted from the jar
    # or set to an empty string with max-age=0
    access_cookie = response.cookies.get("access_token")
    assert not access_cookie


def test_ensure_user_from_ldap_applies_canonical_mappings(db_session, test_normal_user):
    """
    Tests that _ensure_user_from_ldap correctly applies DEPT_MAPPING and JOB_TITLE_MAPPING,
    stores _raw fields, and formats contact numbers.
    """
    import json
    from app.services.auth_service import AuthService
    from app.core.ldap.schemas import LdapUser
    from shared.models.system_setting import SystemSetting

    # Set up system settings for mappings
    db_session.merge(SystemSetting(
        key="DEPT_MAPPING",
        value=json.dumps({"ИТ отдел": "Департамент IT"})
    ))
    db_session.merge(SystemSetting(
        key="JOB_TITLE_MAPPING",
        value=json.dumps({"вед инж": "Ведущий инженер"})
    ))
    db_session.merge(SystemSetting(
        key="OU_MAPPING",
        value=json.dumps({"HQ": "Главный офис"})
    ))
    db_session.commit()

    ldap_user = LdapUser(
        object_guid=str(test_normal_user.object_guid),
        full_name="Тестовый Пользователь",
        department="ИТ отдел",
        job_title="вед инж",
        mobile_phone="89991112233",
        internal_phone="1234",
        ad_dn="CN=Test,OU=ИТ отдел,OU=HQ,DC=corp,DC=loc"
    )

    user = AuthService._ensure_user_from_ldap(db_session, test_normal_user.sam_account_name, ldap_user)

    assert user.job_title_raw == "вед инж"
    assert user.job_title == "Ведущий инженер"
    assert user.department_raw == "ИТ отдел"
    assert user.department == "Департамент IT"
    assert user.organization == "Главный офис"
    assert user.mobile_phone == "+7 (999) 111-22-33"
    assert user.internal_phone == "12-34"


def test_ensure_user_from_ldap_protects_pending_change_requests(db_session, test_normal_user):
    """
    Tests that fields with pending ChangeRequests are not overwritten by LDAP sync on login.
    """
    from uuid import uuid4
    from app.services.auth_service import AuthService
    from app.core.ldap.schemas import LdapUser
    from shared.models.change_request import ChangeRequest
    from shared.models.enums import ChangeRequestStatus

    test_normal_user.department = "Мой Кастомный Отдел"
    db_session.commit()

    # Add a pending ChangeRequest for department
    cr = ChangeRequest(
        id=uuid4(),
        user_guid=test_normal_user.object_guid,
        attribute_name="department",
        new_value="Мой Кастомный Отдел",
        source="user",
        status=ChangeRequestStatus.PENDING.value
    )
    db_session.add(cr)
    db_session.commit()

    ldap_user = LdapUser(
        object_guid=str(test_normal_user.object_guid),
        full_name="Тестовый Пользователь",
        department="AD Отдел",
        job_title="Инженер",
        ad_dn="CN=Test,OU=AD Отдел,OU=HQ,DC=corp,DC=loc"
    )

    user = AuthService._ensure_user_from_ldap(db_session, test_normal_user.sam_account_name, ldap_user)

    # Department must remain protected
    assert user.department == "Мой Кастомный Отдел"
