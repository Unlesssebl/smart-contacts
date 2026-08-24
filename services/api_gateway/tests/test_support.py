from jose import jwt
from app.core.config import settings

def create_auth_cookie(user_guid: str) -> dict:
    payload = {"sub": user_guid}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {
        "access_token": token,
        "csrf_token": "mock_csrf_token",
    }

def test_create_ticket_as_guest_success(client, db_session):
    response = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "access",
            "message": "Не могу зайти в личный кабинет со своим логином.",
            "sender_name": "Иван Петров",
            "sender_contact": "ivan@example.com",
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"
    assert "id" in data

def test_create_ticket_as_guest_validation_errors(client):
    # Missing sender_name
    res1 = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "access",
            "message": "Проблема с доступом",
            "sender_name": "",
            "sender_contact": "ivan@example.com",
        }
    )
    assert res1.status_code == 400

    # Missing sender_contact
    res2 = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "access",
            "message": "Проблема с доступом",
            "sender_name": "Иван",
            "sender_contact": "",
        }
    )
    assert res2.status_code == 400

    # Message too short
    res3 = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "access",
            "message": "a",
            "sender_name": "Иван",
            "sender_contact": "+79991234567",
        }
    )
    assert res3.status_code == 422

def test_create_ticket_authenticated(client, test_normal_user):
    cookies = create_auth_cookie(str(test_normal_user.object_guid))
    response = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "data_error",
            "message": "У меня неверно указан номер кабинета на карточке.",
        },
        cookies=cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"

def test_admin_support_tickets_lifecycle(client, test_admin_user, test_normal_user):
    admin_cookies = create_auth_cookie(str(test_admin_user.object_guid))
    user_cookies = create_auth_cookie(str(test_normal_user.object_guid))

    # 1. Normal user creates a ticket
    create_res = client.post(
        "/api/v1/support/tickets",
        json={
            "category": "bug",
            "message": "Не работает фильтр по отделам в мобильной версии.",
        },
        cookies=user_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # 2. Normal user tries to access admin support tickets list -> 403
    forbidden_res = client.get(
        "/api/v1/admin/support-tickets",
        cookies=user_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert forbidden_res.status_code == 403

    # 3. Admin lists tickets -> 200
    admin_list_res = client.get(
        "/api/v1/admin/support-tickets",
        cookies=admin_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert admin_list_res.status_code == 200
    admin_data = admin_list_res.json()
    tickets = admin_data.get("items", admin_data) if isinstance(admin_data, dict) else admin_data
    assert len(tickets) >= 1
    target = next((t for t in tickets if t["id"] == ticket_id), None)
    assert target is not None
    assert target["status"] == "open"
    assert target["display_sender_name"] == test_normal_user.full_name

    # 4. Admin closes the ticket
    close_res = client.patch(
        f"/api/v1/admin/support-tickets/{ticket_id}/close",
        cookies=admin_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"
    assert close_res.json()["closer_name"] == test_admin_user.full_name

    # 5. Filter by open status does not include closed ticket
    open_list_res = client.get(
        "/api/v1/admin/support-tickets?status=open",
        cookies=admin_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert open_list_res.status_code == 200
    open_data = open_list_res.json()
    open_tickets = open_data.get("items", open_data) if isinstance(open_data, dict) else open_data
    assert all(t["id"] != ticket_id for t in open_tickets)

    # 6. Admin reopens ticket
    reopen_res = client.patch(
        f"/api/v1/admin/support-tickets/{ticket_id}/reopen",
        cookies=admin_cookies,
        headers={"X-CSRF-Token": "mock_csrf_token"}
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "open"
