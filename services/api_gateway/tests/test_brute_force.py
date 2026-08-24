import pytest
import json
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.core.redis import (
    check_brute_force_block,
    record_failed_login,
    is_brute_force_blocked,
    reset_brute_force,
    decrement_brute_force,
    get_security_incidents,
    manual_block_ip,
    manual_unblock_ip,
    TRACKED_IPS_SET
)
from app.services.auth_service import AuthService
from app.core.config import settings

def test_record_failed_login_allowed_attempts(mocker):
    """
    Tests that the first 5 failed attempts are allowed (no block).
    """
    mock_redis = mocker.patch("app.core.redis.redis_client")
    mock_redis.eval.return_value = [0, 0, 1]

    is_blocked, retry_after, is_perm = record_failed_login("192.168.1.100", sam_account="user1")
    assert is_blocked is False
    assert retry_after == 0
    assert is_perm is False

def test_record_failed_login_progressive_tiers(mocker):
    """
    Tests that exceeding attempts triggers progressive ban times.
    """
    mock_redis = mocker.patch("app.core.redis.redis_client")

    expected_tiers = [180, 360, 720, 1440, 2880, 3600]

    for ban_sec in expected_tiers:
        mock_redis.eval.return_value = [1, ban_sec, 6]
        is_blocked, retry_after, is_perm = record_failed_login("192.168.1.100", sam_account="user1")
        assert is_blocked is True
        assert retry_after == ban_sec
        assert is_perm is False

def test_record_failed_login_permanent(mocker):
    """
    Tests that reaching permanent threshold triggers permanent ban.
    """
    mock_redis = mocker.patch("app.core.redis.redis_client")
    mock_redis.eval.return_value = [2, -1, 15]

    is_blocked, retry_after, is_perm = record_failed_login("192.168.1.100", sam_account="bad_actor")
    assert is_blocked is True
    assert is_perm is True
    assert retry_after == -1

def test_login_brute_force_temporary_raises_429(mocker, db_session):
    """
    Tests that AuthService.login raises HTTP 429 when IP is temporarily blocked with Russian message and Retry-After.
    """
    mocker.patch("app.services.auth_service.check_brute_force_block", return_value=(True, 180, False))
    
    with pytest.raises(HTTPException) as exc_info:
        AuthService.login(db_session, "some_user", "wrong_pass", "10.0.0.1")
    
    assert exc_info.value.status_code == 429
    assert "3 мин" in exc_info.value.detail
    assert "Попробуйте через 3 мин" in exc_info.value.detail
    assert exc_info.value.headers.get("Retry-After") == "180"

def test_login_brute_force_permanent_raises_429(mocker, db_session):
    """
    Tests that AuthService.login raises HTTP 429 on permanent ban with HelpDesk and phone 49-87.
    """
    mocker.patch("app.services.auth_service.check_brute_force_block", return_value=(True, -1, True))
    
    with pytest.raises(HTTPException) as exc_info:
        AuthService.login(db_session, "some_user", "wrong_pass", "10.0.0.1")
    
    assert exc_info.value.status_code == 429
    assert "49-87" in exc_info.value.detail
    assert "HelpDesk" in exc_info.value.detail
    assert exc_info.value.headers.get("X-Permanent-Ban") == "true"

def test_reset_brute_force_cleans_keys_and_set(mocker):
    """
    Tests that reset_brute_force deletes block, attempts, meta, legacy keys and removes from tracked set.
    """
    mock_redis = mocker.patch("app.core.redis.redis_client")
    reset_brute_force("10.0.0.5")
    
    mock_redis.delete.assert_called_once_with(
        "brute_force:block:10.0.0.5",
        "brute_force:attempts:10.0.0.5",
        "brute_force:meta:10.0.0.5",
        "brute_force:10.0.0.5"
    )
    mock_redis.srem.assert_called_once_with(TRACKED_IPS_SET, "10.0.0.5")

def test_get_security_incidents(mocker):
    """
    Tests get_security_incidents parsing and formatting.
    """
    mock_redis = mocker.patch("app.core.redis.redis_client")
    mock_redis.smembers.return_value = {"192.168.1.10", "192.168.1.20"}
    
    def mock_get(key):
        if "192.168.1.10" in key:
            if "attempts" in key: return "16"
            if "block" in key: return "permanent"
            if "meta" in key: return json.dumps({"last_sam": "bad_user", "last_attempt_at": "2026-08-21T11:00:00Z", "is_permanent": True})
        if "192.168.1.20" in key:
            if "attempts" in key: return "6"
            if "block" in key: return "temp"
            if "meta" in key: return json.dumps({"last_sam": "normal_user", "last_attempt_at": "2026-08-21T11:05:00Z", "is_permanent": False})
        return None
        
    def mock_ttl(key):
        if "192.168.1.20" in key: return 180
        return -1

    mock_redis.get.side_effect = mock_get
    mock_redis.ttl.side_effect = mock_ttl

    incidents = get_security_incidents()
    assert len(incidents) == 2
    
    perm_incident = next(i for i in incidents if i["ip"] == "192.168.1.10")
    assert perm_incident["is_permanent"] is True
    assert perm_incident["attempts"] == 16
    assert perm_incident["last_sam"] == "bad_user"

    temp_incident = next(i for i in incidents if i["ip"] == "192.168.1.20")
    assert temp_incident["is_permanent"] is False
    assert temp_incident["is_blocked"] is True
    assert temp_incident["retry_after"] == 180
