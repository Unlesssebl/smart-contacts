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
    assert "does not have enough privileges" in response.json()["detail"]

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
