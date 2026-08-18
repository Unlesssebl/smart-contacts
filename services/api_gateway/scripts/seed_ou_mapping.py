"""Seed organization mappings from the first level below CORPORATE_USERS.

Run from ``services/api_gateway``:

    uv run python scripts/seed_ou_mapping.py          # preview
    uv run python scripts/seed_ou_mapping.py --apply  # save and update users

Existing mapping entries always win, so the script is safe to run repeatedly.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


# Make ``app`` and ``shared`` importable when the file is executed directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import settings_manager  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.services.ou_service import apply_ou_mapping_to_users_bg  # noqa: E402
from shared.models.user import User  # noqa: E402


CORPORATE_ROOT = "CORPORATE_USERS"
EXCLUDED_FIRST_LEVEL_OUS = {
    "!\u0414\u0443\u0431\u043b\u0438 \u0443\u0447\u0451\u0442\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439",
    "SERVICE_USERS",
    "WIFI GUEST",
    "\u0424\u0438\u043b\u0438\u0430\u043b\u044b \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0439",
}

COLORS = (
    "bg-blue-50 text-blue-700 ring-blue-700/10",
    "bg-indigo-50 text-indigo-700 ring-indigo-700/10",
    "bg-purple-50 text-purple-700 ring-purple-700/10",
    "bg-pink-50 text-pink-700 ring-pink-700/10",
    "bg-red-50 text-red-700 ring-red-700/10",
    "bg-orange-50 text-orange-700 ring-orange-700/10",
    "bg-green-50 text-green-700 ring-green-600/20",
    "bg-slate-50 text-slate-700 ring-slate-600/20",
)

IT_TEMPO_COLOR = "bg-green-50 text-green-700 ring-green-600/20"


def normalize(value: str) -> str:
    """Normalize punctuation variants used by old and new AD branches."""
    value = value.upper().replace("Ё", "Е")
    value = re.sub(r"[\\\"'«».]", "", value)
    value = re.sub(r"[-‐‑‒–—]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


CANONICAL_ALIASES = {
    # Joint-stock companies
    "АО ИТЗ": "АО ИТЗ",
    "АО КЗМК ТЭМПО": "АО КЗМК ТЭМПО",
    "АО КМК ТЭМПО": "АО КМК ТЭМПО",
    "АО КПК ТЭМПО": "АО КПК ТЭМПО",
    "АО НПО ТАТЭЛЕКТРОМАШ": "АО НПО Татэлектромаш",
    "АО НТЗ ТЭМ ПО": "АО НТЗ ТЭМ-ПО",
    "АО НТЗ ТЭМПО": "АО НТЗ ТЭМ-ПО",
    "АО ПТФК ТЕХНОТРОН": "АО ПТФК Технотрон",
    "АО СКС ТЭМПО": "АО СКС ТЭМПО",
    "АО ТОРГОВЫЙ ДОМ ТЭМПО": "АО ТОРГОВЫЙ ДОМ ТЭМПО",
    # IT and individual entrepreneurs
    "АЙТИ ТЭМПО": "АйТи \"ТЭМПО\"",
    "ИП АХАТОВ ИИ": "ИП Ахатов ИИ",
    "ИП КАЗЫХАНОВ ЭФ": "ИП Казыханов ЭФ",
    "ИП КВАШНИНА": "ИП Квашнина",
    "ИП НУРИЕВА": "ИП Нуриева",
    "ИП ПЕТРОВ ДВ": "ИП Петров ДВ",
    "ИП САГДАТУЛЛИН": "ИП Сагдатуллин",
    "ИП ШАРИФУЛЛИН": "ИП Шарифуллин",
    "ИП ШАРИФУЛЛИН РУСФ": "ИП Шарифуллин Рус.Ф",
    "ИП ШАРИФУЛЛИН РУСТЕМ": "ИП Шарифуллин Рус.Ф",
    # Limited liability companies
    "ООО ДЗИЛ": "ООО ДЗИЛ",
    "ООО КИЦ": "ООО КИЦ",
    "ООО КАМСКИЙ НАСТИЛ": "ООО Камский настил",
    "ООО СОВРЕМЕННЫЕ ТЕХНОЛОГИИ": "ООО СОВРЕМЕННЫЕ ТЕХНОЛОГИИ",
    "ООО ТЕХНИКА АГРО": "ООО ТЕХНИКА-АГРО",
    "ООО ТЕХНИКА АГРО2": "ООО ТЕХНИКА-АГРО",
    "ООО ТЕХНОТРОН МЕТИЗ": "ООО Технотрон-Метиз",
    "ООО ТЭМПО ВОСТОК": "ООО ТЭМПО ВОСТОК",
    "ООО ТЭМПО ЛОГИСТИК": "ООО ТЭМПО-Логистик",
    "ООО ТЭМПО МЕТИЗ": "ООО ТЭМПО-Метиз",
    "ООО ТЭМПО ПОРТ": "ООО ТЭМПО ПОРТ",
}


def color_for(organization: str) -> str:
    if organization == "АйТи \"ТЭМПО\"":
        return IT_TEMPO_COLOR
    digest = hashlib.sha256(organization.encode("utf-8")).digest()
    return COLORS[digest[0] % len(COLORS)]


def load_json_setting(db: Any, key: str) -> dict[str, Any]:
    raw = settings_manager.get_setting(db, key)
    if not raw:
        return {}
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError(f"{key} must contain a JSON object")
    return parsed


def build_seed(tree: dict[str, Any]) -> tuple[dict[str, dict[str, str]], list[str]]:
    corporate_tree = tree.get(CORPORATE_ROOT)
    if not isinstance(corporate_tree, dict):
        raise ValueError(f"{CORPORATE_ROOT} is missing from KNOWN_OUS")

    seed: dict[str, dict[str, str]] = {}
    unknown: list[str] = []
    for ou in sorted(corporate_tree):
        if ou in EXCLUDED_FIRST_LEVEL_OUS:
            continue
        organization = CANONICAL_ALIASES.get(normalize(ou))
        if organization is None:
            unknown.append(ou)
            continue
        seed[ou] = {"org": organization, "color": color_for(organization)}
    return seed, unknown


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="save the merged mapping and update users")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        tree = load_json_setting(db, "KNOWN_OUS")
        current = load_json_setting(db, "OU_MAPPING")
        seed, unknown = build_seed(tree)
        merged = {**seed, **current}

        print(f"First-level organization OU candidates: {len(seed) + len(unknown)}")
        print(f"Mapped OU variants: {len(seed)}")
        print(f"Canonical organizations: {len({item['org'] for item in seed.values()})}")
        print(f"Existing entries preserved: {len(current)}")
        if unknown:
            print("Unmapped first-level OU:")
            for ou in unknown:
                print(f"  - {ou}")

        if not args.apply:
            print("Preview only. Run again with --apply to save the mapping.")
            return 0

        settings_manager.set_setting(db, "OU_MAPPING", json.dumps(merged, ensure_ascii=False))
    finally:
        db.close()

    apply_ou_mapping_to_users_bg(merged)
    db = SessionLocal()
    try:
        assigned_users = db.query(User).filter(User.organization.isnot(None)).count()
    finally:
        db.close()
    print(f"Saved OU_MAPPING entries: {len(merged)}")
    print(f"Users with assigned organization: {assigned_users}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
