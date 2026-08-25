import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from app import events


class SystemEventTests(unittest.TestCase):
    @patch.object(events.redis_client, "publish")
    def test_profile_event_is_serialized_consistently(self, publish):
        user_id = uuid4()

        result = events.publish_profile_update(user_id)

        self.assertTrue(result)
        publish.assert_called_once_with(
            events.SYSTEM_EVENTS_CHANNEL,
            json.dumps({"type": "profile_updated", "user_id": str(user_id)}),
        )

    @patch.object(events.redis_client, "publish", side_effect=ConnectionError)
    def test_redis_failure_does_not_break_sync(self, publish):
        self.assertFalse(events.publish_admin_update())


if __name__ == "__main__":
    unittest.main()
