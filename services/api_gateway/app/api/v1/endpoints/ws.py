from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
from jose import jwt, JWTError
from app.core.config import settings
from app.core.websocket import manager
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

async def get_ws_user_guid(websocket: WebSocket) -> Optional[str]:
    # Try cookie first
    token = websocket.cookies.get("access_token")
    if not token:
        # Try authorization header (for non-browser clients)
        auth_header = websocket.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        # Try query param as a fallback
        token = websocket.query_params.get("token")
        
    if not token:
        return None
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_guid = payload.get("sub")
        return user_guid
    except JWTError:
        return None

@router.websocket("/presence")
async def websocket_presence(websocket: WebSocket):
    user_id = await get_ws_user_guid(websocket)
    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    
    # Send full current state
    await manager.send_full_state(websocket)
    
    # Broadcast to others that this user is online
    await manager.broadcast_status(user_id, "online")

    try:
        while True:
            # Wait for messages from the client (e.g., {"action": "set_presence", "status": "away"})
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                if data.get("action") == "set_presence":
                    status = data.get("status")
                    if status in ["online", "away"]:
                        await manager.broadcast_status(user_id, status)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        # Broadcast offline
        await manager.broadcast_status(user_id, "offline")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id)
        await manager.broadcast_status(user_id, "offline")
