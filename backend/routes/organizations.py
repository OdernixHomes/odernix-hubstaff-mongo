from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import re

from models.user import User, UserRole
from models.organization import (
    Organization, OrganizationCreate, OrganizationUpdate, OrganizationRegistration,
    OrganizationRegistrationResponse, OrganizationStats, OrganizationInvite,
    OrganizationAuditLog, OrganizationSecurityPolicy, OrganizationPlan, OrganizationStatus
)
from auth.dependencies import get_current_user, get_organization_admin
from auth.jwt_handler import create_access_token, hash_password
from database.mongodb import DatabaseOperations
from services.email import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.post("/register", response_model=OrganizationRegistrationResponse)
async def register_organization(
    registration_data: OrganizationRegistration,
    request: Request
):
    """
    Register a new organization with an admin user
    This is the ONLY way to create new organizations and admin users
    """
    try:
        # Validate terms acceptance
        if not registration_data.accept_terms or not registration_data.accept_privacy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must accept terms and conditions and privacy policy"
            )
        
        # Validate domain uniqueness (critical for security isolation)
        existing_org = await DatabaseOperations.get_document(
            "organizations", 
            {"domain": registration_data.organization_domain.lower()}
        )
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization domain already exists. Please choose a different domain."
            )
        
        # Validate admin email uniqueness across ALL organizations
        existing_user = await DatabaseOperations.get_document(
            "users", 
            {"email": registration_data.admin_email}
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already registered. Please use a different email or login to your existing account."
            )
        
        # Validate password strength
        if not _validate_password_strength(registration_data.admin_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers"
            )
        
        # Create organization first
        organization = Organization(
            name=registration_data.organization_name,
            domain=registration_data.organization_domain.lower(),
            email=registration_data.admin_email,
            plan=registration_data.plan,
            status=OrganizationStatus.TRIAL,
            trial_ends_at=datetime.utcnow() + timedelta(days=14)  # 14-day trial
        )
        
        org_dict = organization.model_dump()
        await DatabaseOperations.create_document("organizations", org_dict)
        
        # Hash admin password
        hashed_password = hash_password(registration_data.admin_password)
        
        # Create admin user
        from models.user import User, UserRole
        admin_user = User(
            name=registration_data.admin_name,
            email=registration_data.admin_email,
            role=UserRole.ADMIN,
            organization_id=organization.id,
            is_organization_owner=True,
            email_verified=True,  # Auto-verify for organization owners
            email_verified_at=datetime.utcnow()
        )
        
        admin_dict = admin_user.model_dump()
        admin_dict["password"] = hashed_password
        await DatabaseOperations.create_document("users", admin_dict)
        
        # Update organization with owner_id
        await DatabaseOperations.update_document(
            "organizations",
            {"id": organization.id},
            {"$set": {"owner_id": admin_user.id, "current_users": 1}}
        )
        
        # Create default security policy for the organization
        security_policy = OrganizationSecurityPolicy(organization_id=organization.id)
        await DatabaseOperations.create_document("organization_security_policies", security_policy.model_dump())
        
        # Log organization creation
        await _log_organization_activity(
            organization.id,
            admin_user.id,
            "organization_created",
            request,
            {"organization_name": organization.name, "plan": registration_data.plan.value}
        )
        
        # Create access token for immediate login
        access_token = create_access_token(
            data={"sub": admin_user.email, "user_id": admin_user.id, "org_id": organization.id}
        )
        
        logger.info(f"New organization registered: {organization.name} ({organization.domain})")
        
        return OrganizationRegistrationResponse(
            organization_id=organization.id,
            organization_name=organization.name,
            organization_domain=organization.domain,
            admin_user_id=admin_user.id,
            access_token=access_token,
            message=f"Organization '{organization.name}' created successfully! You have been automatically logged in as the administrator."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Organization registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register organization"
        )

@router.get("/me")
async def get_my_organization(current_user: User = Depends(get_current_user)):
    """Get current user's organization details"""
    try:
        organization = await DatabaseOperations.get_document(
            "organizations",
            {"id": current_user.organization_id}
        )
        
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        return organization
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get organization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization details"
        )

@router.put("/me")
async def update_my_organization(
    update_data: OrganizationUpdate,
    current_user: User = Depends(get_organization_admin)
):
    """Update current user's organization (admin only)"""
    try:
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        
        await DatabaseOperations.update_document(
            "organizations",
            {"id": current_user.organization_id},
            {"$set": update_dict}
        )
        
        return {"message": "Organization updated successfully"}
        
    except Exception as e:
        logger.error(f"Update organization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization"
        )

@router.get("/stats")
async def get_organization_stats(
    current_user: User = Depends(get_organization_admin)
):
    """Get organization statistics (admin only)"""
    try:
        # Get user count
        total_users = await DatabaseOperations.count_documents(
            "users", 
            {"organization_id": current_user.organization_id}
        )
        
        active_users = await DatabaseOperations.count_documents(
            "users", 
            {"organization_id": current_user.organization_id, "status": "active"}
        )
        
        # Get project count
        total_projects = await DatabaseOperations.count_documents(
            "projects", 
            {"created_by": {"$in": await _get_organization_user_ids(current_user.organization_id)}}
        )
        
        # Get time tracking stats
        user_ids = await _get_organization_user_ids(current_user.organization_id)
        pipeline = [
            {"$match": {"user_id": {"$in": user_ids}}},
            {"$group": {"_id": None, "total_time": {"$sum": "$duration"}}}
        ]
        
        time_stats = await DatabaseOperations.aggregate("time_entries", pipeline)
        total_time_seconds = time_stats[0]["total_time"] if time_stats else 0
        total_time_hours = total_time_seconds / 3600
        
        # Get organization details for plan limits
        organization = await DatabaseOperations.get_document(
            "organizations",
            {"id": current_user.organization_id}
        )
        
        stats = OrganizationStats(
            total_users=total_users,
            active_users=active_users,
            total_projects=total_projects,
            total_time_tracked=round(total_time_hours, 2),
            storage_used_gb=0.0,  # Calculate actual storage usage
            plan_limits={
                "max_users": organization.get("max_users", 5),
                "max_projects": organization.get("max_projects", 10),
                "storage_limit_gb": organization.get("storage_limit_gb", 5)
            }
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Get organization stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization statistics"
        )

@router.get("/members")
async def get_organization_members(
    current_user: User = Depends(get_current_user)
):
    """Get organization members"""
    try:
        # Only allow admins and managers to see all members
        if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view organization members"
            )
        
        members = await DatabaseOperations.get_documents(
            "users",
            {"organization_id": current_user.organization_id},
            projection={"password": 0}  # Exclude password hash
        )
        
        return {"members": members}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get organization members error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization members"
        )

@router.post("/invite")
async def invite_user_to_organization(
    invite_data: OrganizationInvite,
    request: Request,
    current_user: User = Depends(get_organization_admin)
):
    """Invite a user to the organization (admin only)"""
    try:
        # Check if user already exists in ANY organization
        existing_user = await DatabaseOperations.get_document(
            "users",
            {"email": invite_data.email}
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists in another organization"
            )
        
        # Check organization user limits
        organization = await DatabaseOperations.get_document(
            "organizations",
            {"id": current_user.organization_id}
        )
        
        if organization["current_users"] >= organization["max_users"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization has reached maximum user limit"
            )
        
        # Create invitation
        from models.user import Invitation, UserRole
        invitation = Invitation(
            email=invite_data.email,
            role=UserRole(invite_data.role),
            organization_id=current_user.organization_id,
            invited_by=current_user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            organization_name=organization["name"]
        )
        
        await DatabaseOperations.create_document("invitations", invitation.model_dump())
        
        # Send invitation email
        try:
            await email_service.send_organization_invitation(
                invite_data.email,
                organization["name"],
                current_user.name,
                invitation.token,
                invite_data.message
            )
        except Exception as e:
            logger.error(f"Failed to send invitation email: {e}")
            # Don't fail the whole operation if email fails
        
        # Log invitation
        await _log_organization_activity(
            current_user.organization_id,
            current_user.id,
            "user_invited",
            request,
            {"invited_email": invite_data.email, "role": invite_data.role}
        )
        
        return {"message": f"Invitation sent to {invite_data.email}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invite user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation"
        )

@router.get("/audit-log")
async def get_organization_audit_log(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_organization_admin)
):
    """Get organization audit log (admin only)"""
    try:
        audit_logs = await DatabaseOperations.get_documents(
            "organization_audit_logs",
            {"organization_id": current_user.organization_id},
            sort=[("timestamp", -1)],
            limit=limit,
            skip=offset
        )
        
        total_count = await DatabaseOperations.count_documents(
            "organization_audit_logs",
            {"organization_id": current_user.organization_id}
        )
        
        return {
            "audit_logs": audit_logs,
            "total_count": total_count,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Get audit log error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit log"
        )

# Helper functions
def _validate_password_strength(password: str) -> bool:
    """Validate password meets minimum security requirements"""
    if len(password) < 8:
        return False
    
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    
    return has_upper and has_lower and has_digit

async def _get_organization_user_ids(organization_id: str) -> List[str]:
    """Get all user IDs for an organization"""
    users = await DatabaseOperations.get_documents(
        "users",
        {"organization_id": organization_id},
        projection={"id": 1}
    )
    return [user["id"] for user in users]

async def _log_organization_activity(
    organization_id: str,
    user_id: Optional[str],
    action: str,
    request: Request,
    details: dict = {}
):
    """Log organization activity for audit trail"""
    try:
        audit_log = OrganizationAuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details=details
        )
        
        await DatabaseOperations.create_document("organization_audit_logs", audit_log.model_dump())
    except Exception as e:
        logger.error(f"Failed to log organization activity: {e}")
        # Don't fail the main operation if logging fails