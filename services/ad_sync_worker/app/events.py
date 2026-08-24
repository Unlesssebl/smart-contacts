import json
import logging
from typing import Any
from uuid import UUID

import redis

from .config import settings


logger = logging.getLogger(__name__)
SYSTEM_EVENTS_CHANNEL = "system_events"

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True,
)


def publish_system_event(event_type: str, **payload: Any) -> bool:
    try:
        redis_client.publish(
            SYSTEM_EVENTS_CHANNEL,
            json.dumps({"type": event_type, **payload}),
        )
    except Exception:
        logger.exception(
            "Failed to publish Redis system event",
            extra={"event_type": event_type},
        )
        return False
    return True


def publish_admin_update() -> bool:
    return publish_system_event("admin_update")


def publish_profile_update(
    user_id: UUID | str,
    applied_fields: list[str] | None = None,
    rejected_fields: list[str] | None = None
) -> bool:
    payload = {"user_id": str(user_id)}
    if applied_fields:
        payload["applied_fields"] = applied_fields
    if rejected_fields:
        payload["rejected_fields"] = rejected_fields
    return publish_system_event("profile_updated", **payload)


def publish_ldap_status_update() -> bool:
    return publish_system_event("ldap_status_updated")
