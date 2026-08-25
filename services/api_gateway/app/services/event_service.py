import json
import logging
from collections.abc import Mapping
from typing import Any, Optional
from uuid import UUID

from app.core.redis import redis_client
from app.db.session import SessionLocal
from shared.models.notification import Notification
from shared.utils import (
    build_field_applied_notification,
    build_field_rejected_notification,
    build_report_notification,
    build_ticket_closed_notification,
)

logger = logging.getLogger(__name__)
SYSTEM_EVENTS_CHANNEL = "system_events"


def _save_notification(
    user_guid: UUID | str,
    notif_type: str,
    title: str,
    body: str,
    field: Optional[str] = None,
    category: Optional[str] = None,
    payload: Optional[dict[str, Any]] = None,
) -> Optional[Notification]:
    try:
        user_uuid = UUID(str(user_guid))
        with SessionLocal() as db:
            notification = Notification(
                user_guid=user_uuid,
                type=notif_type,
                title=title,
                body=body,
                field=field,
                category=category,
                payload=payload or {},
                is_read=False,
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            return notification
    except Exception:
        logger.exception("Failed to save notification to database", extra={"user_guid": str(user_guid)})
        return None


def publish_system_event(event_type: str, **payload: Any) -> bool:
    """Publish an event without making the originating HTTP request fail.

    Redis notifications are an eventual-consistency concern: the database
    operation has already succeeded, so a temporary Redis outage is logged and
    reported through the return value instead of being exposed as a 5xx.
    """
    event: Mapping[str, Any] = {"type": event_type, **payload}
    try:
        redis_client.publish(SYSTEM_EVENTS_CHANNEL, json.dumps(event))
    except Exception:
        logger.exception("Failed to publish Redis system event", extra={"event_type": event_type})
        return False
    return True


def publish_admin_update() -> bool:
    return publish_system_event("admin_update")


def publish_moderation_update(
    user_id: UUID,
    applied_fields: list[str] | None = None,
    rejected_fields: list[str] | None = None,
) -> None:
    publish_admin_update()
    payload = {"user_id": str(user_id)}
    if applied_fields:
        payload["applied_fields"] = applied_fields
        for field in applied_fields:
            title, body = build_field_applied_notification(field)
            _save_notification(user_id, "field_applied", title, body, field=field)
    if rejected_fields:
        payload["rejected_fields"] = rejected_fields
        for field in rejected_fields:
            title, body = build_field_rejected_notification(field)
            _save_notification(user_id, "field_rejected", title, body, field=field)
    publish_system_event("profile_updated", **payload)


def publish_ticket_closed(
    user_id: UUID | None,
    category: str | None = None,
    message: str | None = None,
) -> None:
    publish_admin_update()
    if user_id:
        notif_type, title, body = build_ticket_closed_notification(category=category)
        payload: dict[str, Any] = {"user_guid": str(user_id)}
        if category:
            payload["category"] = category
        if message:
            payload["message_snippet"] = message[:60]
        _save_notification(
            user_id,
            notif_type,
            title,
            body,
            category=category,
            payload={"message_snippet": message[:60]} if message else {},
        )
        publish_system_event("ticket_closed", **payload)


def publish_report_updated(
    reporter_guid: UUID | None,
    target_user_guid: UUID,
    attribute_name: str,
    status: str,
    target_user_name: str | None = None,
    rejection_reason: str | None = None,
) -> None:
    publish_admin_update()
    if status in ["approved", "applied"]:
        publish_system_event(
            "profile_updated",
            user_id=str(target_user_guid),
            applied_fields=[attribute_name],
        )
    if reporter_guid:
        notif_type, title, body = build_report_notification(
            attribute_name=attribute_name,
            status=status,
            target_user_name=target_user_name,
            rejection_reason=rejection_reason,
        )
        _save_notification(
            reporter_guid,
            notif_type,
            title,
            body,
            field=attribute_name,
            payload={
                "target_user_guid": str(target_user_guid),
                "target_user_name": target_user_name,
                "status": status,
                "rejection_reason": rejection_reason,
            },
        )
        publish_system_event(
            "report_moderated",
            reporter_guid=str(reporter_guid),
            target_user_guid=str(target_user_guid),
            target_user_name=target_user_name,
            attribute_name=attribute_name,
            status=status,
            rejection_reason=rejection_reason,
        )
