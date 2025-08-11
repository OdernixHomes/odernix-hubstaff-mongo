from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from models.user import User, UserUpdate, UserResponse, UserRole
from auth.dependencies import get_current_user, require_admin_or_manager
from database.mongodb import DatabaseOperations
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all users (all authenticated users can view team members)"""
    try:
        query = {}
        if role:
            query["role"] = role
        
        users_data = await DatabaseOperations.get_documents(
            "users", 
            query, 
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit
        )
        
        return [UserResponse(**{k: v for k, v in user.items() if k != "password"}) for user in users_data]
        
    except Exception as e:
        logger.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get users"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(**current_user.model_dump())

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user by ID"""
    try:
        # Users can only see their own profile unless they're admin/manager
        if user_id != current_user.id and current_user.role not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        user_data = await DatabaseOperations.get_document("users", {"id": user_id})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(**{k: v for k, v in user_data.items() if k != "password"})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user"
        )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        update_data = user_update.dict(exclude_unset=True)
        
        # Users can't change their own role
        if "role" in update_data:
            del update_data["role"]
        
        if update_data:
            await DatabaseOperations.update_document(
                "users",
                {"id": current_user.id},
                update_data
            )
        
        # Get updated user
        updated_user_data = await DatabaseOperations.get_document("users", {"id": current_user.id})
        return UserResponse(**{k: v for k, v in updated_user_data.items() if k != "password"})
        
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_admin_or_manager)
):
    """Update user (admin/manager only)"""
    try:
        user_data = await DatabaseOperations.get_document("users", {"id": user_id})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        update_data = user_update.dict(exclude_unset=True)
        
        if update_data:
            await DatabaseOperations.update_document(
                "users",
                {"id": user_id},
                update_data
            )
        
        # Get updated user
        updated_user_data = await DatabaseOperations.get_document("users", {"id": user_id})
        return UserResponse(**{k: v for k, v in updated_user_data.items() if k != "password"})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin_or_manager)
):
    """Delete user (admin/manager only)"""
    try:
        # Can't delete self
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete yourself"
            )
        
        user_data = await DatabaseOperations.get_document("users", {"id": user_id})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        await DatabaseOperations.delete_document("users", {"id": user_id})
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

@router.get("/team/stats")
async def get_team_stats(current_user: User = Depends(get_current_user)):
    """Get team statistics"""
    try:
        # Total users
        total_users = await DatabaseOperations.count_documents("users")
        
        # Active users (online or active status)
        active_users = await DatabaseOperations.count_documents("users", {"status": {"$in": ["active", "online"]}})
        
        # Users by role
        pipeline = [
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ]
        role_stats = await DatabaseOperations.aggregate("users", pipeline)
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "users_by_role": {stat["_id"]: stat["count"] for stat in role_stats}
        }
        
    except Exception as e:
        logger.error(f"Get team stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get team statistics"
        )