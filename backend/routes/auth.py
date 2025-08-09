from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from datetime import timedelta, datetime
from models.user import UserCreate, UserLogin, UserResponse, User, InviteUser, Invitation, AcceptInvite
from auth.jwt_handler import create_access_token, create_refresh_token, hash_password, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES
from auth.dependencies import get_current_user
from database.mongodb import DatabaseOperations
from services.email import email_service
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new admin user - only admins can register directly"""
    try:
        # Only allow admin registration
        if user_data.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can register directly. Managers and users must be invited."
            )
        
        # Check if user already exists
        existing_user = await DatabaseOperations.get_document("users", {"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        user = User(
            name=user_data.name,
            email=user_data.email,
            company=user_data.company,
            role=user_data.role
        )
        
        user_dict = user.dict()
        user_dict["password"] = hashed_password
        
        await DatabaseOperations.create_document("users", user_dict)
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse(**user.dict())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=dict)
async def login(user_credentials: UserLogin):
    """Login user"""
    try:
        # Get user
        user_data = await DatabaseOperations.get_document("users", {"email": user_credentials.email})
        if not user_data or not verify_password(user_credentials.password, user_data["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        user = User(**{k: v for k, v in user_data.items() if k != "password"})
        
        # Update last active
        await DatabaseOperations.update_document(
            "users", 
            {"id": user.id}, 
            {"status": "active"}
        )
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse(**user.dict())
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
    """Logout user"""
    try:
        # Update user status
        await DatabaseOperations.update_document(
            "users", 
            {"id": current_user.id}, 
            {"status": "offline"}
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
    return UserResponse(**current_user.dict())

@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    try:
        from auth.jwt_handler import verify_token
        
        user_id = verify_token(refresh_token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new access token
        access_token = create_access_token(
            data={"sub": user_id},
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

@router.post("/invite", response_model=dict)
async def invite_user(invite_data: InviteUser, current_user: User = Depends(get_current_user)):
    """Invite a user - only admins can invite"""
    try:
        # Only admins can invite users
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can invite users"
            )
        
        # Check if user already exists
        existing_user = await DatabaseOperations.get_document("users", {"email": invite_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Check if invitation already exists
        existing_invite = await DatabaseOperations.get_document("invitations", {"email": invite_data.email, "accepted": False})
        if existing_invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation already sent to this email"
            )
        
        # Create invitation
        invitation = Invitation(
            email=invite_data.email,
            role=invite_data.role,
            invited_by=current_user.id,
            expires_at=datetime.utcnow() + timedelta(days=settings.INVITATION_EXPIRE_DAYS)
        )
        
        await DatabaseOperations.create_document("invitations", invitation.dict())
        
        # Generate invitation link
        invite_link = f"{settings.invite_base_url}?token={invitation.token}"
        
        # Send invitation email
        email_sent = await email_service.send_invitation_email(
            to_email=invite_data.email,
            inviter_name=current_user.name,
            role=invite_data.role,
            invite_link=invite_link
        )
        
        return {
            "message": f"Invitation sent to {invite_data.email}",
            "invitation_token": invitation.token,
            "invite_link": invite_link,
            "email_sent": email_sent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invitation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation"
        )

@router.post("/accept-invite", response_model=dict)
async def accept_invitation(accept_data: AcceptInvite):
    """Accept an invitation and create user account"""
    try:
        # Find invitation
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
        
        # Check if user already exists
        existing_user = await DatabaseOperations.get_document("users", {"email": invitation.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password
        hashed_password = hash_password(accept_data.password)
        
        # Create user
        user = User(
            name=accept_data.name,
            email=invitation.email,
            role=invitation.role
        )
        
        user_dict = user.dict()
        user_dict["password"] = hashed_password
        
        await DatabaseOperations.create_document("users", user_dict)
        
        # Mark invitation as accepted
        await DatabaseOperations.update_document(
            "invitations",
            {"token": accept_data.token},
            {"accepted": True}
        )
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse(**user.dict())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Accept invitation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation"
        )

@router.get("/invitations", response_model=list)
async def get_invitations(current_user: User = Depends(get_current_user)):
    """Get all pending invitations - only admins can view"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view invitations"
            )
        
        invitations = await DatabaseOperations.get_documents("invitations", {"accepted": False})
        
        # Add invite link and status to each invitation
        for invitation in invitations:
            invitation["invite_link"] = f"{settings.invite_base_url}?token={invitation['token']}"
            invitation["status"] = "pending"
            # Check if expired
            if datetime.utcnow() > invitation["expires_at"]:
                invitation["status"] = "expired"
        
        return invitations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get invitations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get invitations"
        )

@router.get("/invitations/all", response_model=list)
async def get_all_invitations(current_user: User = Depends(get_current_user)):
    """Get all invitations (pending and accepted) - only admins can view"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view invitations"
            )
        
        invitations = await DatabaseOperations.get_documents("invitations")
        
        # Add invite link and status to each invitation
        for invitation in invitations:
            invitation["invite_link"] = f"{settings.invite_base_url}?token={invitation['token']}"
            
            if invitation["accepted"]:
                invitation["status"] = "accepted"
            elif datetime.utcnow() > invitation["expires_at"]:
                invitation["status"] = "expired"
            else:
                invitation["status"] = "pending"
        
        # Sort by created_at descending (newest first)
        invitations.sort(key=lambda x: x["created_at"], reverse=True)
        
        return invitations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get all invitations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get all invitations"
        )

@router.get("/invite-link/{invitation_id}", response_model=dict)
async def get_invite_link(invitation_id: str, current_user: User = Depends(get_current_user)):
    """Get invite link for a specific invitation - only admins can access"""
    try:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can get invite links"
            )
        
        invitation = await DatabaseOperations.get_document("invitations", {"id": invitation_id})
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )
        
        if invitation["accepted"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has already been accepted"
            )
        
        if datetime.utcnow() > invitation["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired"
            )
        
        return {
            "invite_link": f"{settings.invite_base_url}?token={invitation['token']}",
            "email": invitation["email"],
            "role": invitation["role"],
            "expires_at": invitation["expires_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get invite link error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get invite link"
        )