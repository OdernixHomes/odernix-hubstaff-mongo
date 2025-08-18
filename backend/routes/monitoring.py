from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
import logging
from PIL import Image
import io
import base64

from models.user import User
from models.monitoring import (
    ScreenshotData, KeystrokeData, ApplicationUsage, WebsiteVisit,
    ActivitySession, ProductivityMetrics, MonitoringSettings,
    ScreenshotUpload, ActivityUpdate, ApplicationSwitch, WebsiteNavigation,
    MonitoringSettingsUpdate, ScreenshotType, ApplicationCategory, WebsiteCategory
)
from auth.dependencies import get_current_user
from database.mongodb import DatabaseOperations
from services.storage import StorageService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Initialize storage service
storage = StorageService()

@router.post("/screenshot/upload")
async def upload_screenshot(
    file: UploadFile = File(...),
    time_entry_id: str = Form(...),
    user_id: str = Form(...),
    activity_level: float = Form(...),
    screenshot_type: str = Form(default="periodic"),
    timestamp: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a screenshot during time tracking (organization-specific)"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        screenshot_id = str(uuid.uuid4())
        filename = f"screenshots/{current_user.id}/{screenshot_id}.{file_extension}"
        thumbnail_filename = f"screenshots/{current_user.id}/thumbs/{screenshot_id}_thumb.{file_extension}"
        
        # Create thumbnail
        thumbnail_content = create_thumbnail(file_content)
        
        # Upload files to storage
        screenshot_url = await storage.upload_file(filename, file_content, file.content_type)
        thumbnail_url = await storage.upload_file(thumbnail_filename, thumbnail_content, file.content_type)
        
        # CRITICAL SECURITY: Verify time entry belongs to user's organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"id": time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        if not time_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # Get user's monitoring settings with organization context
        settings = await DatabaseOperations.get_document(
            "monitoring_settings", 
            {"user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        
        blur_level = 0.0
        if settings and settings.get("blur_screenshots", False):
            blur_level = 50.0  # Apply moderate blur for privacy
        
        # CRITICAL SECURITY: Create screenshot record with organization context
        screenshot_data = ScreenshotData(
            user_id=current_user.id,
            time_entry_id=time_entry_id,
            organization_id=current_user.organization_id,
            screenshot_url=screenshot_url,
            thumbnail_url=thumbnail_url,
            screenshot_type=ScreenshotType(screenshot_type),
            activity_level=activity_level,
            blur_level=blur_level
        )
        
        # Save to database
        await DatabaseOperations.create_document("screenshots", screenshot_data.dict())
        
        # CRITICAL SECURITY: Update time entry with organization validation
        await DatabaseOperations.update_document(
            "time_entries",
            {"id": time_entry_id, "organization_id": current_user.organization_id},
            {
                "$push": {"screenshots": screenshot_data.id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        logger.info(f"Screenshot uploaded: {screenshot_id} for user {current_user.id} (folder: screenshots/{current_user.id}/)")
        
        return {
            "screenshot_id": screenshot_data.id,
            "thumbnail_url": thumbnail_url,
            "screenshot_url": screenshot_url,
            "user_folder": f"screenshots/{current_user.id}/",
            "message": f"Screenshot uploaded successfully to user-specific folder"
        }
        
    except Exception as e:
        logger.error(f"Screenshot upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload screenshot"
        )

@router.post("/activity/update")
async def update_activity(
    activity_data: ActivityUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user activity data during time tracking (organization-specific)"""
    try:
        # CRITICAL SECURITY: Verify time entry belongs to user's organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"id": activity_data.time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        if not time_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # Get current activity session or create new one with organization context
        session = await DatabaseOperations.get_document(
            "activity_sessions",
            {
                "user_id": current_user.id,
                "time_entry_id": activity_data.time_entry_id,
                "organization_id": current_user.organization_id,
                "session_end": None
            }
        )
        
        if not session:
            # CRITICAL SECURITY: Create new activity session with organization context
            session_data = ActivitySession(
                user_id=current_user.id,
                time_entry_id=activity_data.time_entry_id,
                organization_id=current_user.organization_id,
                session_start=datetime.utcnow()
            )
            await DatabaseOperations.create_document("activity_sessions", session_data.dict())
            session_id = session_data.id
        else:
            session_id = session["id"]
        
        # Record keystroke data if provided
        if activity_data.keystroke_count > 0:
            # CRITICAL SECURITY: Create keystroke data with organization context
            keystroke_data = KeystrokeData(
                user_id=current_user.id,
                time_entry_id=activity_data.time_entry_id,
                organization_id=current_user.organization_id,
                timestamp=datetime.utcnow(),
                keystroke_count=activity_data.keystroke_count,
                active_application=activity_data.active_application
            )
            await DatabaseOperations.create_document("keystroke_data", keystroke_data.dict())
        
        # Update activity session
        update_data = {
            "$inc": {
                "total_keystrokes": activity_data.keystroke_count,
                "total_mouse_clicks": activity_data.mouse_clicks,
                "total_mouse_movements": activity_data.mouse_movements
            },
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
        
        if activity_data.active_application:
            if "$addToSet" not in update_data:
                update_data["$addToSet"] = {}
            update_data["$addToSet"]["applications_used"] = activity_data.active_application
        
        if activity_data.current_url:
            if "$addToSet" not in update_data:
                update_data["$addToSet"] = {}
            update_data["$addToSet"]["websites_visited"] = activity_data.current_url
        
        # CRITICAL SECURITY: Update activity session with organization validation
        await DatabaseOperations.update_document(
            "activity_sessions",
            {"id": session_id, "organization_id": current_user.organization_id},
            update_data
        )
        
        return {"message": "Activity updated successfully"}
        
    except Exception as e:
        logger.error(f"Activity update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update activity"
        )

@router.post("/application/switch")
async def record_application_switch(
    app_data: ApplicationSwitch,
    current_user: User = Depends(get_current_user)
):
    """Record application switch event (organization-specific)"""
    try:
        # CRITICAL SECURITY: Verify time entry belongs to user's organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"id": app_data.time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        if not time_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # CRITICAL SECURITY: End previous application usage with organization validation
        await DatabaseOperations.update_document(
            "application_usage",
            {
                "user_id": current_user.id,
                "time_entry_id": app_data.time_entry_id,
                "organization_id": current_user.organization_id,
                "end_time": None
            },
            {
                "$set": {
                    "end_time": app_data.switch_time,
                    "duration_seconds": {"$subtract": [app_data.switch_time, "$start_time"]}
                }
            }
        )
        
        # Determine application category
        category = categorize_application(app_data.application_name)
        
        # CRITICAL SECURITY: Create new application usage record with organization context
        app_usage = ApplicationUsage(
            user_id=current_user.id,
            time_entry_id=app_data.time_entry_id,
            organization_id=current_user.organization_id,
            application_name=app_data.application_name,
            application_title=app_data.application_title,
            category=category,
            start_time=app_data.switch_time
        )
        
        await DatabaseOperations.create_document("application_usage", app_usage.dict())
        
        return {"message": "Application switch recorded successfully"}
        
    except Exception as e:
        logger.error(f"Application switch error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record application switch"
        )

@router.post("/website/navigate")
async def record_website_navigation(
    nav_data: WebsiteNavigation,
    current_user: User = Depends(get_current_user)
):
    """Record website navigation event (organization-specific)"""
    try:
        # CRITICAL SECURITY: Verify time entry belongs to user's organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"id": nav_data.time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        if not time_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # Extract domain from URL
        from urllib.parse import urlparse
        domain = urlparse(nav_data.url).netloc
        
        # Determine website category
        category = categorize_website(domain)
        
        # CRITICAL SECURITY: Check for existing visit with organization validation
        existing_visit = await DatabaseOperations.get_document(
            "website_visits",
            {
                "user_id": current_user.id,
                "time_entry_id": nav_data.time_entry_id,
                "organization_id": current_user.organization_id,
                "domain": domain,
                "visit_time": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
            }
        )
        
        if existing_visit:
            # CRITICAL SECURITY: Update existing visit with organization validation
            await DatabaseOperations.update_document(
                "website_visits",
                {"id": existing_visit["id"], "organization_id": current_user.organization_id},
                {
                    "$inc": {"page_views": 1, "duration_seconds": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        else:
            # CRITICAL SECURITY: Create new website visit with organization context
            website_visit = WebsiteVisit(
                user_id=current_user.id,
                time_entry_id=nav_data.time_entry_id,
                organization_id=current_user.organization_id,
                url=nav_data.url,
                domain=domain,
                title=nav_data.title,
                category=category,
                visit_time=nav_data.navigation_time
            )
            
            await DatabaseOperations.create_document("website_visits", website_visit.dict())
        
        return {"message": "Website navigation recorded successfully"}
        
    except Exception as e:
        logger.error(f"Website navigation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record website navigation"
        )

@router.get("/settings")
async def get_monitoring_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user's monitoring settings (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only get settings from same organization
        settings = await DatabaseOperations.get_document(
            "monitoring_settings",
            {"user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        
        if not settings:
            # CRITICAL SECURITY: Create default settings with organization context
            default_settings = MonitoringSettings(
                user_id=current_user.id, 
                organization_id=current_user.organization_id
            )
            await DatabaseOperations.create_document("monitoring_settings", default_settings.dict())
            return default_settings.dict()
        
        return settings
        
    except Exception as e:
        logger.error(f"Get monitoring settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get monitoring settings"
        )

@router.put("/settings")
async def update_monitoring_settings(
    settings_update: MonitoringSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user's monitoring settings (organization-specific)"""
    try:
        update_data = {k: v for k, v in settings_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # CRITICAL SECURITY: Update settings with organization validation
        result = await DatabaseOperations.update_document(
            "monitoring_settings",
            {"user_id": current_user.id, "organization_id": current_user.organization_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            # CRITICAL SECURITY: Create new settings with organization context
            settings = MonitoringSettings(
                user_id=current_user.id, 
                organization_id=current_user.organization_id, 
                **update_data
            )
            await DatabaseOperations.create_document("monitoring_settings", settings.dict())
        
        return {"message": "Monitoring settings updated successfully"}
        
    except Exception as e:
        logger.error(f"Update monitoring settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update monitoring settings"
        )

@router.get("/screenshots/{time_entry_id}")
async def get_screenshots(
    time_entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get screenshots for a time entry (organization-specific)"""
    try:
        # CRITICAL SECURITY: Verify time entry belongs to user's organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"id": time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        if not time_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # CRITICAL SECURITY: Only get screenshots from same organization
        screenshots = await DatabaseOperations.get_documents(
            "screenshots",
            {
                "user_id": current_user.id,
                "time_entry_id": time_entry_id,
                "organization_id": current_user.organization_id,
                "is_deleted": False
            },
            sort=[("timestamp", -1)]
        )
        
        return {"screenshots": screenshots}
        
    except Exception as e:
        logger.error(f"Get screenshots error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get screenshots"
        )

@router.get("/admin/screenshots")
async def get_admin_screenshots(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get screenshots for admin/manager view (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only admins and managers can access this endpoint
        if current_user.role not in ['admin', 'manager']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators and managers can view team screenshots"
            )
        
        # Build query filter
        query_filter = {
            "organization_id": current_user.organization_id,
            "is_deleted": False
        }
        
        # Filter by specific user if provided
        if user_id:
            query_filter["user_id"] = user_id
        
        # Filter by date range if provided
        if start_date or end_date:
            date_filter = {}
            if start_date:
                try:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    date_filter["$gte"] = start_dt
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid start_date format")
            
            if end_date:
                try:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    date_filter["$lte"] = end_dt
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid end_date format")
            
            if date_filter:
                query_filter["timestamp"] = date_filter
        
        logger.info(f"Admin {current_user.id} requesting screenshots with filter: {query_filter}")
        
        # CRITICAL SECURITY: Only get screenshots from same organization
        screenshots = await DatabaseOperations.get_documents(
            "screenshots",
            query_filter,
            sort=[("timestamp", -1)],
            limit=limit,
            skip=offset
        )
        
        # Get total count for pagination
        total_count = await DatabaseOperations.count_documents("screenshots", query_filter)
        
        # Get user names for display
        user_ids = list(set(s.get("user_id") for s in screenshots if s.get("user_id")))
        users = {}
        if user_ids:
            user_docs = await DatabaseOperations.get_documents(
                "users",
                {"id": {"$in": user_ids}, "organization_id": current_user.organization_id},
                projection={"id": 1, "name": 1, "email": 1}
            )
            users = {u["id"]: u for u in user_docs}
        
        # Enhance screenshots with user info
        enhanced_screenshots = []
        for screenshot in screenshots:
            user_info = users.get(screenshot.get("user_id"), {})
            enhanced_screenshots.append({
                **screenshot,
                "user_name": user_info.get("name", "Unknown User"),
                "user_email": user_info.get("email", "")
            })
        
        return {
            "screenshots": enhanced_screenshots,
            "total_count": total_count,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin get screenshots error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get screenshots"
        )

@router.delete("/screenshots/{screenshot_id}")
async def delete_screenshot(
    screenshot_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a screenshot (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only delete screenshots from same organization
        screenshot = await DatabaseOperations.get_document(
            "screenshots",
            {"id": screenshot_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        
        if not screenshot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Screenshot not found"
            )
        
        # Mark as deleted instead of actual deletion for audit trail
        await DatabaseOperations.update_document(
            "screenshots",
            {"id": screenshot_id},
            {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
        )
        
        return {"message": "Screenshot deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete screenshot error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete screenshot"
        )

# Helper functions
def create_thumbnail(image_content: bytes, size: tuple = (200, 150)) -> bytes:
    """Create thumbnail from image content"""
    try:
        with Image.open(io.BytesIO(image_content)) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Save thumbnail to bytes
            thumbnail_io = io.BytesIO()
            img.save(thumbnail_io, format="JPEG", quality=85)
            return thumbnail_io.getvalue()
    except Exception as e:
        logger.error(f"Thumbnail creation error: {e}")
        return image_content  # Return original if thumbnail creation fails

def categorize_application(app_name: str) -> ApplicationCategory:
    """Categorize application based on name"""
    app_name_lower = app_name.lower()
    
    # Development tools
    if any(keyword in app_name_lower for keyword in [
        'code', 'studio', 'intellij', 'pycharm', 'webstorm', 'sublime',
        'atom', 'notepad++', 'vim', 'emacs', 'git', 'terminal', 'cmd',
        'powershell', 'bash', 'docker', 'postman'
    ]):
        return ApplicationCategory.DEVELOPMENT
    
    # Design tools
    elif any(keyword in app_name_lower for keyword in [
        'photoshop', 'illustrator', 'figma', 'sketch', 'canva', 'gimp',
        'blender', 'autocad', 'solidworks'
    ]):
        return ApplicationCategory.DESIGN
    
    # Communication tools
    elif any(keyword in app_name_lower for keyword in [
        'slack', 'teams', 'discord', 'zoom', 'skype', 'telegram',
        'whatsapp', 'mail', 'outlook', 'gmail', 'thunderbird'
    ]):
        return ApplicationCategory.COMMUNICATION
    
    # Productive applications
    elif any(keyword in app_name_lower for keyword in [
        'excel', 'word', 'powerpoint', 'sheets', 'docs', 'slides',
        'notion', 'trello', 'asana', 'jira', 'confluence', 'onenote'
    ]):
        return ApplicationCategory.PRODUCTIVE
    
    # Distracting applications
    elif any(keyword in app_name_lower for keyword in [
        'game', 'steam', 'netflix', 'youtube', 'twitch', 'spotify',
        'music', 'player', 'entertainment'
    ]):
        return ApplicationCategory.DISTRACTING
    
    else:
        return ApplicationCategory.NEUTRAL

def categorize_website(domain: str) -> WebsiteCategory:
    """Categorize website based on domain"""
    domain_lower = domain.lower()
    
    # Social media
    if any(social in domain_lower for social in [
        'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
        'reddit.com', 'tiktok.com', 'snapchat.com', 'discord.com'
    ]):
        return WebsiteCategory.SOCIAL_MEDIA
    
    # Development/work related
    elif any(dev in domain_lower for dev in [
        'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
        'docs.python.org', 'developer.mozilla.org', 'w3schools.com',
        'stackoverflow.com', 'codepen.io', 'jsfiddle.net'
    ]):
        return WebsiteCategory.DEVELOPMENT
    
    # Communication
    elif any(comm in domain_lower for comm in [
        'slack.com', 'teams.microsoft.com', 'zoom.us', 'meet.google.com',
        'gmail.com', 'outlook.com', 'mail.yahoo.com'
    ]):
        return WebsiteCategory.COMMUNICATION
    
    # Entertainment
    elif any(entertainment in domain_lower for entertainment in [
        'youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com',
        'amazon.com/prime', 'hulu.com', 'disney.com'
    ]):
        return WebsiteCategory.ENTERTAINMENT
    
    # News
    elif any(news in domain_lower for news in [
        'cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com',
        'techcrunch.com', 'ycombinator.com', 'news.google.com'
    ]):
        return WebsiteCategory.NEWS
    
    # Search engines
    elif any(search in domain_lower for search in [
        'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
        'baidu.com', 'yandex.com'
    ]):
        return WebsiteCategory.SEARCH
    
    else:
        return WebsiteCategory.WORK_RELATED