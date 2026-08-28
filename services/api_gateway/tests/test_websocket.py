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
    remaining = await manager.disconnect(user_id, ws1)
    assert user_id in manager.active_connections
    assert len(manager.active_connections[user_id]) == 1
    assert ws2 in manager.active_connections[user_id]
    assert ws1 not in manager.active_connections[user_id]
    assert remaining == 1

@pytest.mark.asyncio
async def test_disconnect_last_tab_removes_user():
    manager = ConnectionManager()
    ws1 = MagicMock()
    ws1.accept = AsyncMock()

    user_id = "user-123"
    await manager.connect(ws1, user_id)
    assert user_id in manager.active_connections

    remaining = await manager.disconnect(user_id, ws1)
    assert user_id not in manager.active_connections
    assert remaining == 0

@pytest.mark.asyncio
async def test_safe_send_error_handling():
    manager = ConnectionManager()
    ws = MagicMock()
    ws.send_json = AsyncMock(side_effect=Exception("Connection closed"))

    # _safe_send should handle exception cleanly without throwing
    await manager._safe_send(ws, {"type": "ping"})

@pytest.mark.asyncio
async def test_multi_worker_global_tab_tracking():
    # Simulates two separate Uvicorn worker instances
    worker1_manager = ConnectionManager()
    worker2_manager = ConnectionManager()
    
    ws1 = MagicMock()
    ws1.accept = AsyncMock()
    ws2 = MagicMock()
    ws2.accept = AsyncMock()
    
    user_id = "user-multi-worker"
    
    # Tab 1 connects on Worker 1 -> global tabs = 1
    tabs1 = await worker1_manager.connect(ws1, user_id)
    assert tabs1 == 1
    
    # Tab 2 connects on Worker 2 -> global tabs = 2
    tabs2 = await worker2_manager.connect(ws2, user_id)
    assert tabs2 == 2
    
    # Tab 1 closes on Worker 1 -> Worker 1 has 0 local tabs, but global tabs = 1 (Worker 2 is still active!)
    remaining = await worker1_manager.disconnect(user_id, ws1)
    assert user_id not in worker1_manager.active_connections
    assert remaining == 1  # Should NOT trigger offline broadcast because tab on Worker 2 is still open!
    
    # Tab 2 closes on Worker 2 -> global tabs = 0 (now triggers offline broadcast)
    final_remaining = await worker2_manager.disconnect(user_id, ws2)
    assert user_id not in worker2_manager.active_connections
    assert final_remaining == 0
