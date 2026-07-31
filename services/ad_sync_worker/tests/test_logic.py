import json
import unittest
from unittest.mock import Mock

from app import logic


class OrganizationMappingTests(unittest.TestCase):
    def setUp(self):
        logic._ou_mapping_cache = None
        logic._ou_mapping_cache_time = 0

    def test_supports_structured_mapping_value(self):
        session = Mock()
        session.get.return_value = Mock(
            value=json.dumps({"Head Office": {"org": "Acme", "color": "#ffffff"}})
        )

        organization, warnings = logic.match_organization_by_ou(
            "CN=User,OU=Head Office,DC=example,DC=local",
            session,
        )

        self.assertEqual(organization, "Acme")
        self.assertEqual(warnings, [])

    def test_supports_legacy_string_mapping_value(self):
        session = Mock()
        session.get.return_value = Mock(value=json.dumps({"IT": "Technology"}))

        organization, warnings = logic.match_organization_by_ou(
            "CN=User,OU=it,DC=example,DC=local",
            session,
        )

        self.assertEqual(organization, "Technology")
        self.assertEqual(warnings, [])


if __name__ == "__main__":
    unittest.main()
