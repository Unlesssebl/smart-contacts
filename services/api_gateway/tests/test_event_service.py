import json
from uuid import uuid4

from app.services import event_service


def test_publish_moderation_update_emits_both_events(mocker):
    publish = mocker.patch.object(event_service.redis_client, "publish")
    user_id = uuid4()

    event_service.publish_moderation_update(user_id)

    assert publish.call_count == 2
    assert publish.call_args_list[0].args == (
        event_service.SYSTEM_EVENTS_CHANNEL,
        json.dumps({"type": "admin_update"}),
    )
    assert publish.call_args_list[1].args == (
        event_service.SYSTEM_EVENTS_CHANNEL,
        json.dumps({"type": "profile_updated", "user_id": str(user_id)}),
    )


def test_publish_system_event_contains_redis_failure(mocker):
    mocker.patch.object(event_service.redis_client, "publish", side_effect=ConnectionError)

    assert event_service.publish_admin_update() is False
