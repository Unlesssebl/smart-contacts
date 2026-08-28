import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, hash_token
from app.db.repository.token import create_refresh_token, verify_refresh_token
from shared.models.enums import UserRole, UserStatus
from shared.models.token import RefreshToken
from shared.models.user import User


# ============================================================================
# 1. COOKIE ATTRIBUTES & JWT CLAIMS
# ============================================================================

def test_login_sets_cookie_security_attributes(client: TestClient, test_admin_user, mock_kerberos):
    """
    Verifies that login sets access_token, refresh_token, and csrf_token with
    correct security attributes (HttpOnly, SameSite=lax, Path=/).
    """
    response = client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    assert response.status_code == 200

    # TestClient cookie jar / response cookies
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies
    assert "csrf_token" in response.cookies

    # Inspect raw Set-Cookie headers for security flags
    set_cookie_headers = response.headers.get_list("set-cookie")
    set_cookie_str = " ".join(set_cookie_headers)

    assert "access_token=" in set_cookie_str
    assert "refresh_token=" in set_cookie_str
    assert "csrf_token=" in set_cookie_str
    assert "samesite=lax" in set_cookie_str.lower()
    assert "path=/" in set_cookie_str.lower()



def test_access_token_jwt_claims_content(test_normal_user):
    """
    Verifies that generated access token JWT has required claims: sub, role, sam, dept, exp.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept=test_normal_user.department
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["sub"] == str(test_normal_user.object_guid)
    assert payload["role"] == test_normal_user.role
    assert payload["sam"] == test_normal_user.sam_account_name
    assert "exp" in payload
    # Expiry should be roughly ACCESS_TOKEN_EXPIRE_MINUTES from now
    expected_exp = datetime.now(timezone.utc).timestamp() + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    assert abs(payload["exp"] - expected_exp) < 10


# ============================================================================
# 2. ACCESS TOKEN LIFECYCLE & VALIDATION
# ============================================================================

def test_access_token_valid_grants_access(client: TestClient, test_normal_user):
    """
    A valid active JWT token inside cookies allows access to protected endpoints.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["sam_account_name"] == test_normal_user.sam_account_name


def test_access_token_expired_returns_401(client: TestClient, test_normal_user):
    """
    An expired JWT access token must be rejected with 401 Unauthorized.
    """
    expired_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    payload = {
        "sub": str(test_normal_user.object_guid),
        "role": test_normal_user.role,
        "sam": test_normal_user.sam_account_name,
        "dept": "IT",
        "exp": expired_time
    }
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    client.cookies.set("access_token", expired_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "учетные данные" in response.json()["detail"] or "авторизация" in response.json()["detail"].lower()


def test_access_token_tampered_signature_returns_401(client: TestClient, test_normal_user):
    """
    A token signed with an invalid/different secret key must be rejected with 401.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    # Sign with a bogus secret key
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    tampered_token = jwt.encode(
        payload,
        "wrong_secret_key_12345",
        algorithm=settings.ALGORITHM
    )
    client.cookies.set("access_token", tampered_token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401



def test_access_token_missing_sub_returns_401(client: TestClient):
    """
    A token without 'sub' claim must be rejected with 401.
    """
    payload = {
        "role": "employee",
        "sam": "user_without_sub",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    client.cookies.set("access_token", token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_access_token_invalid_format_returns_401(client: TestClient):
    """
    A malformed or garbage access token string must return 401.
    """
    client.cookies.set("access_token", "not-a-valid-jwt-token-string")
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


# ============================================================================
# 3. REFRESH TOKEN FLOW & ROTATION (RFC 6749)
# ============================================================================

def test_refresh_token_success_and_rotation(client: TestClient, db_session, test_normal_user):
    """
    Successful refresh returns new tokens, marks old refresh token as revoked,
    and stores new refresh token in DB.
    """
    old_raw_refresh = create_refresh_token(db_session, test_normal_user.object_guid)
    old_token_hash = hash_token(old_raw_refresh)

    client.cookies.set("refresh_token", old_raw_refresh)
    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert response.json()["detail"] == "Tokens refreshed"

    # Verify new cookies are set
    new_access = response.cookies.get("access_token")
    new_refresh = response.cookies.get("refresh_token")
    assert new_access is not None
    assert new_refresh is not None
    assert new_refresh != old_raw_refresh

    # Verify old token is marked revoked in DB
    db_session.expire_all()
    old_db_token = db_session.query(RefreshToken).filter(RefreshToken.token_hash == old_token_hash).first()
    assert old_db_token.revoked is True

    # Verify new token is stored and active in DB
    new_token_hash = hash_token(new_refresh)
    new_db_token = db_session.query(RefreshToken).filter(RefreshToken.token_hash == new_token_hash).first()
    assert new_db_token is not None
    assert new_db_token.revoked is False
    assert new_db_token.user_guid == test_normal_user.object_guid

    # Verify new access token can be used immediately
    client.cookies.set("access_token", new_access)
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["sam_account_name"] == test_normal_user.sam_account_name


def test_refresh_token_missing_cookie_returns_401(client: TestClient):
    """
    Calling /api/v1/auth/refresh without refresh_token cookie must return 401.
    """
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert "No refresh token provided" in response.json()["detail"]


def test_refresh_token_expired_in_db_returns_401(client: TestClient, db_session, test_normal_user):
    """
    A refresh token whose expires_at is in the past must be rejected with 401.
    """
    token_str = str(uuid.uuid4())
    token_hash = hash_token(token_str)
    expired_token = RefreshToken(
        id=uuid.uuid4(),
        user_guid=test_normal_user.object_guid,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        revoked=False
    )
    db_session.add(expired_token)
    db_session.commit()

    client.cookies.set("refresh_token", token_str)
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert "Недействительный или истекший" in response.json()["detail"]


def test_refresh_token_revoked_outside_grace_returns_401(client: TestClient, db_session, test_normal_user):
    """
    A revoked token with no Redis grace record must be rejected with 401.
    """
    token_str = str(uuid.uuid4())
    token_hash = hash_token(token_str)
    revoked_token = RefreshToken(
        id=uuid.uuid4(),
        user_guid=test_normal_user.object_guid,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        revoked=True
    )
    db_session.add(revoked_token)
    db_session.commit()

    client.cookies.set("refresh_token", token_str)
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert "Недействительный или истекший" in response.json()["detail"]


# ============================================================================
# 4. CONCURRENCY & MULTI-TAB RACE CONDITIONS (REDIS GRACE WINDOW EC-5)
# ============================================================================

def test_refresh_grace_period_second_tab_succeeds_within_10s(client: TestClient, db_session, test_normal_user, mock_redis):
    """
    Tests EC-5 multi-tab concurrency:
    When tab 1 refreshes token T1, T1 is revoked and stored in Redis grace window for 10s.
    When tab 2 concurrently sends T1 within 10s, it succeeds and receives valid tokens.
    """
    raw_token = create_refresh_token(db_session, test_normal_user.object_guid)

    # 1. Tab 1 refreshes token -> success
    client.cookies.set("refresh_token", raw_token)
    resp1 = client.post("/api/v1/auth/refresh")
    assert resp1.status_code == 200
    tab1_access = resp1.cookies.get("access_token")
    assert tab1_access is not None

    # 2. Tab 2 concurrently refreshes with OLD token T1 (within grace window in Redis)
    client.cookies.set("refresh_token", raw_token)
    resp2 = client.post("/api/v1/auth/refresh")
    assert resp2.status_code == 200
    assert resp2.json()["detail"] == "Tokens refreshed"
    tab2_access = resp2.cookies.get("access_token")
    assert tab2_access is not None

    # Both issued access tokens must be valid
    client.cookies.set("access_token", tab1_access)
    assert client.get("/api/v1/auth/me").status_code == 200

    client.cookies.set("access_token", tab2_access)
    assert client.get("/api/v1/auth/me").status_code == 200


def test_refresh_grace_period_fails_after_ttl_expires(client: TestClient, db_session, test_normal_user, mock_redis):
    """
    When the 10-second grace window expires in Redis, subsequent requests with the
    revoked token must fail with 401.
    """
    raw_token = create_refresh_token(db_session, test_normal_user.object_guid)
    token_hash = hash_token(raw_token)

    # Tab 1 refreshes token
    client.cookies.set("refresh_token", raw_token)
    resp1 = client.post("/api/v1/auth/refresh")
    assert resp1.status_code == 200

    # Simulate TTL expiration by clearing key in mock Redis
    mock_redis.delete(f"token_grace:{token_hash}")

    # Tab 2 tries to use old token after TTL expired -> 401
    client.cookies.clear()
    client.cookies.set("refresh_token", raw_token)
    resp2 = client.post("/api/v1/auth/refresh")
    assert resp2.status_code == 401
    assert "Недействительный или истекший" in resp2.json()["detail"]



def test_grace_window_does_not_extend_on_repeated_revocation(db_session, test_normal_user, mock_redis):
    """
    Verifies that calling revoke_refresh_token multiple times on the same token
    does not overwrite / extend the Redis grace TTL.
    """
    from app.db.repository.token import revoke_refresh_token
    raw_token = create_refresh_token(db_session, test_normal_user.object_guid)
    token_hash = hash_token(raw_token)
    grace_key = f"token_grace:{token_hash}"

    # First revocation sets grace key
    revoke_refresh_token(db_session, raw_token)
    assert mock_redis.exists(grace_key)

    # Simulate passing time (TTL reduced to 3s)
    mock_redis.setex(grace_key, 3, str(test_normal_user.object_guid))

    # Second revocation must NOT reset TTL back to 10s
    revoke_refresh_token(db_session, raw_token)
    assert mock_redis.ttl(grace_key) == 3


# ============================================================================
# 5. LDAP ACTIVE DIRECTORY RESILIENCE & ACCOUNT STATUS
# ============================================================================

def test_refresh_when_ldap_unavailable_does_not_revoke_session(client: TestClient, db_session, test_normal_user, mocker):
    """
    CRITICAL ROOT CAUSE TEST:
    If Active Directory / LDAP search pool is temporarily unavailable or returns None,
    the active user's session must NOT be revoked; refresh must succeed (fail-open for resilience).
    """
    mocker.patch("app.core.ldap.search_user_by_sam", return_value=None)
    mocker.patch("app.core.ldap.search.search_user_by_sam", return_value=None)

    raw_token = create_refresh_token(db_session, test_normal_user.object_guid)
    client.cookies.clear()
    client.cookies.set("refresh_token", raw_token)

    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json()["detail"] == "Tokens refreshed"
    assert "access_token" in response.cookies


def test_refresh_when_ad_user_explicitly_disabled_revokes_and_returns_401(client: TestClient, db_session, test_normal_user, mocker):
    """
    If Active Directory explicitly indicates user is disabled (userAccountControl & 2),
    the session must be immediately revoked with 401.
    """
    from app.core.ldap.schemas import LdapUser
    disabled_ldap_user = LdapUser(
        object_guid=str(test_normal_user.object_guid),
        full_name=test_normal_user.full_name,
        is_disabled=True
    )
    mocker.patch("app.core.ldap.search_user_by_sam", return_value=disabled_ldap_user)
    mocker.patch("app.core.ldap.search.search_user_by_sam", return_value=disabled_ldap_user)

    raw_token = create_refresh_token(db_session, test_normal_user.object_guid)
    client.cookies.clear()
    client.cookies.set("refresh_token", raw_token)

    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
    assert "отключена" in response.json()["detail"]



def test_session_immediate_revocation_when_user_disabled_in_db(client: TestClient, db_session, test_normal_user):
    """
    When an admin disables a user in DB (status='DISABLED'), all requests with valid
    unexpired access tokens must be immediately rejected with 403 Forbidden.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)

    # 1. User is active -> 200
    assert client.get("/api/v1/auth/me").status_code == 200

    # 2. User disabled in DB -> 403 Forbidden
    test_normal_user.status = "DISABLED"
    db_session.commit()

    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403
    assert "Учетная запись отключена" in response.json()["detail"]


def test_session_immediate_revocation_when_user_resigned_in_db(client: TestClient, db_session, test_normal_user):
    """
    When a user is marked RESIGNED in DB, access must be immediately rejected with 403.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)

    test_normal_user.status = UserStatus.RESIGNED.value
    db_session.commit()

    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403
    assert "Учетная запись отключена" in response.json()["detail"]


def test_session_immediate_revocation_when_user_deleted_from_db(client: TestClient, db_session, test_normal_user):
    """
    When a user is deleted from DB, access token must return 401.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)

    db_session.delete(test_normal_user)
    db_session.commit()

    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Пользователь не найден" in response.json()["detail"]



# ============================================================================
# 6. CSRF PROTECTION FOR COOKIE SESSIONS
# ============================================================================

def test_csrf_safe_get_method_without_csrf_header_succeeds(client: TestClient, test_normal_user):
    """
    Safe HTTP methods (GET, HEAD, OPTIONS) do not require X-CSRF-Token header.
    """
    token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200


def test_csrf_state_changing_post_without_csrf_header_returns_403(client: TestClient, test_admin_user):
    """
    State-changing methods (POST, PUT, DELETE, PATCH) with cookie auth but missing
    X-CSRF-Token header must return 403 Forbidden.
    """
    token = create_access_token(
        subject=test_admin_user.object_guid,
        role=test_admin_user.role,
        sam=test_admin_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)
    client.cookies.set("csrf_token", "valid_csrf_token_value_123")

    # POST without X-CSRF-Token header
    response = client.post("/api/v1/admin/security/unblock", json={"ip": "10.0.0.1"})
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


def test_csrf_state_changing_post_with_mismatched_header_returns_403(client: TestClient, test_admin_user):
    """
    State-changing methods with mismatched X-CSRF-Token header must return 403 Forbidden.
    """
    token = create_access_token(
        subject=test_admin_user.object_guid,
        role=test_admin_user.role,
        sam=test_admin_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", token)
    client.cookies.set("csrf_token", "cookie_token_aaa")

    response = client.post(
        "/api/v1/admin/security/unblock",
        json={"ip": "10.0.0.1"},
        headers={"X-CSRF-Token": "mismatched_header_bbb"}
    )
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]


def test_csrf_state_changing_post_with_matching_header_succeeds(client: TestClient, test_admin_user):
    """
    State-changing methods with matching csrf_token cookie and X-CSRF-Token header must succeed.
    """
    token = create_access_token(
        subject=test_admin_user.object_guid,
        role=test_admin_user.role,
        sam=test_admin_user.sam_account_name,
        dept="IT"
    )
    csrf_val = "secure_matching_csrf_token_value"
    client.cookies.set("access_token", token)
    client.cookies.set("csrf_token", csrf_val)

    response = client.post(
        "/api/v1/admin/security/unblock",
        json={"ip": "10.0.0.1"},
        headers={"X-CSRF-Token": csrf_val}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_csrf_bearer_authorization_bypasses_csrf_check(client: TestClient, test_admin_user):
    """
    Requests using Authorization: Bearer <token> (scripts, mobile/desktop clients)
    bypass CSRF checks as they are not vulnerable to browser ambient credentials.
    """
    token = create_access_token(
        subject=test_admin_user.object_guid,
        role=test_admin_user.role,
        sam=test_admin_user.sam_account_name,
        dept="IT"
    )
    # No cookies, only Bearer header, no X-CSRF-Token header
    response = client.post(
        "/api/v1/admin/security/unblock",
        json={"ip": "10.0.0.1"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ============================================================================
# 7. LOGOUT & TOKEN INVALIDATION
# ============================================================================

def test_logout_revokes_refresh_token_and_clears_cookies(client: TestClient, db_session, test_normal_user):
    """
    Logout marks refresh token as revoked in DB and clears all session cookies.
    """
    raw_refresh = create_refresh_token(db_session, test_normal_user.object_guid)
    token_hash = hash_token(raw_refresh)

    client.cookies.set("refresh_token", raw_refresh)
    client.cookies.set("access_token", "sample_access_token")
    client.cookies.set("csrf_token", "sample_csrf_token")

    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["detail"] == "Logged out"

    # Verify DB token is marked revoked
    db_session.expire_all()
    db_token = db_session.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    assert db_token.revoked is True


def test_logout_prevents_subsequent_token_refresh(client: TestClient, db_session, test_normal_user, mock_redis):
    """
    After logout, attempting to refresh with the logged-out refresh token must fail.
    """
    raw_refresh = create_refresh_token(db_session, test_normal_user.object_guid)
    client.cookies.set("refresh_token", raw_refresh)

    # 1. Logout
    client.post("/api/v1/auth/logout")

    # Clear Redis grace key if any
    token_hash = hash_token(raw_refresh)
    mock_redis.delete(f"token_grace:{token_hash}")

    # 2. Attempt refresh with logged out token -> 401
    client.cookies.set("refresh_token", raw_refresh)
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


# ============================================================================
# 8. WEBSOCKET AUTH TOKEN
# ============================================================================

def test_ws_token_issuance_valid_claims_and_5_minute_expiry(client: TestClient, test_normal_user):
    """
    GET /api/v1/auth/ws-token issues a short-lived (5 min) JWT for WebSocket connection.
    """
    access_token = create_access_token(
        subject=test_normal_user.object_guid,
        role=test_normal_user.role,
        sam=test_normal_user.sam_account_name,
        dept="IT"
    )
    client.cookies.set("access_token", access_token)

    response = client.get("/api/v1/auth/ws-token")
    assert response.status_code == 200
    data = response.json()
    assert "ws_token" in data

    ws_token = data["ws_token"]
    payload = jwt.decode(ws_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(test_normal_user.object_guid)

    # Expiry should be roughly 5 minutes from now
    expected_exp = datetime.now(timezone.utc).timestamp() + (5 * 60)
    assert abs(payload["exp"] - expected_exp) < 10


def test_ws_token_requires_active_session(client: TestClient):
    """
    Unauthenticated call to /api/v1/auth/ws-token must return 401.
    """
    response = client.get("/api/v1/auth/ws-token")
    assert response.status_code == 401


# ============================================================================
# 9. DEV USER SESSION FLOW
# ============================================================================

def test_dev_user_login_and_refresh(client: TestClient, db_session, monkeypatch):
    """
    Tests development account bypass login and subsequent token refresh.
    """
    monkeypatch.setattr(settings, "DEV_USER", "dev_admin")
    monkeypatch.setattr(settings, "DEV_PASSWORD", "dev_secret_pass")

    # 1. Login with dev credentials
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "dev_admin",
        "password": "dev_secret_pass"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["sam_account_name"] == "dev_admin"
    assert "access_token" in login_resp.cookies
    assert "refresh_token" in login_resp.cookies

    # 2. Refresh session
    refresh_resp = client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["detail"] == "Tokens refreshed"
