from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class ProductivityLevel(str, Enum):
    VERY_LOW = "very_low"      # 0-20%
    LOW = "low"                # 21-40%
    MODERATE = "moderate"      # 41-60%
    HIGH = "high"              # 61-80%
    VERY_HIGH = "very_high"    # 81-100%

class TrackingStatus(str, Enum):
    ACTIVE = "active"           # Currently tracking
    PAUSED = "paused"          # Temporarily paused
    STOPPED = "stopped"        # Stopped tracking
    IDLE = "idle"              # User is idle

class AlertType(str, Enum):
    LOW_ACTIVITY = "low_activity"
    EXCESSIVE_IDLE = "excessive_idle"
    PRODUCTIVITY_DROP = "productivity_drop"
    UNUSUAL_PATTERN = "unusual_pattern"
    DISTRACTION_ALERT = "distraction_alert"

class MouseActivityData(BaseModel):
    """Enhanced mouse activity tracking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Mouse metrics
    click_count: int = 0
    double_click_count: int = 0
    right_click_count: int = 0
    scroll_events: int = 0
    movement_distance: float = 0.0  # pixels moved
    movement_speed: float = 0.0     # pixels per second
    
    # Activity analysis
    activity_level: float = 0.0     # 0-100
    precision_score: float = 0.0    # clicking accuracy
    efficiency_score: float = 0.0   # movement efficiency
    
    # Context
    active_application: Optional[str] = None
    screen_coordinates: Optional[Dict[str, float]] = None

class KeyboardActivityData(BaseModel):
    """Enhanced keyboard activity tracking"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Keyboard metrics
    keystroke_count: int = 0
    words_typed: int = 0
    typing_speed_wpm: float = 0.0
    typing_accuracy: float = 100.0  # percentage
    backspace_count: int = 0
    
    # Advanced metrics
    typing_rhythm_score: float = 0.0    # consistency of typing
    productivity_keywords: int = 0       # work-related words detected
    pause_frequency: float = 0.0        # thinking/pause patterns
    
    # Context
    active_application: Optional[str] = None
    language_detected: Optional[str] = None
    content_category: Optional[str] = None  # code, document, email, etc.

class ScreenshotAnalysis(BaseModel):
    """Enhanced screenshot analysis with AI insights"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    screenshot_id: str
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    analysis_timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # AI Analysis results
    productivity_score: float = 0.0     # 0-100
    focus_level: float = 0.0            # 0-100
    distraction_level: float = 0.0      # 0-100
    
    # Content analysis
    applications_detected: List[str] = []
    websites_detected: List[str] = []
    text_content_type: Optional[str] = None  # code, document, email, etc.
    
    # Visual analysis
    screen_utilization: float = 0.0     # how much of screen is being used
    window_count: int = 0
    multitasking_score: float = 0.0
    
    # Privacy protection
    contains_sensitive_data: bool = False
    blur_applied: bool = False
    redacted_areas: List[Dict[str, float]] = []

class RealTimeActivity(BaseModel):
    """Real-time activity tracking during active time entries"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Current status
    tracking_status: TrackingStatus = TrackingStatus.ACTIVE
    current_activity_level: float = 0.0  # 0-100
    productivity_level: ProductivityLevel = ProductivityLevel.MODERATE
    
    # Real-time metrics (last 5 minutes)
    recent_keystrokes: int = 0
    recent_mouse_clicks: int = 0
    recent_mouse_movements: int = 0
    active_seconds: int = 0
    idle_seconds: int = 0
    
    # Current context
    current_application: Optional[str] = None
    current_website: Optional[str] = None
    last_screenshot_time: Optional[datetime] = None
    
    # Alerts and notifications
    alerts_generated: List[AlertType] = []
    requires_admin_attention: bool = False

class ProductivityReport(BaseModel):
    """Individual user productivity report"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    report_date: datetime
    report_period: str  # daily, weekly, monthly
    
    # Time tracking
    total_tracked_time: int = 0      # seconds
    active_time: int = 0             # seconds
    idle_time: int = 0               # seconds
    break_time: int = 0              # seconds
    
    # Activity metrics
    total_keystrokes: int = 0
    total_mouse_clicks: int = 0
    total_mouse_movements: int = 0
    avg_typing_speed: float = 0.0
    
    # Productivity scores
    overall_productivity_score: float = 0.0     # 0-100
    focus_score: float = 0.0                    # 0-100
    efficiency_score: float = 0.0               # 0-100
    activity_level_score: float = 0.0           # 0-100
    
    # Application/Website usage
    top_applications: List[Dict[str, Any]] = []
    top_websites: List[Dict[str, Any]] = []
    productive_time_percentage: float = 0.0
    neutral_time_percentage: float = 0.0
    distracting_time_percentage: float = 0.0
    
    # Screenshots
    screenshots_taken: int = 0
    avg_screenshot_productivity: float = 0.0
    
    # Patterns and insights
    most_productive_hours: List[int] = []       # hours of day (0-23)
    productivity_trends: Dict[str, float] = {}
    recommendations: List[str] = []
    
    # Alerts and issues
    low_activity_periods: int = 0
    excessive_idle_periods: int = 0
    distraction_incidents: int = 0

class OrganizationProductivitySummary(BaseModel):
    """Organization-wide productivity summary for admins"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    report_date: datetime
    report_period: str  # daily, weekly, monthly
    
    # Organization metrics
    total_users_tracked: int = 0
    total_tracked_hours: float = 0.0
    avg_productivity_score: float = 0.0
    avg_activity_level: float = 0.0
    
    # User performance
    top_performers: List[Dict[str, Any]] = []
    users_needing_attention: List[Dict[str, Any]] = []
    productivity_distribution: Dict[ProductivityLevel, int] = {}
    
    # Organization insights
    peak_productivity_hours: List[int] = []
    most_used_applications: List[Dict[str, Any]] = []
    productivity_trends: Dict[str, float] = {}
    
    # Alerts and notifications
    active_alerts: List[Dict[str, Any]] = []
    users_with_low_activity: List[str] = []
    users_with_high_productivity: List[str] = []

class ProductivityAlert(BaseModel):
    """Productivity alerts for admins"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    user_id: str
    alert_type: AlertType
    severity: str = "medium"  # low, medium, high, critical
    
    title: str
    message: str
    
    # Alert details
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    related_time_entry_id: Optional[str] = None
    metric_value: Optional[float] = None
    threshold_value: Optional[float] = None
    
    # Alert status
    is_read: bool = False
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    
    # Action taken
    action_required: bool = True
    suggested_actions: List[str] = []
    admin_notes: Optional[str] = None

class ProductivityGoal(BaseModel):
    """Productivity goals and targets"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    user_id: Optional[str] = None  # None for organization-wide goals
    
    goal_type: str  # productivity_score, activity_level, focus_time, etc.
    target_value: float
    current_value: float = 0.0
    
    period: str = "weekly"  # daily, weekly, monthly, quarterly
    start_date: datetime
    end_date: datetime
    
    # Goal status
    is_active: bool = True
    is_achieved: bool = False
    achievement_rate: float = 0.0  # percentage
    
    # Motivation
    title: str
    description: Optional[str] = None
    reward: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models for API
class StartTrackingRequest(BaseModel):
    time_entry_id: str
    enable_screenshots: bool = True
    enable_keyboard_tracking: bool = True
    enable_mouse_tracking: bool = True

class ActivityUpdateRequest(BaseModel):
    time_entry_id: str
    keystroke_count: int = 0
    mouse_clicks: int = 0
    mouse_movements: int = 0
    movement_distance: float = 0.0
    typing_speed: float = 0.0
    active_application: Optional[str] = None
    current_url: Optional[str] = None

class ProductivityReportRequest(BaseModel):
    user_id: Optional[str] = None  # None for all users (admin only)
    start_date: datetime
    end_date: datetime
    report_type: str = "detailed"  # summary, detailed, comparison

class ProductivitySettingsUpdate(BaseModel):
    screenshot_interval: Optional[int] = None  # seconds
    activity_threshold: Optional[float] = None  # activity level threshold
    idle_timeout: Optional[int] = None  # seconds
    productivity_alerts: Optional[bool] = None
    auto_pause_on_idle: Optional[bool] = None
    privacy_mode: Optional[bool] = None