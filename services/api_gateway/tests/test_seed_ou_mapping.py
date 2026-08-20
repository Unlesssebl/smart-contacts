from scripts.seed_ou_mapping import COLORS, build_seed, color_for, merge_current_mapping


def test_color_palette_is_expanded_and_deterministic():
    assert len(COLORS) >= 32
    assert len(set(COLORS)) == len(COLORS)
    assert color_for("АО НТЗ ТЭМ-ПО") == color_for("АО НТЗ ТЭМ-ПО")
    assert color_for("АО НТЗ ТЭМ-ПО") in COLORS


def test_build_seed_reuses_one_hashed_color_for_ou_aliases():
    seed, unknown = build_seed({
        "CORPORATE_USERS": {
            "АО НТЗ ТЭМ-ПО": {},
            "АО НТЗ ТЭМПО": {},
        }
    })

    assert unknown == []
    assert seed["АО НТЗ ТЭМ-ПО"]["org"] == "АО НТЗ ТЭМ-ПО"
    assert seed["АО НТЗ ТЭМ-ПО"]["color"] == seed["АО НТЗ ТЭМПО"]["color"]


def test_merge_removes_mapping_entries_absent_from_current_tree():
    seed = {"Current OU": {"org": "Generated", "color": "#ffffff"}}
    current = {
        "Current OU": {"org": "Manual", "color": "#000000"},
        "Old OU": {"org": "Old", "color": "#123456"},
    }

    merged, stale = merge_current_mapping(seed, current, {"Current OU"})

    assert merged == {"Current OU": {"org": "Manual", "color": "#000000"}}
    assert stale == {"Old OU"}
