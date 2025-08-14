from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt_handler import verify_token
from database.mongodb import DatabaseOperations
from models.user import User, UserRole
from typing import Optional
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user with organization context"""
    try:
        payload = verify_token(credentials.credentials)
        if isinstance(payload, str):
            # Legacy token format - just user_id
            user_id = payload
            org_id = None
        else:
            # New token format with org context
            user_id = payload.get("user_id") or payload.get("sub")
            org_id = payload.get("org_id")
        
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
        
        # Verify organization context if provided in token
        if org_id and user_data.get("organization_id") != org_id:
            logger.warning(f"Organization mismatch for user {user_id}: token={org_id}, user={user_data.get('organization_id')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid organization context",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Clean up invalid data
        if user_data.get('status') == 'online':
            user_data['status'] = 'active'
        
        # Fix invalid datetime strings
        if user_data.get('last_active') == 'datetime.utcnow()':
            user_data['last_active'] = None
        
        # Ensure organization_id exists for backward compatibility
        if not user_data.get('organization_id'):
            # For existing users without organization_id, they need to be migrated
            logger.warning(f"User {user_id} has no organization_id - needs migration")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account needs to be migrated to organization structure. Please contact support."
            )
        
        return User(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    return current_user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role within the same organization"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_admin_or_manager(current_user: User = Depends(get_current_user)) -> User:
    """Require admin or manager role within the same organization"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required"
        )
    return current_user

async def get_organization_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require organization admin (owner or admin role)"""
    if not (current_user.role == UserRole.ADMIN or current_user.is_organization_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization administrator access required"
        )
    return current_user

async def validate_organization_access(
    resource_org_id: str,
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Validate that user can access resources from their organization only
    This is a critical security function to prevent cross-organization data access
    """
    if current_user.organization_id != resource_org_id:
        logger.warning(f"Cross-organization access attempt: user {current_user.id} from org {current_user.organization_id} trying to access org {resource_org_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: resource belongs to different organization"
        )
    return current_user

async def validate_same_organization_user(
    target_user_id: str,
    current_user: User = Depends(get_current_user)
) -> User:
    """Validate that target user is in the same organization"""
    target_user = await DatabaseOperations.get_document("users", {"id": target_user_id})
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if target_user["organization_id"] != current_user.organization_id:
        logger.warning(f"Cross-organization user access attempt: {current_user.id} trying to access user {target_user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: user belongs to different organization"
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