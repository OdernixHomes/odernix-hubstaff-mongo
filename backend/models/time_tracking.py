from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class TimeEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    project_id: str
    task_id: Optional[str] = None
    organization_id: str  # CRITICAL: Organization isolation
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[int] = None  # in seconds
    description: Optional[str] = None
    is_manual: bool = False
    is_paused: bool = False
    pause_periods: List[dict] = []  # List of pause periods: [{"pause_time": datetime, "resume_time": datetime}]
    total_pause_duration: int = 0  # Total pause time in seconds
    activity_level: Optional[float] = None  # 0-100
    screenshots: List[str] = []  # List of screenshot URLs
    apps_used: List[dict] = []  # App usage data
    urls_visited: List[dict] = []  # URL usage data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TimeEntryCreate(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    description: Optional[str] = None

class TimeEntryUpdate(BaseModel):
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    activity_level: Optional[float] = None
    apps_used: Optional[List[dict]] = None
    urls_visited: Optional[List[dict]] = None

class TimeEntryManual(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None

class ActivityData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    timestamp: datetime
    mouse_clicks: int = 0
    keyboard_strokes: int = 0
    active_app: Optional[str] = None
    active_url: Optional[str] = None
    screenshot_url: Optional[str] = None
    activity_score: float = 0.0  # 0-100

class Screenshot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    time_entry_id: str
    organization_id: str  # CRITICAL: Organization isolation
    url: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    activity_level: Optional[float] = None

class DailyReport(BaseModel):
    user_id: str
    organization_id: str  # CRITICAL: Organization isolation
    date: datetime
    total_hours: float
    projects_worked: List[dict]
    activity_level: float
    screenshots_count: int
    most_used_apps: List[dict]
    most_visited_urls: List[dict]