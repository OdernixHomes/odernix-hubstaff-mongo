from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from websocket.manager import manager
from auth.jwt_handler import verify_token
from database.mongodb import DatabaseOperations
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_user_from_token(token: str):
    """Get user from WebSocket token"""
    user_id = verify_token(token)
    if not user_id:
        return None
    
    user_data = await DatabaseOperations.get_document("users", {"id": user_id})
    if not user_data:
        return None
    
    return user_data

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time communication"""
    user_data = await get_user_from_token(token)
    
    if not user_data:
        await websocket.close(code=1000, reason="Invalid token")
        return
    
    user_id = user_data["id"]
    
    try:
        await manager.connect(websocket, user_id)
        
        # Update user status to online in database
        await DatabaseOperations.update_document(
            "users",
            {"id": user_id},
            {"status": "active", "last_active": datetime.utcnow()}
        )
        
        # Send initial data
        await manager.send_personal_message({
            "type": "connection_established",
            "data": {
                "user_id": user_id,
                "online_users": manager.get_online_users()
            }
        }, user_id)
        
        while True:
            # Listen for incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "data": {"timestamp": datetime.utcnow().isoformat()}
                }, user_id)
            
            elif message.get("type") == "activity_update":
                # Broadcast activity update to team
                await manager.broadcast_team_activity({
                    "user_id": user_id,
                    "activity": message.get("data", {})
                })
            
            elif message.get("type") == "time_entry_update":
                # Broadcast time entry update
                await manager.broadcast_time_entry_update(
                    user_id, 
                    message.get("data", {})
                )
            
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
        
        # Update user status to offline in database
        await DatabaseOperations.update_document(
            "users",
            {"id": user_id},
            {"status": "offline"}
        )
        
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(user_id)

@router.get("/online-users")
async def get_online_users():
    """Get list of online users"""
    try:
        online_user_ids = manager.get_online_users()
        
        # Get user details
        users_data = []
        for user_id in online_user_ids:
            user_data = await DatabaseOperations.get_document("users", {"id": user_id})
            if user_data:
                users_data.append({
                    "id": user_data["id"],
                    "name": user_data["name"],
                    "status": "online"
                })
        
        return {"online_users": users_data}
        
    except Exception as e:
        logger.error(f"Get online users error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get online users")