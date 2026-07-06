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
