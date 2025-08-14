from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import base64
import os
import uuid
import asyncio
from PIL import Image
import io

from auth.dependencies import get_current_user
from models.user import User
from models.productivity import (
    RealTimeActivity, ProductivityReport, ProductivityAlert,
    MouseActivityData, KeyboardActivityData, ScreenshotAnalysis,
    StartTrackingRequest, ActivityUpdateRequest, ProductivityReportRequest,
    TrackingStatus, ProductivityLevel, AlertType, ProductivityGoal
)
from models.monitoring import ScreenshotData, ScreenshotUpload
from database.mongodb import DatabaseOperations
from utils.productivity_analyzer import ProductivityAnalyzer
from utils.screenshot_processor import ScreenshotProcessor
from utils.notification_service import NotificationService

router = APIRouter(prefix="/api/productivity", tags=["productivity"])

# Real-time Activity Tracking
@router.post("/tracking/start")
async def start_productivity_tracking(
    request: StartTrackingRequest,
    current_user: User = Depends(get_current_user)
):
    """Start productivity tracking for a time entry"""
    try:
        # Verify time entry belongs to user and organization
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {
                "id": request.time_entry_id,
                "user_id": current_user.id,
                "organization_id": current_user.organization_id
            }
        )
        
        if not time_entry:
            raise HTTPException(status_code=404, detail="Time entry not found")
        
        # Create real-time activity tracking record
        activity_tracking = RealTimeActivity(
            user_id=current_user.id,
            time_entry_id=request.time_entry_id,
            organization_id=current_user.organization_id,
            tracking_status=TrackingStatus.ACTIVE,
            current_activity_level=0.0,
            productivity_level=ProductivityLevel.MODERATE
        )
        
        # Store in database
        await DatabaseOperations.create_document(
            "real_time_activity",
            activity_tracking.dict()
        )
        
        # Initialize screenshot processor if enabled
        if request.enable_screenshots:
            await ScreenshotProcessor.initialize_for_user(
                current_user.id,
                current_user.organization_id,
                request.time_entry_id
            )
        
        return {
            "success": True,
            "message": "Productivity tracking started",
            "activity_id": activity_tracking.id,
            "settings": {
                "screenshots_enabled": request.enable_screenshots,
                "keyboard_tracking": request.enable_keyboard_tracking,
                "mouse_tracking": request.enable_mouse_tracking
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start tracking: {str(e)}")

@router.post("/tracking/activity")
async def update_activity_data(
    request: ActivityUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update real-time activity data during tracking"""
    try:
        # Get current tracking session
        tracking_session = await DatabaseOperations.get_document(
            "real_time_activity",
            {
                "time_entry_id": request.time_entry_id,
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "tracking_status": TrackingStatus.ACTIVE
            }
        )
        
        if not tracking_session:
            raise HTTPException(status_code=404, detail="No active tracking session found")
        
        # Calculate activity metrics
        current_time = datetime.utcnow()
        time_window = timedelta(minutes=5)  # 5-minute window
        
        # Store keyboard activity if provided
        if request.keystroke_count > 0:
            keyboard_data = KeyboardActivityData(
                user_id=current_user.id,
                time_entry_id=request.time_entry_id,
                organization_id=current_user.organization_id,
                keystroke_count=request.keystroke_count,
                typing_speed_wpm=request.typing_speed,
                active_application=request.active_application
            )
            await DatabaseOperations.create_document(
                "keyboard_activity",
                keyboard_data.dict()
            )
        
        # Store mouse activity if provided
        if request.mouse_clicks > 0 or request.mouse_movements > 0:
            mouse_data = MouseActivityData(
                user_id=current_user.id,
                time_entry_id=request.time_entry_id,
                organization_id=current_user.organization_id,
                click_count=request.mouse_clicks,
                movement_distance=request.movement_distance,
                active_application=request.active_application
            )
            await DatabaseOperations.create_document(
                "mouse_activity",
                mouse_data.dict()
            )
        
        # Calculate current activity level and productivity
        activity_level = await ProductivityAnalyzer.calculate_activity_level(
            request.keystroke_count,
            request.mouse_clicks,
            request.mouse_movements
        )
        
        productivity_level = await ProductivityAnalyzer.determine_productivity_level(
            activity_level,
            request.active_application,
            request.current_url
        )
        
        # Update tracking session
        updated_tracking = {
            "current_activity_level": activity_level,
            "productivity_level": productivity_level,
            "recent_keystrokes": request.keystroke_count,
            "recent_mouse_clicks": request.mouse_clicks,
            "recent_mouse_movements": request.mouse_movements,
            "current_application": request.active_application,
            "current_website": request.current_url,
            "timestamp": current_time
        }
        
        await DatabaseOperations.update_document(
            "real_time_activity",
            {"id": tracking_session["id"]},
            updated_tracking
        )
        
        # Check for alerts
        alerts = await ProductivityAnalyzer.check_for_alerts(
            current_user.id,
            current_user.organization_id,
            activity_level,
            productivity_level
        )
        
        # Send alerts to admins if necessary
        if alerts:
            await NotificationService.send_productivity_alerts(
                current_user.organization_id,
                alerts
            )
        
        return {
            "success": True,
            "activity_level": activity_level,
            "productivity_level": productivity_level,
            "alerts_generated": len(alerts),
            "recommendations": await ProductivityAnalyzer.get_real_time_recommendations(
                activity_level,
                productivity_level
            )
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update activity: {str(e)}")

@router.post("/screenshots/upload")
async def upload_screenshot(
    time_entry_id: str = Form(...),
    activity_level: float = Form(...),
    screenshot: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and analyze screenshot during tracking"""
    try:
        # Verify time entry
        time_entry = await DatabaseOperations.get_document(
            "time_entries",
            {
                "id": time_entry_id,
                "user_id": current_user.id,
                "organization_id": current_user.organization_id
            }
        )
        
        if not time_entry:
            raise HTTPException(status_code=404, detail="Time entry not found")
        
        # Process screenshot
        screenshot_id = str(uuid.uuid4())
        screenshot_data = await screenshot.read()
        
        # Save screenshot securely
        upload_dir = os.getenv("UPLOAD_DIR", "uploads")
        org_dir = os.path.join(upload_dir, "screenshots", current_user.organization_id)
        os.makedirs(org_dir, exist_ok=True)
        
        screenshot_path = os.path.join(org_dir, f"{screenshot_id}.png")
        thumbnail_path = os.path.join(org_dir, f"{screenshot_id}_thumb.png")
        
        # Save original screenshot
        with open(screenshot_path, "wb") as f:
            f.write(screenshot_data)
        
        # Create thumbnail
        await ScreenshotProcessor.create_thumbnail(screenshot_data, thumbnail_path)
        
        # Analyze screenshot with AI
        analysis = await ScreenshotProcessor.analyze_screenshot(
            screenshot_data,
            current_user.id,
            current_user.organization_id
        )
        
        # Store screenshot record
        screenshot_record = ScreenshotData(
            id=screenshot_id,
            user_id=current_user.id,
            time_entry_id=time_entry_id,
            organization_id=current_user.organization_id,
            screenshot_url=f"/uploads/screenshots/{current_user.organization_id}/{screenshot_id}.png",
            thumbnail_url=f"/uploads/screenshots/{current_user.organization_id}/{screenshot_id}_thumb.png",
            activity_level=activity_level
        )
        
        await DatabaseOperations.create_document(
            "screenshots",
            screenshot_record.dict()
        )
        
        # Store analysis
        if analysis:
            await DatabaseOperations.create_document(
                "screenshot_analysis",
                analysis.dict()
            )
        
        # Update real-time tracking
        await DatabaseOperations.update_document(
            "real_time_activity",
            {
                "time_entry_id": time_entry_id,
                "user_id": current_user.id,
                "organization_id": current_user.organization_id
            },
            {"last_screenshot_time": datetime.utcnow()}
        )
        
        return {
            "success": True,
            "screenshot_id": screenshot_id,
            "analysis": analysis.dict() if analysis else None,
            "productivity_score": analysis.productivity_score if analysis else 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload screenshot: {str(e)}")

@router.post("/tracking/stop")
async def stop_productivity_tracking(
    time_entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Stop productivity tracking and generate summary"""
    try:
        # Update tracking status
        await DatabaseOperations.update_document(
            "real_time_activity",
            {
                "time_entry_id": time_entry_id,
                "user_id": current_user.id,
                "organization_id": current_user.organization_id
            },
            {"tracking_status": TrackingStatus.STOPPED}
        )
        
        # Generate session summary
        summary = await ProductivityAnalyzer.generate_session_summary(
            current_user.id,
            current_user.organization_id,
            time_entry_id
        )
        
        # Store summary in database
        await DatabaseOperations.create_document(
            "productivity_summaries",
            summary
        )
        
        return {
            "success": True,
            "message": "Tracking stopped successfully",
            "session_summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop tracking: {str(e)}")

# Admin Reports and Analytics
@router.get("/reports/user/{user_id}")
async def get_user_productivity_report(
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get detailed productivity report for a specific user (admin only)"""
    try:
        # Verify admin access
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Verify user belongs to same organization
        target_user = await DatabaseOperations.get_document(
            "users",
            {"id": user_id, "organization_id": current_user.organization_id}
        )
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found in your organization")
        
        # Generate comprehensive report
        report = await ProductivityAnalyzer.generate_user_report(
            user_id,
            current_user.organization_id,
            start_date,
            end_date
        )
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/reports/organization")
async def get_organization_productivity_report(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get organization-wide productivity report (admin only)"""
    try:
        # Verify admin access
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Generate organization report
        report = await ProductivityAnalyzer.generate_organization_report(
            current_user.organization_id,
            start_date,
            end_date
        )
        
        return report
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate organization report: {str(e)}")

@router.get("/alerts")
async def get_productivity_alerts(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    unread_only: bool = False
):
    """Get productivity alerts for admin"""
    try:
        # Verify admin access
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Build query
        query = {"organization_id": current_user.organization_id}
        if unread_only:
            query["is_read"] = False
        
        # Get alerts
        alerts = await DatabaseOperations.get_documents(
            "productivity_alerts",
            query,
            limit=limit,
            sort=[("triggered_at", -1)]
        )
        
        return {
            "alerts": alerts,
            "total_count": len(alerts),
            "unread_count": len([a for a in alerts if not a.get("is_read", False)])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@router.put("/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark productivity alert as read"""
    try:
        # Verify admin access
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Update alert
        result = await DatabaseOperations.update_document(
            "productivity_alerts",
            {
                "id": alert_id,
                "organization_id": current_user.organization_id
            },
            {"is_read": True}
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"success": True, "message": "Alert marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark alert as read: {str(e)}")

@router.get("/users/active")
async def get_currently_active_users(
    current_user: User = Depends(get_current_user)
):
    """Get users currently being tracked"""
    try:
        # Verify admin access
        if current_user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get active tracking sessions
        active_sessions = await DatabaseOperations.get_documents(
            "real_time_activity",
            {
                "organization_id": current_user.organization_id,
                "tracking_status": TrackingStatus.ACTIVE
            }
        )
        
        # Enrich with user data
        active_users = []
        for session in active_sessions:
            user = await DatabaseOperations.get_document(
                "users",
                {"id": session["user_id"]}
            )
            if user:
                active_users.append({
                    "user_id": session["user_id"],
                    "user_name": user.get("name", "Unknown"),
                    "current_activity_level": session.get("current_activity_level", 0),
                    "productivity_level": session.get("productivity_level", "moderate"),
                    "current_application": session.get("current_application"),
                    "tracking_duration": (datetime.utcnow() - session.get("timestamp", datetime.utcnow())).total_seconds(),
                    "last_activity": session.get("timestamp")
                })
        
        return {
            "active_users": active_users,
            "total_active": len(active_users)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active users: {str(e)}")

# Privacy and Settings
@router.get("/privacy/settings")
async def get_privacy_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user's privacy settings for productivity tracking"""
    try:
        settings = await DatabaseOperations.get_document(
            "monitoring_settings",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id
            }
        )
        
        if not settings:
            # Create default settings
            default_settings = {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "screenshot_enabled": True,
                "screenshot_interval": 600,
                "blur_screenshots": False,
                "keystroke_tracking": True,
                "application_tracking": True,
                "website_tracking": True,
                "privacy_mode": False
            }
            
            await DatabaseOperations.create_document(
                "monitoring_settings",
                default_settings
            )
            
            return default_settings
        
        return settings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get privacy settings: {str(e)}")

@router.post("/consent")
async def record_user_consent(
    consent_given: bool,
    current_user: User = Depends(get_current_user)
):
    """Record user consent for productivity tracking"""
    try:
        consent_record = {
            "user_id": current_user.id,
            "organization_id": current_user.organization_id,
            "consent_given": consent_given,
            "consent_date": datetime.utcnow(),
            "consent_version": "1.0",
            "ip_address": None,  # Would be captured from request in production
            "user_agent": None   # Would be captured from request in production
        }
        
        await DatabaseOperations.create_document(
            "user_consent",
            consent_record
        )
        
        return {
            "success": True,
            "message": f"Consent {'granted' if consent_given else 'revoked'} successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record consent: {str(e)}")