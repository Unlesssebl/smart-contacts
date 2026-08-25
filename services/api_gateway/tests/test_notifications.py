from uuid import uuid4
from jose import jwt
from app.core.config import settings
from shared.models.notification import Notification
from app.services.event_service import (
    publish_moderation_update,
    publish_ticket_closed,
    publish_report_updated,
)


def create_auth_cookie(user_guid: str) -> dict:
    payload = {"sub": user_guid}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {
        "access_token": token,
        "csrf_token": "mock_csrf_token",
    }


def test_list_notifications_unauthenticated(client):
    response = client.get("/api/v1/notifications")
    assert response.status_code == 401


def test_list_notifications_empty(client, test_normal_user):
    cookies = create_auth_cookie(str(test_normal_user.object_guid))
    response = client.get("/api/v1/notifications", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["unread_count"] == 0
    assert data["total"] == 0


def test_notification_lifecycle_crud(client, db_session, test_normal_user):
    cookies = create_auth_cookie(str(test_normal_user.object_guid))
    headers = {"X-CSRF-Token": "mock_csrf_token"}

    # 1. Create notification directly in DB
    notif = Notification(
        user_guid=test_normal_user.object_guid,
        type="field_applied",
        title="Телефон обновлён",
        body="Ваша заявка на изменение поля «внутренний телефон» принята",
        field="internal_phone",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    # 2. Check list and unread count
    list_res = client.get("/api/v1/notifications", cookies=cookies)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert list_data["unread_count"] == 1
    assert list_data["items"][0]["title"] == "Телефон обновлён"
    assert list_data["items"][0]["is_read"] is False

    count_res = client.get("/api/v1/notifications/unread-count", cookies=cookies)
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] == 1

    # 3. Mark as read
    read_res = client.patch(
        f"/api/v1/notifications/{notif.id}/read",
        cookies=cookies,
        headers=headers,
    )
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    count_after_read = client.get("/api/v1/notifications/unread-count", cookies=cookies)
    assert count_after_read.json()["unread_count"] == 0

    # 4. Add another notification and mark all as read
    notif2 = Notification(
        user_guid=test_normal_user.object_guid,
        type="report_approved",
        title="Сообщение принято",
        body="Ваше сообщение рассмотрено",
        field="office_location",
        is_read=False,
    )
    db_session.add(notif2)
    db_session.commit()

    read_all_res = client.post(
        "/api/v1/notifications/read-all",
        cookies=cookies,
        headers=headers,
    )
    assert read_all_res.status_code == 200
    assert read_all_res.json()["status"] == "ok"

    count_after_all = client.get("/api/v1/notifications/unread-count", cookies=cookies)
    assert count_after_all.json()["unread_count"] == 0

    # 5. Delete single notification
    del_res = client.delete(
        f"/api/v1/notifications/{notif.id}",
        cookies=cookies,
        headers=headers,
    )
    assert del_res.status_code == 200

    # 6. Clear all notifications
    clear_res = client.delete(
        "/api/v1/notifications",
        cookies=cookies,
        headers=headers,
    )
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "ok"

    final_list = client.get("/api/v1/notifications", cookies=cookies)
    assert final_list.json()["total"] == 0


def test_notification_isolation_between_users(client, db_session, test_normal_user, test_admin_user):
    user_cookies = create_auth_cookie(str(test_normal_user.object_guid))
    admin_cookies = create_auth_cookie(str(test_admin_user.object_guid))
    headers = {"X-CSRF-Token": "mock_csrf_token"}

    # Notification for Admin
    admin_notif = Notification(
        user_guid=test_admin_user.object_guid,
        type="ticket_closed",
        title="Тикет закрыт",
        body="Обращение закрыто",
        is_read=False,
    )
    db_session.add(admin_notif)
    db_session.commit()
    db_session.refresh(admin_notif)

    # Normal user cannot see admin's notification
    user_list = client.get("/api/v1/notifications", cookies=user_cookies)
    assert user_list.json()["total"] == 0

    # Normal user cannot mark admin's notification as read -> 404
    user_read_res = client.patch(
        f"/api/v1/notifications/{admin_notif.id}/read",
        cookies=user_cookies,
        headers=headers,
    )
    assert user_read_res.status_code == 404

    # Normal user cannot delete admin's notification -> 404
    user_del_res = client.delete(
        f"/api/v1/notifications/{admin_notif.id}",
        cookies=user_cookies,
        headers=headers,
    )
    assert user_del_res.status_code == 404
