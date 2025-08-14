from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class OrganizationPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class OrganizationStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    CANCELLED = "cancelled"

class Organization(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str  # Unique domain identifier (e.g., "acme-corp")
    email: EmailStr  # Organization contact email
    plan: OrganizationPlan = OrganizationPlan.FREE
    status: OrganizationStatus = OrganizationStatus.TRIAL
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "allow_public_registration": False,
        "require_email_verification": True,
        "enforce_2fa": False,
        "screenshot_retention_days": 30,
        "allow_screenshot_deletion": True,
        "working_hours_enforcement": False,
        "timezone": "UTC"
    })
    
    # Subscription info
    max_users: int = 5  # Based on plan
    current_users: int = 0
    max_projects: int = 10
    storage_limit_gb: int = 5
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    trial_ends_at: Optional[datetime] = None
    owner_id: Optional[str] = None  # User ID of organization owner

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    domain: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-zA-Z0-9-]+$')
    email: EmailStr
    plan: OrganizationPlan = OrganizationPlan.FREE
    
class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    settings: Optional[Dict[str, Any]] = None

class OrganizationInvite(BaseModel):
    email: EmailStr
    role: str  # admin, manager, user
    message: Optional[str] = None

class OrganizationStats(BaseModel):
    total_users: int
    active_users: int
    total_projects: int
    total_time_tracked: float  # hours
    storage_used_gb: float
    plan_limits: Dict[str, Any]

class OrganizationMember(BaseModel):
    user_id: str
    organization_id: str
    role: str
    joined_at: datetime
    invited_by: Optional[str] = None
    is_owner: bool = False

# Organization registration flow models
class OrganizationRegistration(BaseModel):
    # Organization details
    organization_name: str = Field(..., min_length=2, max_length=100)
    organization_domain: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-zA-Z0-9-]+$')
    
    # Admin user details
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    
    # Plan selection
    plan: OrganizationPlan = OrganizationPlan.FREE
    
    # Terms and conditions
    accept_terms: bool = Field(..., description="Must accept terms and conditions")
    accept_privacy: bool = Field(..., description="Must accept privacy policy")

class OrganizationRegistrationResponse(BaseModel):
    organization_id: str
    organization_name: str
    organization_domain: str
    admin_user_id: str
    access_token: str
    message: str

# Security and audit models
class OrganizationAuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    user_id: Optional[str] = None
    action: str  # login, logout, create_project, invite_user, etc.
    resource_type: Optional[str] = None  # user, project, time_entry, etc.
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class OrganizationSecurityPolicy(BaseModel):
    organization_id: str
    password_policy: Dict[str, Any] = Field(default_factory=lambda: {
        "min_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_numbers": True,
        "require_symbols": False,
        "password_history": 3,
        "max_age_days": 90
    })
    session_policy: Dict[str, Any] = Field(default_factory=lambda: {
        "max_session_hours": 8,
        "idle_timeout_minutes": 30,
        "require_2fa": False,
        "allow_concurrent_sessions": True
    })
    data_retention_policy: Dict[str, Any] = Field(default_factory=lambda: {
        "time_entries_days": 365,
        "screenshots_days": 30,
        "activity_data_days": 90,
        "audit_logs_days": 180
    })
    access_control: Dict[str, Any] = Field(default_factory=lambda: {
        "ip_whitelist": [],
        "allowed_domains": [],
        "block_tor": False,
        "require_verified_email": True
    })