import pytest
from unittest.mock import AsyncMock, MagicMock
from app.core.websocket import ConnectionManager

@pytest.mark.asyncio
async def test_connect_multiple_tabs():
    manager = ConnectionManager()
    ws1 = MagicMock()
    ws1.accept = AsyncMock()
    ws2 = MagicMock()
    ws2.accept = AsyncMock()

    user_id = "user-123"
    await manager.connect(ws1, user_id)
    assert user_id in manager.active_connections
    assert len(manager.active_connections[user_id]) == 1
    assert ws1 in manager.active_connections[user_id]

    await manager.connect(ws2, user_id)
    assert len(manager.active_connections[user_id]) == 2
    assert ws1 in manager.active_connections[user_id]
    assert ws2 in manager.active_connections[user_id]

@pytest.mark.asyncio
async def test_disconnect_one_tab_keeps_user():
    manager = ConnectionManager()
    ws1 = MagicMock()
    ws1.accept = AsyncMock()
    ws2 = MagicMock()
    ws2.accept = AsyncMock()

    user_id = "user-123"
    await manager.connect(ws1, user_id)
    await manager.connect(ws2, user_id)

    # Disconnect first tab
    manager.disconnect(user_id, ws1)
    assert user_id in manager.active_connections
    assert len(manager.active_connections[user_id]) == 1
    assert ws2 in manager.active_connections[user_id]
    assert ws1 not in manager.active_connections[user_id]

@pytest.mark.asyncio
async def test_disconnect_last_tab_removes_user():
    manager = ConnectionManager()
    ws1 = MagicMock()
    ws1.accept = AsyncMock()

    user_id = "user-123"
    await manager.connect(ws1, user_id)
    assert user_id in manager.active_connections

    manager.disconnect(user_id, ws1)
    assert user_id not in manager.active_connections

@pytest.mark.asyncio
async def test_safe_send_error_handling():
    manager = ConnectionManager()
    ws = MagicMock()
    ws.send_json = AsyncMock(side_effect=Exception("Connection closed"))

    # _safe_send should handle exception cleanly without throwing
    await manager._safe_send(ws, {"type": "ping"})
