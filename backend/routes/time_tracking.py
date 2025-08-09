from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from typing import List, Optional
from datetime import datetime, timedelta, date
from models.time_tracking import TimeEntry, TimeEntryCreate, TimeEntryUpdate, TimeEntryManual, ActivityData, Screenshot
from models.user import User
from auth.dependencies import get_current_user, require_admin_or_manager
from database.mongodb import DatabaseOperations
from services.storage import storage_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/time-tracking", tags=["time tracking"])

@router.post("/start", response_model=TimeEntry)
async def start_time_tracking(
    entry_data: TimeEntryCreate,
    current_user: User = Depends(get_current_user)
):
    """Start time tracking for a project/task"""
    try:
        # Check if user has any active time entries
        active_entry = await DatabaseOperations.get_document(
            "time_entries",
            {"user_id": current_user.id, "end_time": None}
        )
        
        if active_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active time entry. Please stop it first."
            )
        
        # Verify project exists
        project_data = await DatabaseOperations.get_document("projects", {"id": entry_data.project_id})
        if not project_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify task exists if provided
        if entry_data.task_id:
            task_data = await DatabaseOperations.get_document("tasks", {"id": entry_data.task_id})
            if not task_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )
        
        time_entry = TimeEntry(
            user_id=current_user.id,
            project_id=entry_data.project_id,
            task_id=entry_data.task_id,
            start_time=datetime.utcnow(),
            description=entry_data.description
        )
        
        await DatabaseOperations.create_document("time_entries", time_entry.dict())
        
        # Update user status to active
        await DatabaseOperations.update_document(
            "users",
            {"id": current_user.id},
            {"status": "active", "last_active": datetime.utcnow()}
        )
        
        return time_entry
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start time tracking error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start time tracking"
        )

@router.post("/stop/{entry_id}", response_model=TimeEntry)
async def stop_time_tracking(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Stop time tracking"""
    try:
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        if entry_data.get("end_time"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time entry already stopped"
            )
        
        end_time = datetime.utcnow()
        start_time = entry_data["start_time"]
        duration = int((end_time - start_time).total_seconds())
        
        update_data = {
            "end_time": end_time,
            "duration": duration
        }
        
        await DatabaseOperations.update_document(
            "time_entries",
            {"id": entry_id},
            update_data
        )
        
        # Update project hours
        await DatabaseOperations.update_document(
            "projects",
            {"id": entry_data["project_id"]},
            {"$inc": {"hours_tracked": duration / 3600}}
        )
        
        # Get updated entry
        updated_entry = await DatabaseOperations.get_document("time_entries", {"id": entry_id})
        return TimeEntry(**updated_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stop time tracking error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop time tracking"
        )

@router.get("/active", response_model=Optional[TimeEntry])
async def get_active_time_entry(current_user: User = Depends(get_current_user)):
    """Get current user's active time entry"""
    try:
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"user_id": current_user.id, "end_time": None}
        )
        
        if not entry_data:
            return None
        
        return TimeEntry(**entry_data)
        
    except Exception as e:
        logger.error(f"Get active time entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get active time entry"
        )

@router.get("/entries", response_model=List[TimeEntry])
async def get_time_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get time entries for current user"""
    try:
        query = {"user_id": current_user.id}
        
        if project_id:
            query["project_id"] = project_id
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = datetime.combine(start_date, datetime.min.time())
            if end_date:
                date_query["$lte"] = datetime.combine(end_date, datetime.max.time())
            query["start_time"] = date_query
        
        entries_data = await DatabaseOperations.get_documents(
            "time_entries",
            query,
            sort=[("start_time", -1)],
            skip=skip,
            limit=limit
        )
        
        return [TimeEntry(**entry) for entry in entries_data]
        
    except Exception as e:
        logger.error(f"Get time entries error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get time entries"
        )

@router.post("/manual", response_model=TimeEntry)
async def create_manual_time_entry(
    entry_data: TimeEntryManual,
    current_user: User = Depends(get_current_user)
):
    """Create manual time entry"""
    try:
        # Verify project exists
        project_data = await DatabaseOperations.get_document("projects", {"id": entry_data.project_id})
        if not project_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Calculate duration
        duration = int((entry_data.end_time - entry_data.start_time).total_seconds())
        
        if duration <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time"
            )
        
        time_entry = TimeEntry(
            user_id=current_user.id,
            project_id=entry_data.project_id,
            task_id=entry_data.task_id,
            start_time=entry_data.start_time,
            end_time=entry_data.end_time,
            duration=duration,
            description=entry_data.description,
            is_manual=True
        )
        
        await DatabaseOperations.create_document("time_entries", time_entry.dict())
        
        # Update project hours
        await DatabaseOperations.update_document(
            "projects",
            {"id": entry_data.project_id},
            {"$inc": {"hours_tracked": duration / 3600}}
        )
        
        return time_entry
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create manual time entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create manual time entry"
        )

@router.put("/entries/{entry_id}", response_model=TimeEntry)
async def update_time_entry(
    entry_id: str,
    entry_update: TimeEntryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update time entry"""
    try:
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        update_data = entry_update.dict(exclude_unset=True)
        
        if update_data:
            await DatabaseOperations.update_document(
                "time_entries",
                {"id": entry_id},
                update_data
            )
        
        # Get updated entry
        updated_entry = await DatabaseOperations.get_document("time_entries", {"id": entry_id})
        return TimeEntry(**updated_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update time entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update time entry"
        )

@router.post("/activity", response_model=ActivityData)
async def record_activity(
    activity: ActivityData,
    current_user: User = Depends(get_current_user)
):
    """Record activity data"""
    try:
        activity.user_id = current_user.id
        
        await DatabaseOperations.create_document("activity_data", activity.dict())
        
        return activity
        
    except Exception as e:
        logger.error(f"Record activity error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record activity"
        )

@router.post("/screenshot", response_model=Screenshot)
async def upload_screenshot(
    time_entry_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload screenshot"""
    try:
        # Verify time entry belongs to user
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": time_entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        # Save screenshot using storage service
        screenshot_url = await storage_service.save_file(
            file=file,
            subfolder="screenshots",
            user_id=current_user.id
        )
        
        screenshot = Screenshot(
            user_id=current_user.id,
            time_entry_id=time_entry_id,
            url=screenshot_url
        )
        
        await DatabaseOperations.create_document("screenshots", screenshot.dict())
        
        # Add screenshot to time entry
        await DatabaseOperations.update_document(
            "time_entries",
            {"id": time_entry_id},
            {"$push": {"screenshots": screenshot_url}}
        )
        
        return screenshot
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload screenshot error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload screenshot"
        )

@router.get("/reports/daily")
async def get_daily_report(
    date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """Get daily time tracking report"""
    try:
        if not date:
            date = datetime.utcnow().date()
        
        start_datetime = datetime.combine(date, datetime.min.time())
        end_datetime = datetime.combine(date, datetime.max.time())
        
        # Get time entries for the day
        entries_data = await DatabaseOperations.get_documents(
            "time_entries",
            {
                "user_id": current_user.id,
                "start_time": {"$gte": start_datetime, "$lte": end_datetime}
            }
        )
        
        total_hours = sum(entry.get("duration", 0) for entry in entries_data) / 3600
        
        # Group by project
        projects = {}
        for entry in entries_data:
            project_id = entry["project_id"]
            if project_id not in projects:
                project_data = await DatabaseOperations.get_document("projects", {"id": project_id})
                projects[project_id] = {
                    "project_name": project_data["name"] if project_data else "Unknown",
                    "hours": 0,
                    "entries": 0
                }
            projects[project_id]["hours"] += entry.get("duration", 0) / 3600
            projects[project_id]["entries"] += 1
        
        return {
            "date": date,
            "total_hours": total_hours,
            "projects": projects,
            "entries_count": len(entries_data)
        }
        
    except Exception as e:
        logger.error(f"Get daily report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get daily report"
        )

@router.get("/reports/team")
async def get_team_time_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_manager)
):
    """Get team time tracking report"""
    try:
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=7)).date()
        if not end_date:
            end_date = datetime.utcnow().date()
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Aggregate team data
        pipeline = [
            {
                "$match": {
                    "start_time": {"$gte": start_datetime, "$lte": end_datetime}
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "total_hours": {"$sum": "$duration"},
                    "entries_count": {"$sum": 1},
                    "projects": {"$addToSet": "$project_id"}
                }
            }
        ]
        
        team_data = await DatabaseOperations.aggregate("time_entries", pipeline)
        
        # Get user details
        for user_data in team_data:
            user_info = await DatabaseOperations.get_document("users", {"id": user_data["_id"]})
            user_data["user_name"] = user_info["name"] if user_info else "Unknown"
            user_data["total_hours"] = user_data["total_hours"] / 3600
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "team_data": team_data
        }
        
    except Exception as e:
        logger.error(f"Get team time report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get team time report"
        )