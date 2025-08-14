from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from models.user import User, UserUpdate, UserResponse, UserRole
from auth.dependencies import get_current_user, require_admin_or_manager, validate_same_organization_user
from database.mongodb import DatabaseOperations
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = None,
    current_user: User = Depends(get_current_user)
):
    """Get users from current user's organization only (organization isolation)"""
    try:
        # CRITICAL SECURITY: Only return users from same organization
        query = {"organization_id": current_user.organization_id}
        
        if role:
            query["role"] = role
        
        users_data = await DatabaseOperations.get_documents(
            "users", 
            query, 
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit,
            projection={"password": 0}  # Exclude password field
        )
        
        return [UserResponse(**user) for user in users_data]
        
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
    """Get user by ID (with organization isolation)"""
    try:
        # Users can only see their own profile unless they're admin/manager
        if user_id != current_user.id and current_user.role not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # CRITICAL SECURITY: Only allow access to users from same organization
        user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": user_id, "organization_id": current_user.organization_id}
        )
        if not user_data:
            # Don't reveal if user exists in different organization
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
    """Update current user profile with organization context"""
    try:
        update_data = user_update.dict(exclude_unset=True)
        
        # Users can't change their own role or organization
        forbidden_fields = ["role", "organization_id", "is_organization_owner"]
        for field in forbidden_fields:
            if field in update_data:
                del update_data[field]
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # CRITICAL SECURITY: Include organization_id in query to prevent cross-org updates
            await DatabaseOperations.update_document(
                "users",
                {"id": current_user.id, "organization_id": current_user.organization_id},
                {"$set": update_data}
            )
        
        # Get updated user with organization validation
        updated_user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": current_user.id, "organization_id": current_user.organization_id}
        )
        
        if not updated_user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(**{k: v for k, v in updated_user_data.items() if k != "password"})
        
    except HTTPException:
        raise
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
    """Update user (admin/manager only, same organization)"""
    try:
        # CRITICAL SECURITY: Only allow updates to users in same organization
        user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": user_id, "organization_id": current_user.organization_id}
        )
        if not user_data:
            # Don't reveal if user exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent modification of organization owner by non-owners
        if user_data.get("is_organization_owner") and not current_user.is_organization_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owner can modify organization owner account"
            )
        
        update_data = user_update.dict(exclude_unset=True)
        
        # Prevent changing organization-critical fields
        forbidden_fields = ["organization_id", "is_organization_owner"]
        for field in forbidden_fields:
            if field in update_data:
                del update_data[field]
        
        # Only organization owner can modify admin roles
        if "role" in update_data and update_data["role"] == "admin":
            if not current_user.is_organization_owner:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only organization owner can assign admin roles"
                )
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # CRITICAL SECURITY: Include organization_id in update query
            await DatabaseOperations.update_document(
                "users",
                {"id": user_id, "organization_id": current_user.organization_id},
                {"$set": update_data}
            )
        
        # Get updated user with organization validation
        updated_user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": user_id, "organization_id": current_user.organization_id}
        )
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
    """Delete user (admin/manager only, same organization)"""
    try:
        # Can't delete self
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete yourself"
            )
        
        # CRITICAL SECURITY: Only allow deletion of users in same organization
        user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": user_id, "organization_id": current_user.organization_id}
        )
        if not user_data:
            # Don't reveal if user exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent deletion of organization owner
        if user_data.get("is_organization_owner"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete organization owner. Transfer ownership first."
            )
        
        # Only organization owner or admin can delete other admins
        if user_data.get("role") == "admin" and not (current_user.is_organization_owner or current_user.role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owner or admin can delete admin users"
            )
        
        # CRITICAL SECURITY: Include organization_id in deletion query
        result = await DatabaseOperations.delete_document(
            "users", 
            {"id": user_id, "organization_id": current_user.organization_id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update organization user count
        await DatabaseOperations.update_document(
            "organizations",
            {"id": current_user.organization_id},
            {"$inc": {"current_users": -1}}
        )
        
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
    """Get team statistics (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only count users from same organization
        org_filter = {"organization_id": current_user.organization_id}
        
        # Total users in organization
        total_users = await DatabaseOperations.count_documents("users", org_filter)
        
        # Active users (online or active status) in organization
        active_filter = {
            "organization_id": current_user.organization_id,
            "status": {"$in": ["active", "online"]}
        }
        active_users = await DatabaseOperations.count_documents("users", active_filter)
        
        # Users by role in organization
        pipeline = [
            {"$match": {"organization_id": current_user.organization_id}},
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