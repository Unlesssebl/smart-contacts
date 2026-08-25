from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session

from shared.models.notification import Notification


def create_notification(
    db: Session,
    user_guid: UUID,
    type: str,
    title: str,
    body: str,
    field: Optional[str] = None,
    category: Optional[str] = None,
    payload: Optional[dict[str, Any]] = None,
) -> Notification:
    notification = Notification(
        user_guid=user_guid,
        type=type,
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


def get_user_notifications(
    db: Session,
    user_guid: UUID,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> tuple[list[Notification], int, int]:
    query = db.query(Notification).filter(Notification.user_guid == user_guid)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712

    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_guid == user_guid, Notification.is_read == False)  # noqa: E712
        .scalar()
        or 0
    )

    return items, total, unread_count


def get_unread_count(db: Session, user_guid: UUID) -> int:
    return (
        db.query(func.count(Notification.id))
        .filter(Notification.user_guid == user_guid, Notification.is_read == False)  # noqa: E712
        .scalar()
        or 0
    )


def mark_as_read(db: Session, notification_id: UUID, user_guid: UUID) -> Optional[Notification]:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_guid == user_guid)
        .first()
    )
    if not notification:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_as_read(db: Session, user_guid: UUID) -> int:
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Notification)
        .filter(Notification.user_guid == user_guid, Notification.is_read == False)  # noqa: E712
        .update(
            {Notification.is_read: True, Notification.read_at: now},
            synchronize_session="fetch",
        )
    )
    db.commit()
    return updated


def delete_notification(db: Session, notification_id: UUID, user_guid: UUID) -> bool:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_guid == user_guid)
        .first()
    )
    if not notification:
        return False

    db.delete(notification)
    db.commit()
    return True


def clear_user_notifications(db: Session, user_guid: UUID) -> int:
    deleted = (
        db.query(Notification)
        .filter(Notification.user_guid == user_guid)
        .delete(synchronize_session="fetch")
    )
    db.commit()
    return deleted
