from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"

class UserStatus(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    OFFLINE = "offline"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    role: UserRole
    status: UserStatus = UserStatus.OFFLINE
    avatar: Optional[str] = None
    # Organization-based security
    organization_id: str  # Required - every user must belong to an organization
    is_organization_owner: bool = False
    timezone: str = "UTC"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    working_hours: Optional[dict] = {"start": "09:00", "end": "17:00"}
    settings: Optional[dict] = {
        "screenshot_interval": 10,
        "activity_tracking": True,
        "idle_timeout": 5,
        "notifications": True
    }

# UserCreate is now used only for internal user creation within an organization
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_id: str  # Must be provided when creating users
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    timezone: Optional[str] = None
    working_hours: Optional[dict] = None
    settings: Optional[dict] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    status: UserStatus
    avatar: Optional[str] = None
    organization_id: str
    is_organization_owner: bool
    timezone: str
    created_at: datetime
    last_active: Optional[datetime] = None
    email_verified: bool

class InviteUser(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.USER

class Invitation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: UserRole
    organization_id: str  # Organization context for invitation
    invited_by: str  # User ID of inviter
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted: bool = False
    organization_name: Optional[str] = None  # For display purposes

class AcceptInvite(BaseModel):
    token: str
    name: str
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class PasswordResetToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used: bool = False