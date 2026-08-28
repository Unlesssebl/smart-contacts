from fastapi.testclient import TestClient

def test_list_users(client: TestClient, mock_kerberos, test_admin_user, test_normal_user):
    """
    Test the /api/v1/users endpoint returns paginated users correctly.
    """
    # Login as admin to get token
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    response = client.get("/api/v1/users")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert "total" in data
    
    # Check that both seeded users are returned
    assert data["total"] == 2
    users = data["items"]
    full_names = [u["full_name"] for u in users]
    assert test_admin_user.full_name in full_names
    assert test_normal_user.full_name in full_names

def test_get_user_by_id(client: TestClient, mock_kerberos, test_admin_user, test_normal_user):
    """
    Test retrieving a specific user.
    """
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    response = client.get(f"/api/v1/users/{test_normal_user.object_guid}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sam_account_name"] == test_normal_user.sam_account_name

def test_get_user_not_found(client: TestClient, mock_kerberos, test_admin_user):
    """
    Test retrieving a non-existent user returns 404.
    """
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    import uuid
    random_uuid = str(uuid.uuid4())
    
    response = client.get(f"/api/v1/users/{random_uuid}")
    assert response.status_code == 404

def test_get_hidden_user_by_self_and_others(client: TestClient, mocker, db_session, test_normal_user, test_admin_user):
    """
    Test that a hidden user can view their own profile, but other non-admin users get 404.
    """
    test_normal_user.is_hidden = True
    db_session.commit()

    # 1. Logged in as the hidden user himself -> 200 OK
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_normal_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_self"})
    response = client.get(f"/api/v1/users/{test_normal_user.object_guid}")
    assert response.status_code == 200
    assert response.json()["sam_account_name"] == test_normal_user.sam_account_name

    # 2. Logged in as admin -> 200 OK
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    response = client.get(f"/api/v1/users/{test_normal_user.object_guid}")
    assert response.status_code == 200

def test_admin_endpoint_forbidden_for_normal_user(client: TestClient, mocker, test_normal_user):
    """
    Test RBAC: a normal user cannot access admin routes.
    We need to mock kerberos to return normal_user's UPN.
    """
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_normal_user.sam_account_name
    )
    
    # Login as normal user
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_normal"})
    
    # Attempt to access admin reports
    response = client.get("/api/v1/admin/reports")
    
    # Should be forbidden
    assert response.status_code == 403
    assert "Недостаточно прав" in response.json()["detail"]

def test_admin_endpoint_allowed_for_admin(client: TestClient, mock_kerberos, test_admin_user):
    """
    Test RBAC: admin user can access admin routes.
    """
    # Login as admin
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    
    response = client.get("/api/v1/admin/reports")
    
    # Should be OK (even if list is empty)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_user_ad_dn_access_control(client: TestClient, mocker, db_session, test_admin_user, test_normal_user):
    """
    Test that ad_dn is visible to admin/operator but hidden (None) for normal employees.
    """
    # 1. Update users in DB with ad_dn values
    test_admin_user.ad_dn = "CN=Admin User,OU=IT,DC=test,DC=local"
    test_normal_user.ad_dn = "CN=Normal User,OU=Users,DC=test,DC=local"
    db_session.commit()

    # 2. Login as admin (test_admin_user / it_operator)
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})

    # 2a. Admin fetches users list - should see ad_dn
    response = client.get("/api/v1/users")
    assert response.status_code == 200
    items = response.json()["items"]
    admin_dn_item = next(u for u in items if u["object_guid"] == str(test_admin_user.object_guid))
    normal_dn_item = next(u for u in items if u["object_guid"] == str(test_normal_user.object_guid))
    assert admin_dn_item["ad_dn"] == "CN=Admin User,OU=IT,DC=test,DC=local"
    assert normal_dn_item["ad_dn"] == "CN=Normal User,OU=Users,DC=test,DC=local"

    # 2b. Admin fetches individual user - should see ad_dn
    response = client.get(f"/api/v1/users/{test_normal_user.object_guid}")
    assert response.status_code == 200
    assert response.json()["ad_dn"] == "CN=Normal User,OU=Users,DC=test,DC=local"

    # 3. Login as normal employee (test_normal_user)
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_normal_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_normal"})

    # 3a. Normal user fetches users list - ad_dn should be None/null
    response = client.get("/api/v1/users")
    assert response.status_code == 200
    items = response.json()["items"]
    admin_dn_item = next(u for u in items if u["object_guid"] == str(test_admin_user.object_guid))
    normal_dn_item = next(u for u in items if u["object_guid"] == str(test_normal_user.object_guid))
    assert admin_dn_item["ad_dn"] is None
    assert normal_dn_item["ad_dn"] is None

    # 3b. Normal user fetches individual user - ad_dn should be None/null
    response = client.get(f"/api/v1/users/{test_normal_user.object_guid}")
    assert response.status_code == 200
    assert response.json()["ad_dn"] is None

def test_department_filtering_and_listing(client: TestClient, mocker, db_session, test_admin_user, test_normal_user):
    """
    Test hierarchical department filtering and listing.
    """
    test_admin_user.organization = "Главный Офис"
    test_admin_user.department = "Департамент ИТ / Отдел разработки"
    test_normal_user.organization = "Главный Офис"
    test_normal_user.department = "Департамент ИТ / Отдел поддержки"
    db_session.commit()

    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})

    # 1. Test /departments returns all distinct levels and full paths
    resp_deps = client.get("/api/v1/users/departments")
    assert resp_deps.status_code == 200
    deps = resp_deps.json()
    assert "Департамент ИТ" in deps
    assert "Отдел разработки" in deps
    assert "Отдел поддержки" in deps
    assert "Департамент ИТ / Отдел разработки" in deps

    # 2. Filter by top level "Департамент ИТ" - should return both users
    resp_all = client.get("/api/v1/users", params={"department": "Департамент ИТ"})
    assert resp_all.status_code == 200
    assert resp_all.json()["total"] == 2

    # 3. Filter by sub-unit "Отдел разработки" - should return only test_admin_user
    resp_sub = client.get("/api/v1/users", params={"department": "Отдел разработки"})
    assert resp_sub.status_code == 200
    assert resp_sub.json()["total"] == 1
    assert resp_sub.json()["items"][0]["object_guid"] == str(test_admin_user.object_guid)


def test_canonical_mapping_and_suggestions(client: TestClient, mocker, db_session, test_admin_user, test_normal_user):
    """
    Test admin canonical endpoints and AI suggestions.
    """
    test_admin_user.department_raw = "ПЭО"
    test_admin_user.department = "ПЭО"
    test_admin_user.job_title_raw = "зам начальника отдела"
    test_admin_user.job_title = "зам начальника отдела"

    test_normal_user.department_raw = "Планово-экономический отдел"
    test_normal_user.department = "Планово-экономический отдел"
    test_normal_user.job_title_raw = "Заместитель начальника отдела"
    test_normal_user.job_title = "Заместитель начальника отдела"
    db_session.commit()

    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    csrf_token = client.cookies.get("csrf_token") or "mock_csrf_token"
    auth_headers = {"X-CSRF-Token": csrf_token}

    # 1. Test canonical suggestions
    resp_sugg = client.get("/api/v1/admin/canonical/suggestions")
    assert resp_sugg.status_code == 200
    sugg_data = resp_sugg.json()
    assert "departments" in sugg_data
    assert "job_titles" in sugg_data
    assert len(sugg_data["departments"]) >= 1
    assert len(sugg_data["job_titles"]) >= 1

    # 2. Update dept mapping
    resp_post_dept = client.post(
        "/api/v1/admin/settings/dept-mapping",
        json={"mapping": {"ПЭО": "Планово-экономический отдел"}},
        headers=auth_headers
    )
    assert resp_post_dept.status_code == 200

    resp_get_dept = client.get("/api/v1/admin/settings/dept-mapping")
    assert resp_get_dept.status_code == 200
    assert resp_get_dept.json()["mapping"]["ПЭО"] == "Планово-экономический отдел"

    # 3. Update job title mapping
    resp_post_job = client.post(
        "/api/v1/admin/settings/job-title-mapping",
        json={"mapping": {"зам начальника отдела": "Заместитель начальника отдела"}},
        headers=auth_headers
    )
    assert resp_post_job.status_code == 200

    resp_get_job = client.get("/api/v1/admin/settings/job-title-mapping")
    assert resp_get_job.status_code == 200
    assert resp_get_job.json()["mapping"]["зам начальника отдела"] == "Заместитель начальника отдела"


def test_admin_decomposed_endpoints_smoke(client: TestClient, mocker, test_admin_user, test_normal_user):
    """
    Smoke test covering each domain module of the decomposed admin router.
    """
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    csrf_token = client.cookies.get("csrf_token") or "mock_csrf_token"
    auth_headers = {"X-CSRF-Token": csrf_token}

    # 1. Reviews domain: change-requests
    resp_cr = client.get("/api/v1/admin/change-requests")
    assert resp_cr.status_code == 200
    assert isinstance(resp_cr.json(), list)

    # 2. Settings domain: LDAP settings
    resp_ldap = client.get("/api/v1/admin/settings/ldap")
    assert resp_ldap.status_code == 200
    assert "ad_user" in resp_ldap.json()

    # 3. Settings domain: OU mapping
    resp_ou = client.get("/api/v1/admin/settings/ou-mapping")
    assert resp_ou.status_code == 200
    assert "mapping" in resp_ou.json()

    # 4. Security domain: incidents
    resp_sec = client.get("/api/v1/admin/security/incidents")
    assert resp_sec.status_code == 200
    assert isinstance(resp_sec.json(), list)

    # 5. Users domain: force sync
    resp_sync = client.post("/api/v1/admin/sync/force", headers=auth_headers)
    assert resp_sync.status_code == 200
    assert resp_sync.json()["status"] == "ok"

    # 6. Users domain: user visibility
    resp_vis = client.patch(
        f"/api/v1/admin/users/{test_normal_user.object_guid}/visibility",
        json={"is_hidden": True},
        headers=auth_headers
    )
    assert resp_vis.status_code == 200
    assert resp_vis.json()["is_hidden"] is True


def test_unmapped_user_excluded_from_directory(client: TestClient, mocker, db_session, test_admin_user, test_normal_user):
    """
    Test that users without configured mapping (organization is None or empty)
    are excluded from directory search (/api/v1/users), job-titles filter,
    and return 404 on direct /api/v1/users/{id} for regular employees.
    """
    from shared.models.user import User
    import uuid
    from datetime import datetime, timezone

    unmapped_user = User(
        object_guid=uuid.uuid4(),
        sam_account_name="unmapped_user",
        full_name="Unmapped User",
        role="employee",
        organization=None, # No mapping configured
        department=None,
        job_title="Unmapped Specialist",
        is_verified=True,
        is_protected=False,
        status="ACTIVE",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(unmapped_user)
    db_session.commit()

    # 1. Login as regular employee
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_normal_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_normal"})

    # 1a. Directory listing should only contain mapped users (2 seeded: admin and normal), not unmapped_user
    resp_list = client.get("/api/v1/users")
    assert resp_list.status_code == 200
    data = resp_list.json()
    assert data["total"] == 2
    guids = [u["object_guid"] for u in data["items"]]
    assert str(unmapped_user.object_guid) not in guids
    assert str(test_normal_user.object_guid) in guids
    assert str(test_admin_user.object_guid) in guids

    # 1b. Search query for unmapped user returns 0 results
    resp_search = client.get("/api/v1/users", params={"q": "Unmapped"})
    assert resp_search.status_code == 200
    assert resp_search.json()["total"] == 0

    # 1c. Job titles list should not include job title of unmapped user
    resp_jobs = client.get("/api/v1/users/job-titles")
    assert resp_jobs.status_code == 200
    assert "Unmapped Specialist" not in resp_jobs.json()

    # 1d. Direct GET by ID for unmapped user by regular employee returns 404
    resp_get = client.get(f"/api/v1/users/{unmapped_user.object_guid}")
    assert resp_get.status_code == 404

    # 2. Login as admin - should still be able to access direct unmapped user profile
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    resp_admin_get = client.get(f"/api/v1/users/{unmapped_user.object_guid}")
    assert resp_admin_get.status_code == 200
    assert resp_admin_get.json()["sam_account_name"] == "unmapped_user"


def test_admin_security_unblock_and_csrf(client: TestClient, mocker, test_admin_user):
    """
    Test unblocking an IP address via /api/v1/admin/security/unblock
    with and without proper CSRF token.
    """
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    # Login as admin
    login_resp = client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock_admin"})
    assert login_resp.status_code == 200
    csrf_token = login_resp.cookies.get("csrf_token")
    assert csrf_token is not None

    # 1. POST unblock without X-CSRF-Token header -> 403 Forbidden
    resp_fail = client.post("/api/v1/admin/security/unblock", json={"ip": "192.168.1.50"})
    assert resp_fail.status_code == 403
    assert "CSRF" in resp_fail.json()["detail"]

    # 2. POST unblock with matching X-CSRF-Token header -> 200 OK
    resp_ok = client.post(
        "/api/v1/admin/security/unblock",
        json={"ip": "192.168.1.50"},
        headers={"X-CSRF-Token": csrf_token}
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["status"] == "ok"
    assert "192.168.1.50" in resp_ok.json()["message"]


def test_list_users_is_online_filter(client: TestClient, mocker, mock_kerberos, test_admin_user, test_normal_user):
    """
    Test filtering users by is_online (online/away statuses in Redis).
    """
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})

    # 1. Mock Redis presence: test_normal_user is "online", test_admin_user is "offline"
    mock_presence = {
        str(test_normal_user.object_guid): "online",
        str(test_admin_user.object_guid): "offline"
    }
    mocker.patch(
        "app.api.v1.endpoints.users.redis_client.hgetall",
        return_value=mock_presence
    )

    response = client.get("/api/v1/users", params={"is_online": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["full_name"] == test_normal_user.full_name
    assert data["items"][0]["presence"] == "online"

    # 2. Mock Redis presence: test_admin_user is "away", test_normal_user is "offline"
    mock_presence = {
        str(test_admin_user.object_guid): "away",
        str(test_normal_user.object_guid): "offline"
    }
    mocker.patch(
        "app.api.v1.endpoints.users.redis_client.hgetall",
        return_value=mock_presence
    )

    response = client.get("/api/v1/users", params={"is_online": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["full_name"] == test_admin_user.full_name
    assert data["items"][0]["presence"] == "away"

    # 3. Mock Redis presence: both offline / empty
    mocker.patch(
        "app.api.v1.endpoints.users.redis_client.hgetall",
        return_value={}
    )
    response = client.get("/api/v1/users", params={"is_online": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0

def test_filter_dropdowns_caching(client: TestClient, mock_kerberos, test_admin_user, test_normal_user):
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})

    # First request populates cache
    resp1 = client.get("/api/v1/users/departments")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert isinstance(data1, list)

    # Second request hits cache
    resp2 = client.get("/api/v1/users/departments")
    assert resp2.status_code == 200
    assert resp2.json() == data1

    # Organizations
    resp_org = client.get("/api/v1/users/organizations")
    assert resp_org.status_code == 200
    assert isinstance(resp_org.json(), list)

    # Job titles
    resp_job = client.get("/api/v1/users/job-titles")
    assert resp_job.status_code == 200
    assert isinstance(resp_job.json(), list)

def test_l1_auth_cache_invalidation(client: TestClient, mock_kerberos, test_admin_user, db_session):
    from app.api.deps import invalidate_user_cache, _L1_USER_CACHE
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    # 1. Trigger auth fetch to populate L1 and L2 cache
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert str(test_admin_user.object_guid) in _L1_USER_CACHE
    
    # 2. Invalidate cache
    invalidate_user_cache(test_admin_user.object_guid)
    assert str(test_admin_user.object_guid) not in _L1_USER_CACHE

def test_cached_user_session_detachment_safety(client: TestClient, mock_kerberos, test_admin_user, db_session):
    """Ensure subsequent requests using L1/L2 cached user models do not raise DetachedInstanceError."""
    client.get("/api/v1/auth/sso", headers={"Authorization": "Negotiate mock"})
    
    # First call populates cache
    resp1 = client.get("/api/v1/auth/me")
    assert resp1.status_code == 200
    
    # Force close / rollback any active session to simulate new request lifecycle
    db_session.rollback()
    db_session.close()
    
    # Second call uses L1 cache - must succeed without DetachedInstanceError
    resp2 = client.get("/api/v1/auth/me")
    assert resp2.status_code == 200
    assert resp2.json()["sam_account_name"] == test_admin_user.sam_account_name




