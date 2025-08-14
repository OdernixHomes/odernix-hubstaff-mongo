from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class ScreenshotType(str, Enum):
    PERIODIC = "periodic"
    ACTIVITY_BASED = "activity_based"
    MANUAL = "manual"

class ApplicationCategory(str, Enum):
    PRODUCTIVE = "productive"
    NEUTRAL = "neutral"
    DISTRACTING = "distracting"
    COMMUNICATION = "communication"
    DEVELOPMENT = "development"
    DESIGN = "design"

class WebsiteCategory(str, Enum):
    WORK_RELATED = "work_related"
    SOCIAL_MEDIA = "social_media"
    NEWS = "news"
    ENTERTAINMENT = "entertainment"
    SEARCH = "search"
    DEVELOPMENT = "development"
    COMMUNICATION = "communication"

class ScreenshotData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    screenshot_url: str
    thumbnail_url: Optional[str] = None
    screenshot_type: ScreenshotType = ScreenshotType.PERIODIC
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    activity_level: float = 0.0  # 0-100
    blur_level: float = 0.0  # Privacy blur applied (0-100)
    is_deleted: bool = False
    metadata: Dict[str, Any] = {}

class KeystrokeData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    timestamp: datetime
    keystroke_count: int = 0
    words_typed: int = 0
    active_application: Optional[str] = None
    language_detected: Optional[str] = None
    typing_speed_wpm: Optional[float] = None
    productivity_score: float = 0.0  # Based on typing patterns

class ApplicationUsage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    application_name: str
    application_title: Optional[str] = None
    category: ApplicationCategory = ApplicationCategory.NEUTRAL
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: int = 0
    activity_level: float = 0.0
    productivity_score: float = 0.0
    file_path: Optional[str] = None

class WebsiteVisit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    url: str
    domain: str
    title: Optional[str] = None
    category: WebsiteCategory = WebsiteCategory.WORK_RELATED
    visit_time: datetime
    duration_seconds: int = 0
    page_views: int = 1
    productivity_score: float = 0.0
    is_idle: bool = False

class ActivitySession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    session_start: datetime
    session_end: Optional[datetime] = None
    total_keystrokes: int = 0
    total_mouse_clicks: int = 0
    total_mouse_movements: int = 0
    active_time_seconds: int = 0
    idle_time_seconds: int = 0
    applications_used: List[str] = []
    websites_visited: List[str] = []
    screenshots_taken: int = 0
    productivity_score: float = 0.0

class ProductivityMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    date: datetime
    total_active_time: int = 0  # seconds
    total_idle_time: int = 0  # seconds
    keystroke_rate: float = 0.0  # keystrokes per minute
    mouse_activity_rate: float = 0.0  # clicks per minute
    application_switches: int = 0
    productive_time_percentage: float = 0.0
    focus_score: float = 0.0  # 0-100, based on app switching frequency
    efficiency_score: float = 0.0  # 0-100, overall productivity
    top_applications: List[Dict[str, Any]] = []
    top_websites: List[Dict[str, Any]] = []

class MonitoringSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    screenshot_enabled: bool = True
    screenshot_interval: int = 600  # seconds (10 minutes)
    screenshot_quality: str = "medium"  # low, medium, high
    blur_screenshots: bool = False
    keystroke_tracking: bool = True
    application_tracking: bool = True
    website_tracking: bool = True
    activity_monitoring: bool = True
    privacy_mode: bool = False
    exclude_applications: List[str] = []
    exclude_websites: List[str] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models
class ScreenshotUpload(BaseModel):
    time_entry_id: str
    activity_level: float
    screenshot_type: ScreenshotType = ScreenshotType.PERIODIC

class ActivityUpdate(BaseModel):
    time_entry_id: str
    keystroke_count: int = 0
    mouse_clicks: int = 0
    mouse_movements: int = 0
    active_application: Optional[str] = None
    current_url: Optional[str] = None

class ApplicationSwitch(BaseModel):
    time_entry_id: str
    application_name: str
    application_title: Optional[str] = None
    switch_time: datetime = Field(default_factory=datetime.utcnow)

class WebsiteNavigation(BaseModel):
    time_entry_id: str
    url: str
    title: Optional[str] = None
    navigation_time: datetime = Field(default_factory=datetime.utcnow)

class MonitoringSettingsUpdate(BaseModel):
    screenshot_enabled: Optional[bool] = None
    screenshot_interval: Optional[int] = None
    screenshot_quality: Optional[str] = None
    blur_screenshots: Optional[bool] = None
    keystroke_tracking: Optional[bool] = None
    application_tracking: Optional[bool] = None
    website_tracking: Optional[bool] = None
    activity_monitoring: Optional[bool] = None
    privacy_mode: Optional[bool] = None
    exclude_applications: Optional[List[str]] = None
    exclude_websites: Optional[List[str]] = None