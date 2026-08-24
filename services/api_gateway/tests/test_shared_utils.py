import time
from shared.utils import format_phone, ttl_cache, apply_canonical_mapping, HOMOGLYPHS

def test_format_phone():
    # 4-digit internal phone
    assert format_phone("1234") == "12-34"
    assert format_phone(" 5678 ") == "56-78"

    # 11-digit mobile starting with 7 or 8
    assert format_phone("79991234567") == "+7 (999) 123-45-67"
    assert format_phone("89991234567") == "+7 (999) 123-45-67"
    assert format_phone("+7 (999) 123-45-67") == "+7 (999) 123-45-67"

    # 10-digit mobile
    assert format_phone("9991234567") == "+7 (999) 123-45-67"

    # Edge cases
    assert format_phone(None) is None
    assert format_phone("") is None
    assert format_phone("[]") is None
    assert format_phone("   ") is None
    assert format_phone("123") == "123"

def test_ttl_cache():
    call_count = 0

    @ttl_cache(ttl_seconds=0.2)
    def compute(x: int) -> int:
        nonlocal call_count
        call_count += 1
        return x * 2

    # First call - cache miss
    assert compute(5) == 10
    assert call_count == 1

    # Immediate second call - cache hit
    assert compute(5) == 10
    assert call_count == 1

    # Different arg - cache miss
    assert compute(6) == 12
    assert call_count == 2

    # Clear cache
    compute.cache_clear()
    assert compute(5) == 10
    assert call_count == 3

    # Wait for TTL expiration
    time.sleep(0.25)
    assert compute(5) == 10
    assert call_count == 4

def test_apply_canonical_mapping():
    mapping = {
        "ИТ отдел": "Отдел информационных технологий",
        "бухгалтерия": "Департамент бухгалтерского учета"
    }

    # Exact and case-insensitive matching
    assert apply_canonical_mapping("ИТ отдел", mapping) == "Отдел информационных технологий"
    assert apply_canonical_mapping("ит отдел", mapping) == "Отдел информационных технологий"
    assert apply_canonical_mapping("Бухгалтерия", mapping) == "Департамент бухгалтерского учета"

    # Composite paths
    composite = "Главное управление / ИТ отдел / Группа разработки"
    res = apply_canonical_mapping(composite, mapping)
    assert "Отдел информационных технологий" in res

    # Empty / unmapped
    assert apply_canonical_mapping(None, mapping) is None
    assert apply_canonical_mapping("", mapping) is None
    assert apply_canonical_mapping("Неизвестный отдел", mapping) == "Неизвестный отдел"
