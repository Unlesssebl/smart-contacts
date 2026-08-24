import json
import sys
from pathlib import Path
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

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

    def test_full_snapshot_replaces_historical_known_ous(self):
        setting = Mock(value=json.dumps({"CORPORATE_USERS": {"Old OU": {}}}))
        session = Mock()
        session.get.return_value = setting

        logic.save_known_ous(
            session,
            {("CORPORATE_USERS", "Current OU")},
            replace=True,
        )

        self.assertEqual(
            json.loads(setting.value),
            {"CORPORATE_USERS": {"Current OU": {}}},
        )
        session.commit.assert_called_once()

    def test_incremental_snapshot_keeps_existing_known_ous(self):
        setting = Mock(value=json.dumps({"CORPORATE_USERS": {"Existing OU": {}}}))
        session = Mock()
        session.get.return_value = setting

        logic.save_known_ous(
            session,
            {("CORPORATE_USERS", "Changed OU")},
        )

        self.assertEqual(
            json.loads(setting.value),
            {"CORPORATE_USERS": {"Existing OU": {}, "Changed OU": {}}},
        )

    def test_prunes_stale_mapping_and_invalidates_cache(self):
        setting = Mock(value=json.dumps({
            "Current OU": {"org": "Current", "color": "#ffffff"},
            "Old OU": {"org": "Old", "color": "#000000"},
        }))
        session = Mock()
        session.get.return_value = setting
        logic._ou_mapping_cache = {"cached": "value"}

        removed = logic.prune_ou_mapping(session, {"Current OU"})

        self.assertEqual(removed, 1)
        self.assertEqual(
            json.loads(setting.value),
            {"Current OU": {"org": "Current", "color": "#ffffff"}},
        )
        self.assertIsNone(logic._ou_mapping_cache)

    def test_direct_corporate_ous_excludes_service_and_nested_paths(self):
        paths = {
            ("CORPORATE_USERS", "Plant"),
            ("CORPORATE_USERS", "Plant", "Department"),
            ("CORPORATE_USERS", "SERVICE_USERS"),
            ("CORPORATE_USERS", "!ПЕРЕНОС"),
            ("Other root", "Other OU"),
        }

        self.assertEqual(logic.direct_corporate_ous(paths), {"Plant"})

    def test_extract_ou_structure_single_and_nested_dept(self):
        session = Mock()
        session.get.return_value = Mock(
            value=json.dumps({"АО КЗМК ТЭМПО": {"org": "АО КЗМК ТЭМПО"}})
        )

        # Single department OU
        org, dept, warnings = logic.extract_ou_structure(
            "CN=Иванов Иван,OU=Бухгалтерия,OU=АО КЗМК ТЭМПО,OU=CORPORATE_USERS,DC=tempo,DC=local",
            session,
        )
        self.assertEqual(org, "АО КЗМК ТЭМПО")
        self.assertEqual(dept, "Бухгалтерия")
        self.assertEqual(warnings, [])

        # Nested department OUs (from parent to child)
        org, dept, warnings = logic.extract_ou_structure(
            "CN=Петров Петр,OU=Сектор веб,OU=Отдел разработки,OU=Департамент ИТ,OU=АО КЗМК ТЭМПО,OU=CORPORATE_USERS,DC=tempo,DC=local",
            session,
        )
        self.assertEqual(org, "АО КЗМК ТЭМПО")
        self.assertEqual(dept, "Департамент ИТ / Отдел разработки / Сектор веб")
        self.assertEqual(warnings, [])

    def test_extract_ou_structure_fallback(self):
        session = Mock()
        session.get.return_value = Mock(
            value=json.dumps({"АО КЗМК ТЭМПО": {"org": "АО КЗМК ТЭМПО"}})
        )

        # No department OU, but fallback provided
        org, dept, warnings = logic.extract_ou_structure(
            "CN=Сидоров,OU=АО КЗМК ТЭМПО,OU=CORPORATE_USERS,DC=tempo,DC=local",
            session,
            fallback_dept="Склад",
        )
        self.assertEqual(org, "АО КЗМК ТЭМПО")
        self.assertEqual(dept, "Склад")

        # Fallback repeats org name -> should not use it
        org, dept, warnings = logic.extract_ou_structure(
            "CN=Сидоров,OU=АО КЗМК ТЭМПО,OU=CORPORATE_USERS,DC=tempo,DC=local",
            session,
            fallback_dept="АО КЗМК ТЭМПО",
        )
        self.assertEqual(org, "АО КЗМК ТЭМПО")
        self.assertIsNone(dept)


if __name__ == "__main__":
    unittest.main()

