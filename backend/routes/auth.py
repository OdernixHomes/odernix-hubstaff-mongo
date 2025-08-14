from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from datetime import timedelta, datetime
from models.user import UserCreate, UserLogin, UserResponse, User, InviteUser, Invitation, AcceptInvite, ForgotPassword, ResetPassword, PasswordResetToken
from auth.jwt_handler import create_access_token, create_refresh_token, hash_password, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from auth.dependencies import get_current_user, require_admin_or_manager, validate_same_organization_user
from database.mongodb import DatabaseOperations
from services.email import email_service
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", deprecated=True)
async def register():
    """DEPRECATED: Direct registration is no longer allowed for security reasons.
    
    Use /organizations/register to create a new organization with an admin user.
    Existing organization admins should use /invite to add new users.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "Direct user registration is disabled for security reasons.",
            "message": "To create a new organization, use POST /organizations/register",
            "instructions": [
                "New organizations: Use /organizations/register endpoint",
                "Adding users to existing org: Ask your admin to send an invitation",
                "Admins: Use /invite endpoint to invite new users"
            ]
        }
    )

@router.post("/login", response_model=dict)
async def login(user_credentials: UserLogin):
    """Login user with organization context"""
    try:
        # Get user
        user_data = await DatabaseOperations.get_document("users", {"email": user_credentials.email})
        if not user_data or not verify_password(user_credentials.password, user_data["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Ensure user has organization_id (security check)
        if not user_data.get('organization_id'):
            logger.error(f"User {user_data.get('id')} missing organization_id")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account needs to be migrated to organization structure. Please contact support."
            )
        
        user = User(**{k: v for k, v in user_data.items() if k != "password"})
        
        # Update last active
        await DatabaseOperations.update_document(
            "users", 
            {"id": user.id, "organization_id": user.organization_id},  # Security: ensure org context
            {"$set": {"status": "active", "last_active": datetime.utcnow()}}
        )
        
        # Create tokens with organization context (CRITICAL for security)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "org_id": user.organization_id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user.id, "org_id": user.organization_id}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse(**user.model_dump())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user with organization context"""
    try:
        # Update user status with organization context for security
        await DatabaseOperations.update_document(
            "users", 
            {"id": current_user.id, "organization_id": current_user.organization_id}, 
            {"$set": {"status": "offline", "last_active": datetime.utcnow()}}
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(**current_user.model_dump())

@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str):
    """Refresh access token with organization context"""
    try:
        from auth.jwt_handler import verify_token
        
        payload = verify_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Extract user and organization info from token
        if isinstance(payload, str):
            # Legacy token - needs migration
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token format outdated. Please log in again."
            )
        else:
            user_id = payload.get("user_id")
            org_id = payload.get("org_id")
            email = payload.get("sub")
        
        if not user_id or not org_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
        
        # Verify user still exists and belongs to organization
        user_data = await DatabaseOperations.get_document(
            "users", 
            {"id": user_id, "organization_id": org_id}
        )
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or organization mismatch"
            )
        
        # Create new access token with organization context
        access_token = create_access_token(
            data={"sub": email, "user_id": user_id, "org_id": org_id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

@router.post("/invite", deprecated=True)
async def invite_user():
    """DEPRECATED: Use /organizations/invite instead.
    
    This endpoint has been moved to maintain organization security boundaries.
    Only organization admins can invite users to their specific organization.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "This endpoint has been deprecated for security reasons.",
            "message": "Use POST /organizations/invite to invite users to your organization",
            "instructions": [
                "Organization admins: Use /organizations/invite endpoint",
                "This ensures users are invited to the correct organization",
                "Prevents cross-organization security vulnerabilities"
            ]
        }
    )

@router.post("/accept-invite", response_model=dict)
async def accept_invitation(accept_data: AcceptInvite):
    """Accept an organization invitation and create user account"""
    try:
        # Find invitation with organization context
        invitation_data = await DatabaseOperations.get_document("invitations", {"token": accept_data.token})
        if not invitation_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )
        
        invitation = Invitation(**invitation_data)
        
        # Check if invitation is expired
        if datetime.utcnow() > invitation.expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired"
            )
        
        # Check if invitation is already accepted
        if invitation.accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has already been accepted"
            )
        
        # CRITICAL SECURITY: Check if user already exists in ANY organization
        existing_user = await DatabaseOperations.get_document("users", {"email": invitation.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists in another organization"
            )
        
        # Validate organization still exists and is active
        organization = await DatabaseOperations.get_document(
            "organizations", 
            {"id": invitation.organization_id}
        )
        if not organization or organization.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization is not available for new users"
            )
        
        # Hash password
        hashed_password = hash_password(accept_data.password)
        
        # Create user with organization context (CRITICAL)
        user = User(
            name=accept_data.name,
            email=invitation.email,
            role=invitation.role,
            organization_id=invitation.organization_id,  # CRITICAL: Set organization
            email_verified=True,  # Auto-verify invited users
            email_verified_at=datetime.utcnow()
        )
        
        user_dict = user.model_dump()
        user_dict["password"] = hashed_password
        
        await DatabaseOperations.create_document("users", user_dict)
        
        # Update organization user count
        await DatabaseOperations.update_document(
            "organizations",
            {"id": invitation.organization_id},
            {"$inc": {"current_users": 1}}
        )
        
        # Mark invitation as accepted
        await DatabaseOperations.update_document(
            "invitations",
            {"token": accept_data.token},
            {"$set": {"accepted": True, "accepted_at": datetime.utcnow()}}
        )
        
        # Create tokens with organization context (CRITICAL)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "org_id": user.organization_id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user.id, "org_id": user.organization_id}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse(**user.model_dump()),
            "organization": {
                "id": organization["id"],
                "name": organization["name"],
                "domain": organization["domain"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Accept invitation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation"
        )

@router.get("/invitations", deprecated=True)
async def get_invitations():
    """DEPRECATED: Use /organizations/audit-log instead.
    
    Organization invitations are now managed through organization-specific endpoints
    to maintain security boundaries between organizations.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "This endpoint has been deprecated for security reasons.",
            "message": "Use organization-specific endpoints to view invitations",
            "instructions": [
                "View sent invitations: GET /organizations/audit-log",
                "This ensures you only see invitations for your organization",
                "Prevents cross-organization data exposure"
            ]
        }
    )

@router.get("/invitations/all", deprecated=True)
async def get_all_invitations():
    """DEPRECATED: Use /organizations/audit-log instead.
    
    Organization invitations are now managed through organization-specific endpoints
    to maintain security boundaries between organizations.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "This endpoint has been deprecated for security reasons.",
            "message": "Use organization-specific endpoints to view invitations",
            "instructions": [
                "View all organization activity: GET /organizations/audit-log",
                "This ensures you only see data for your organization",
                "Prevents cross-organization data exposure"
            ]
        }
    )

@router.get("/invite-link/{invitation_id}", deprecated=True)
async def get_invite_link():
    """DEPRECATED: Invitation management moved to organization endpoints.
    
    Use organization-specific invitation endpoints to maintain security boundaries.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "This endpoint has been deprecated for security reasons.",
            "message": "Invitation management is now handled through organization endpoints",
            "instructions": [
                "Send invitations: POST /organizations/invite",
                "View invitation status: GET /organizations/audit-log",
                "This ensures proper organization security boundaries"
            ]
        }
    )

@router.post("/forgot-password", response_model=dict)
async def forgot_password(forgot_data: ForgotPassword):
    """Send password reset email with organization context"""
    try:
        # Check if user exists with organization validation
        user_data = await DatabaseOperations.get_document("users", {"email": forgot_data.email})
        if not user_data:
            # For security, don't reveal if email exists or not
            return {
                "message": "If an account with this email exists, you will receive a password reset link."
            }
        
        # Ensure user has organization_id (security check)
        if not user_data.get('organization_id'):
            logger.warning(f"Password reset attempt for user without organization: {forgot_data.email}")
            # Don't reveal the security issue to the user
            return {
                "message": "If an account with this email exists, you will receive a password reset link."
            }
        
        user = User(**{k: v for k, v in user_data.items() if k != "password"})
        
        # Verify organization is still active
        organization = await DatabaseOperations.get_document(
            "organizations", 
            {"id": user.organization_id}
        )
        if not organization or organization.get("status") != "active":
            logger.warning(f"Password reset attempt for inactive organization: {user.organization_id}")
            return {
                "message": "If an account with this email exists, you will receive a password reset link."
            }
        
        # Check for existing unused reset tokens and mark them as used
        await DatabaseOperations.update_document(
            "password_reset_tokens",
            {"email": forgot_data.email, "used": False},
            {"$set": {"used": True}}
        )
        
        # Create password reset token with organization context
        reset_token = PasswordResetToken(
            email=forgot_data.email,
            expires_at=datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
        )
        
        # Add organization context to token for security
        token_dict = reset_token.model_dump()
        token_dict["organization_id"] = user.organization_id
        
        await DatabaseOperations.create_document("password_reset_tokens", token_dict)
        
        # Generate reset link
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
        
        # Send password reset email with organization context
        try:
            email_sent = await email_service.send_password_reset_email(
                to_email=forgot_data.email,
                user_name=user.name,
                reset_link=reset_link,
                organization_name=organization["name"]
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            email_sent = False
        
        return {
            "message": "If an account with this email exists, you will receive a password reset link.",
            "email_sent": email_sent
        }
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/reset-password", response_model=dict)
async def reset_password(reset_data: ResetPassword):
    """Reset password using token with organization validation"""
    try:
        # Find password reset token
        token_data = await DatabaseOperations.get_document(
            "password_reset_tokens", 
            {"token": reset_data.token, "used": False}
        )
        
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        reset_token = PasswordResetToken(**token_data)
        
        # Check if token is expired
        if datetime.utcnow() > reset_token.expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Find user with organization validation
        user_data = await DatabaseOperations.get_document("users", {"email": reset_token.email})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        # Security check: validate organization context if present in token
        if token_data.get('organization_id'):
            if user_data.get('organization_id') != token_data['organization_id']:
                logger.error(f"Organization mismatch in password reset for {reset_token.email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid reset token"
                )
        
        # Ensure user has organization_id
        if not user_data.get('organization_id'):
            logger.error(f"User without organization attempted password reset: {reset_token.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account needs to be migrated. Please contact support."
            )
        
        # Hash new password
        hashed_password = hash_password(reset_data.new_password)
        
        # Update user password with organization context for security
        await DatabaseOperations.update_document(
            "users",
            {"email": reset_token.email, "organization_id": user_data['organization_id']},
            {"$set": {"password": hashed_password, "updated_at": datetime.utcnow()}}
        )
        
        # Mark token as used
        await DatabaseOperations.update_document(
            "password_reset_tokens",
            {"token": reset_data.token},
            {"$set": {"used": True}}
        )
        
        return {
            "message": "Password has been reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )