from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt_handler import verify_token
from database.mongodb import DatabaseOperations
from models.user import User
from typing import Optional

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user"""
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = await DatabaseOperations.get_document("users", {"id": user_id})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clean up invalid data
    if user_data.get('status') == 'online':
        user_data['status'] = 'active'
    
    # Fix invalid datetime strings
    if user_data.get('last_active') == 'datetime.utcnow()':
        user_data['last_active'] = None
    
    return User(**user_data)

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    return current_user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    """Require admin or manager role"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required"
        )
    return current_user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    if not credentials:
        return None
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        return None
    
    user_data = await DatabaseOperations.get_document("users", {"id": user_id})
    if not user_data:
        return None
    
    # Clean up invalid data
    if user_data.get('status') == 'online':
        user_data['status'] = 'active'
    
    # Fix invalid datetime strings
    if user_data.get('last_active') == 'datetime.utcnow()':
        user_data['last_active'] = None
    
    return User(**user_data)