from scripts.seed_ou_mapping import build_seed, merge_current_mapping


def test_build_seed_maps_ou_aliases():
    seed, unknown = build_seed({
        "CORPORATE_USERS": {
            "АО НТЗ ТЭМ-ПО": {},
            "АО НТЗ ТЭМПО": {},
        }
    })

    assert unknown == []
    assert seed["АО НТЗ ТЭМ-ПО"]["org"] == "АО НТЗ ТЭМ-ПО"
    assert seed["АО НТЗ ТЭМПО"]["org"] == "АО НТЗ ТЭМ-ПО"


def test_merge_removes_mapping_entries_absent_from_current_tree():
    seed = {"Current OU": {"org": "Generated"}}
    current = {
        "Current OU": {"org": "Manual"},
        "Old OU": {"org": "Old"},
    }

    merged, stale = merge_current_mapping(seed, current, {"Current OU"})

    assert merged == {"Current OU": {"org": "Manual"}}
    assert stale == {"Old OU"}

