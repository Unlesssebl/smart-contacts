import json
import logging
from collections.abc import Mapping
from typing import Any
from uuid import UUID

from app.core.redis import redis_client


logger = logging.getLogger(__name__)
SYSTEM_EVENTS_CHANNEL = "system_events"


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


def publish_moderation_update(user_id: UUID) -> None:
    publish_admin_update()
    publish_system_event("profile_updated", user_id=str(user_id))
