from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
import uuid

class ReportType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class ReportFormat(str, Enum):
    JSON = "json"
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"

class ProductivityTrend(str, Enum):
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"

class TeamMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str  # CRITICAL: Organization isolation
    team_id: Optional[str] = None
    date: date
    total_members: int = 0
    active_members: int = 0
    total_hours_tracked: float = 0.0
    average_productivity_score: float = 0.0
    average_activity_level: float = 0.0
    most_productive_hour: Optional[int] = None
    least_productive_hour: Optional[int] = None
    top_applications: List[Dict[str, Any]] = []
    top_websites: List[Dict[str, Any]] = []
    collaboration_score: float = 0.0  # Based on communication apps usage
    focus_time_percentage: float = 0.0
    meeting_time_percentage: float = 0.0

class UserProductivityReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    report_date: date
    report_type: ReportType
    total_hours: float = 0.0
    active_hours: float = 0.0
    idle_hours: float = 0.0
    productivity_score: float = 0.0
    activity_level: float = 0.0
    focus_score: float = 0.0
    efficiency_score: float = 0.0
    
    # Time distribution
    productive_time: float = 0.0
    neutral_time: float = 0.0
    distracting_time: float = 0.0
    
    # Application analytics
    top_applications: List[Dict[str, Any]] = []
    application_switches: int = 0
    
    # Website analytics
    top_websites: List[Dict[str, Any]] = []
    
    # Keystroke analytics
    total_keystrokes: int = 0
    typing_speed_wpm: float = 0.0
    
    # Screenshots
    screenshots_taken: int = 0
    
    # Trends
    productivity_trend: ProductivityTrend = ProductivityTrend.STABLE
    trend_percentage: float = 0.0
    
    # Goals
    daily_goal_hours: float = 8.0
    goal_achievement_percentage: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductivityGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    goal_type: str  # daily_hours, weekly_hours, productivity_score, focus_score
    target_value: float
    current_value: float = 0.0
    achievement_percentage: float = 0.0
    start_date: date
    end_date: Optional[date] = None
    is_achieved: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductivityInsight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    insight_type: str  # peak_hours, distraction_pattern, productivity_tip, etc.
    title: str
    description: str
    importance: str = "medium"  # low, medium, high
    actionable: bool = True
    data: Dict[str, Any] = {}
    is_read: bool = False
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TimeHeatmap(BaseModel):
    user_id: str
    date_range: Dict[str, str]  # start_date, end_date
    hourly_data: Dict[int, float]  # hour (0-23) -> productivity score
    daily_data: Dict[str, float]  # date -> productivity score
    peak_hours: List[int] = []
    low_hours: List[int] = []

class ProductivityComparison(BaseModel):
    user_id: str
    comparison_type: str  # team_average, previous_period, top_performer
    user_score: float
    comparison_score: float
    difference: float
    percentage_difference: float
    is_better: bool
    metrics: Dict[str, Any] = {}

class AdvancedAnalyticsQuery(BaseModel):
    user_ids: Optional[List[str]] = None
    project_ids: Optional[List[str]] = None
    start_date: date
    end_date: date
    metrics: List[str] = []  # productivity, activity, focus, efficiency
    granularity: str = "daily"  # hourly, daily, weekly
    filters: Dict[str, Any] = {}

class AnalyticsResponse(BaseModel):
    query: AdvancedAnalyticsQuery
    data: List[Dict[str, Any]]
    summary: Dict[str, Any]
    insights: List[ProductivityInsight] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductivityAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    alert_type: str  # low_productivity, excessive_idle, goal_behind, etc.
    severity: str = "medium"  # low, medium, high, critical
    title: str
    message: str
    threshold_value: Optional[float] = None
    current_value: Optional[float] = None
    is_resolved: bool = False
    is_acknowledged: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class DashboardConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    widget_layout: List[Dict[str, Any]] = []
    default_date_range: int = 7  # days
    refresh_interval: int = 300  # seconds
    show_team_comparison: bool = True
    show_goals: bool = True
    show_insights: bool = True
    theme: str = "light"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request Models
class GoalCreate(BaseModel):
    goal_type: str
    target_value: float
    start_date: date
    end_date: Optional[date] = None

class GoalUpdate(BaseModel):
    target_value: Optional[float] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class ReportGenerate(BaseModel):
    report_type: ReportType
    start_date: date
    end_date: date
    format: ReportFormat = ReportFormat.JSON
    include_charts: bool = True
    include_insights: bool = True

class AlertSettings(BaseModel):
    low_productivity_threshold: float = 50.0
    idle_time_threshold: int = 1800  # 30 minutes in seconds
    goal_behind_threshold: float = 20.0  # percentage
    enable_email_alerts: bool = True
    enable_push_notifications: bool = True