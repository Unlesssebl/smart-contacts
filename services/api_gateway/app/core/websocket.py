import json
import asyncio
import logging
from typing import Dict
from fastapi import WebSocket
from app.core.redis import async_redis_client

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Local connections for this worker: object_guid -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        self.redis_channel = "system_events"
        self.pubsub = async_redis_client.pubsub()
        self.listener_task = None

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Start listening to Redis if not already started
        if self.listener_task is None or self.listener_task.done():
            self.listener_task = asyncio.create_task(self._listen_to_redis())
            
        logger.info(f"User {user_id} connected to local WS.")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected from local WS.")

    async def broadcast_status(self, user_id: str, status: str):
        """
        Publish the status change to Redis so all workers receive it.
        status should be 'online', 'away', or 'offline'.
        """
        # Save to a global redis hash to maintain the current state for newly connected clients
        if status == "offline":
            await async_redis_client.hdel("global_presence", user_id)
        else:
            await async_redis_client.hset("global_presence", user_id, status)
        
        message = json.dumps({"type": "presence_update", "user_id": user_id, "status": status})
        await async_redis_client.publish(self.redis_channel, message)

    async def broadcast_event(self, event_data: dict):
        """
        Publish a generic event to Redis so all workers and clients receive it.
        """
        message = json.dumps(event_data)
        await async_redis_client.publish(self.redis_channel, message)

    async def send_full_state(self, websocket: WebSocket):
        """Send the current global presence state to a newly connected client"""
        global_presence = await async_redis_client.hgetall("global_presence")
        await websocket.send_json({"type": "full_state", "data": global_presence})

    async def _listen_to_redis(self):
        """Background task that listens to Redis and broadcasts to local connections."""
        while True:
            try:
                self.pubsub = async_redis_client.pubsub()
                await self.pubsub.subscribe(self.redis_channel)
                async for message in self.pubsub.listen():
                    if message["type"] == "message":
                        data = json.loads(message["data"])
                        # Send to all local connections concurrently
                        if self.active_connections:
                            async def safe_send(ws: WebSocket, payload: dict):
                                try:
                                    await ws.send_json(payload)
                                except Exception as e:
                                    logger.error(f"Error sending WS message: {e}")
                            
                            tasks = [safe_send(ws, data) for ws in list(self.active_connections.values())]
                            await asyncio.gather(*tasks, return_exceptions=True)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Redis PubSub listener error: {e}. Reconnecting in 5 seconds...")
                await asyncio.sleep(5)

manager = ConnectionManager()
