import json
import asyncio
import logging
from typing import Dict, Set
from fastapi import WebSocket
from prometheus_client import Gauge
from app.core.redis import async_redis_client

logger = logging.getLogger(__name__)

WS_ACTIVE_CONNECTIONS = Gauge(
    "smart_contacts_active_websockets",
    "Total active WebSocket connections (tabs)"
)
WS_ONLINE_USERS = Gauge(
    "smart_contacts_unique_online_users",
    "Total unique online users with open WebSockets"
)


def _get_global_active_websockets_count() -> float:
    """Returns total sum of active websocket tabs across all users."""
    try:
        from app.core.redis import redis_client
        tab_counts = redis_client.hgetall("ws_user_tab_counts")
        return float(sum(int(v) for v in tab_counts.values() if int(v) > 0))
    except Exception:
        return 0.0


def _get_global_unique_online_users_count() -> float:
    """
    Returns count of unique users who have >= 1 active websocket tab.
    Also reconciles global_presence to clean up any orphan stale keys.
    """
    try:
        from app.core.redis import redis_client
        tab_counts = redis_client.hgetall("ws_user_tab_counts")
        active_users = [u for u, v in tab_counts.items() if int(v) > 0]
        
        # Self-healing reconciliation: remove orphan users from global_presence
        try:
            active_set = set(active_users)
            presence = redis_client.hgetall("global_presence")
            stale_keys = [u for u in presence.keys() if u not in active_set]
            if stale_keys:
                redis_client.hdel("global_presence", *stale_keys)
        except Exception:
            pass

        return float(len(active_users))
    except Exception:
        return 0.0


WS_ACTIVE_CONNECTIONS.set_function(_get_global_active_websockets_count)
WS_ONLINE_USERS.set_function(_get_global_unique_online_users_count)


class ConnectionManager:
    def __init__(self):
        # Local connections for this worker process: user_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis_channel = "system_events"
        self.pubsub = async_redis_client.pubsub()
        self.listener_task = None

    async def connect(self, websocket: WebSocket, user_id: str) -> int:
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        # Start listening to Redis if not already started
        if self.listener_task is None or self.listener_task.done():
            self.listener_task = asyncio.create_task(self._listen_to_redis())

        try:
            global_tabs = await async_redis_client.hincrby("ws_user_tab_counts", user_id, 1)
        except Exception:
            global_tabs = len(self.active_connections[user_id])

        logger.info(
            f"User {user_id} connected to local WS (local tabs: {len(self.active_connections[user_id])}, "
            f"global tabs: {global_tabs})."
        )
        return int(global_tabs)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> int:
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} disconnected from local WS (all local tabs closed).")
            else:
                logger.info(
                    f"User {user_id} closed one local WS connection "
                    f"(remaining local tabs: {len(self.active_connections[user_id])})."
                )

        try:
            global_tabs = await async_redis_client.hincrby("ws_user_tab_counts", user_id, -1)
            if global_tabs <= 0:
                await async_redis_client.hdel("ws_user_tab_counts", user_id)
                await async_redis_client.hdel("global_presence", user_id)
                global_tabs = 0
        except Exception:
            global_tabs = len(self.active_connections.get(user_id, set()))
            if global_tabs <= 0:
                try:
                    await async_redis_client.hdel("global_presence", user_id)
                except Exception:
                    pass

        return int(global_tabs)

    async def broadcast_status(self, user_id: str, status: str):
        """
        Publish the status change to Redis so all workers receive it.
        status should be 'online', 'away', or 'offline'.
        """
        if status == "offline":
            await async_redis_client.hdel("global_presence", user_id)
        else:
            await async_redis_client.hset("global_presence", user_id, status)

        message = json.dumps({"type": "presence_update", "user_id": user_id, "status": status})
        await async_redis_client.publish(self.redis_channel, message)

    async def broadcast_event(self, event_data: dict):
        """Publish a generic event to Redis so all workers and clients receive it."""
        message = json.dumps(event_data)
        await async_redis_client.publish(self.redis_channel, message)

    async def send_full_state(self, websocket: WebSocket):
        """Send the current global presence state to a newly connected client"""
        global_presence = await async_redis_client.hgetall("global_presence")
        await websocket.send_json({"type": "full_state", "data": global_presence})

    async def _safe_send(self, ws: WebSocket, payload: dict):
        try:
            await ws.send_json(payload)
        except Exception as e:
            logger.error(f"Error sending WS message: {e}")

    async def _listen_to_redis(self):
        """Background task that listens to Redis and broadcasts to local connections."""
        while True:
            try:
                self.pubsub = async_redis_client.pubsub()
                await self.pubsub.subscribe(self.redis_channel)
                async for message in self.pubsub.listen():
                    if message["type"] == "message":
                        data = json.loads(message["data"])
                        if self.active_connections:
                            snapshot = [
                                ws
                                for ws_set in list(self.active_connections.values())
                                for ws in list(ws_set)
                            ]
                            if snapshot:
                                tasks = [self._safe_send(ws, data) for ws in snapshot]
                                await asyncio.gather(*tasks, return_exceptions=True)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Redis PubSub listener error: {e}. Reconnecting in 5 seconds...")
                await asyncio.sleep(5)


manager = ConnectionManager()
