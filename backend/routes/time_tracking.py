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
        
        # CRITICAL SECURITY: Verify project exists in same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": entry_data.project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # CRITICAL SECURITY: Verify task exists in same organization if provided
        if entry_data.task_id:
            task_data = await DatabaseOperations.get_document(
                "tasks", 
                {"id": entry_data.task_id, "organization_id": current_user.organization_id}
            )
            if not task_data:
                # Don't reveal if task exists in different organization
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )
        
        # CRITICAL SECURITY: Include organization_id
        time_entry = TimeEntry(
            user_id=current_user.id,
            project_id=entry_data.project_id,
            task_id=entry_data.task_id,
            organization_id=current_user.organization_id,
            start_time=datetime.utcnow(),
            description=entry_data.description
        )
        
        await DatabaseOperations.create_document("time_entries", time_entry.model_dump())
        
        # Update user status to active with organization context
        await DatabaseOperations.update_document(
            "users",
            {"id": current_user.id, "organization_id": current_user.organization_id},
            {"$set": {"status": "active", "last_active": datetime.utcnow()}}
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
        logger.info(f"Stopping time tracking for entry {entry_id} by user {current_user.id}")
        
        if not entry_id or not entry_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid entry ID provided"
            )
        
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            logger.warning(f"Time entry {entry_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        if entry_data.get("end_time"):
            logger.warning(f"Time entry {entry_id} is already stopped")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time entry already stopped"
            )
        
        end_time = datetime.utcnow()
        start_time = entry_data.get("start_time")
        
        if not start_time:
            logger.error(f"Time entry {entry_id} has no start time")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time entry: no start time found"
            )
        
        # Convert start_time if it's a string
        if isinstance(start_time, str):
            try:
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            except ValueError:
                logger.error(f"Invalid start_time format for entry {entry_id}: {start_time}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start time format"
                )
        
        # Calculate raw duration
        raw_duration = int((end_time - start_time).total_seconds())
        
        if raw_duration < 0:
            logger.error(f"Negative duration calculated for entry {entry_id}: {raw_duration}")
            raw_duration = 0
        
        # Get total pause duration
        total_pause_duration = entry_data.get("total_pause_duration", 0)
        
        # If currently paused, add the current pause period to total
        if entry_data.get("is_paused"):
            pause_periods = entry_data.get("pause_periods", [])
            if pause_periods and pause_periods[-1].get("resume_time") is None:
                last_pause_start = pause_periods[-1]["pause_time"]
                if isinstance(last_pause_start, str):
                    last_pause_start = datetime.fromisoformat(last_pause_start.replace('Z', '+00:00'))
                current_pause_duration = int((end_time - last_pause_start).total_seconds())
                total_pause_duration += current_pause_duration
        
        # Final duration = raw duration - total pause time
        duration = max(0, raw_duration - total_pause_duration)
        
        logger.info(f"Duration calculation: raw={raw_duration}s, pause={total_pause_duration}s, final={duration}s")
        
        update_data = {
            "end_time": end_time,
            "duration": duration
        }
        
        logger.info(f"Updating time entry {entry_id} with duration {duration} seconds")
        
        success = await DatabaseOperations.update_document(
            "time_entries",
            {"id": entry_id},
            update_data
        )
        
        if not success:
            logger.error(f"Failed to update time entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update time entry"
            )
        
        # Update project hours safely
        project_id = entry_data.get("project_id")
        if project_id and duration > 0:
            try:
                await DatabaseOperations.update_document(
                    "projects",
                    {"id": project_id},
                    {"$inc": {"hours_tracked": duration / 3600}}
                )
                logger.info(f"Updated project {project_id} with {duration/3600} hours")
            except Exception as project_error:
                logger.error(f"Failed to update project hours: {project_error}")
                # Don't fail the whole operation if project update fails
        
        # Get updated entry
        updated_entry = await DatabaseOperations.get_document("time_entries", {"id": entry_id})
        if not updated_entry:
            logger.error(f"Failed to retrieve updated entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated time entry"
            )
        
        logger.info(f"Successfully stopped time tracking for entry {entry_id}")
        return TimeEntry(**updated_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stop time tracking error for entry {entry_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop time tracking"
        )

@router.post("/pause/{entry_id}", response_model=TimeEntry)
async def pause_time_tracking(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Pause time tracking"""
    try:
        logger.info(f"Pausing time tracking for entry {entry_id} by user {current_user.id}")
        
        if not entry_id or not entry_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid entry ID provided"
            )
        
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            logger.warning(f"Time entry {entry_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        if entry_data.get("end_time"):
            logger.warning(f"Time entry {entry_id} is already stopped")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot pause a stopped time entry"
            )
        
        if entry_data.get("is_paused"):
            logger.warning(f"Time entry {entry_id} is already paused")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time entry is already paused"
            )
        
        pause_time = datetime.utcnow()
        pause_periods = entry_data.get("pause_periods", [])
        pause_periods.append({"pause_time": pause_time, "resume_time": None})
        
        update_data = {
            "is_paused": True,
            "pause_periods": pause_periods
        }
        
        success = await DatabaseOperations.update_document(
            "time_entries",
            {"id": entry_id},
            update_data
        )
        
        if not success:
            logger.error(f"Failed to pause time entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to pause time entry"
            )
        
        # Get updated entry
        updated_entry = await DatabaseOperations.get_document("time_entries", {"id": entry_id})
        if not updated_entry:
            logger.error(f"Failed to retrieve updated entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated time entry"
            )
        
        logger.info(f"Successfully paused time tracking for entry {entry_id}")
        return TimeEntry(**updated_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pause time tracking error for entry {entry_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause time tracking"
        )

@router.post("/resume/{entry_id}", response_model=TimeEntry)
async def resume_time_tracking(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """Resume time tracking"""
    try:
        logger.info(f"Resuming time tracking for entry {entry_id} by user {current_user.id}")
        
        if not entry_id or not entry_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid entry ID provided"
            )
        
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": entry_id, "user_id": current_user.id}
        )
        
        if not entry_data:
            logger.warning(f"Time entry {entry_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )
        
        if entry_data.get("end_time"):
            logger.warning(f"Time entry {entry_id} is already stopped")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot resume a stopped time entry"
            )
        
        if not entry_data.get("is_paused"):
            logger.warning(f"Time entry {entry_id} is not paused")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time entry is not paused"
            )
        
        resume_time = datetime.utcnow()
        pause_periods = entry_data.get("pause_periods", [])
        
        # Update the last pause period with resume time
        if pause_periods and pause_periods[-1].get("resume_time") is None:
            pause_periods[-1]["resume_time"] = resume_time
        
        # Calculate total pause duration
        total_pause_duration = 0
        for period in pause_periods:
            if period.get("pause_time") and period.get("resume_time"):
                pause_start = period["pause_time"]
                pause_end = period["resume_time"]
                
                # Convert to datetime if they're strings
                if isinstance(pause_start, str):
                    pause_start = datetime.fromisoformat(pause_start.replace('Z', '+00:00'))
                if isinstance(pause_end, str):
                    pause_end = datetime.fromisoformat(pause_end.replace('Z', '+00:00'))
                
                total_pause_duration += int((pause_end - pause_start).total_seconds())
        
        update_data = {
            "is_paused": False,
            "pause_periods": pause_periods,
            "total_pause_duration": total_pause_duration
        }
        
        success = await DatabaseOperations.update_document(
            "time_entries",
            {"id": entry_id},
            update_data
        )
        
        if not success:
            logger.error(f"Failed to resume time entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to resume time entry"
            )
        
        # Get updated entry
        updated_entry = await DatabaseOperations.get_document("time_entries", {"id": entry_id})
        if not updated_entry:
            logger.error(f"Failed to retrieve updated entry {entry_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated time entry"
            )
        
        logger.info(f"Successfully resumed time tracking for entry {entry_id}")
        return TimeEntry(**updated_entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume time tracking error for entry {entry_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume time tracking"
        )

@router.get("/active", response_model=Optional[TimeEntry])
async def get_active_time_entry(current_user: User = Depends(get_current_user)):
    """Get current user's active time entry"""
    try:
        # CRITICAL SECURITY: Only get active entries from same organization
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"user_id": current_user.id, "organization_id": current_user.organization_id, "end_time": None}
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
    """Get time entries for current user (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only get entries from same organization
        query = {"user_id": current_user.id, "organization_id": current_user.organization_id}
        
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
        # CRITICAL SECURITY: Verify project exists in same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": entry_data.project_id, "organization_id": current_user.organization_id}
        )
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
        
        # CRITICAL SECURITY: Include organization_id in manual time entry
        time_entry = TimeEntry(
            user_id=current_user.id,
            project_id=entry_data.project_id,
            task_id=entry_data.task_id,
            organization_id=current_user.organization_id,
            start_time=entry_data.start_time,
            end_time=entry_data.end_time,
            duration=duration,
            description=entry_data.description,
            is_manual=True
        )
        
        await DatabaseOperations.create_document("time_entries", time_entry.model_dump())
        
        # CRITICAL SECURITY: Update project hours with organization validation
        await DatabaseOperations.update_document(
            "projects",
            {"id": entry_data.project_id, "organization_id": current_user.organization_id},
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
        
        update_data = entry_update.model_dump(exclude_unset=True)
        
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
    """Record activity data (organization-specific)"""
    try:
        # CRITICAL SECURITY: Include organization context
        activity.user_id = current_user.id
        activity.organization_id = current_user.organization_id
        
        await DatabaseOperations.create_document("activity_data", activity.model_dump())
        
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
        # CRITICAL SECURITY: Verify time entry belongs to user in same organization
        entry_data = await DatabaseOperations.get_document(
            "time_entries",
            {"id": time_entry_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
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
        
        # CRITICAL SECURITY: Include organization context in screenshot
        screenshot = Screenshot(
            user_id=current_user.id,
            time_entry_id=time_entry_id,
            organization_id=current_user.organization_id,
            url=screenshot_url
        )
        
        await DatabaseOperations.create_document("screenshots", screenshot.model_dump())
        
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
        
        logger.info(f"Getting daily report for user {current_user.id} on date {date}")
        
        start_datetime = datetime.combine(date, datetime.min.time())
        end_datetime = datetime.combine(date, datetime.max.time())
        
        # CRITICAL SECURITY: Get time entries for the day from same organization
        entries_data = await DatabaseOperations.get_documents(
            "time_entries",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "start_time": {"$gte": start_datetime, "$lte": end_datetime}
            }
        )
        
        logger.info(f"Found {len(entries_data)} entries for the day")
        
        # Calculate total hours safely
        total_duration = 0
        for entry in entries_data:
            duration = entry.get("duration", 0)
            if isinstance(duration, (int, float)) and duration > 0:
                total_duration += duration
        
        total_hours = total_duration / 3600 if total_duration > 0 else 0
        
        # Group by project
        projects = {}
        for entry in entries_data:
            try:
                project_id = entry.get("project_id")
                if not project_id:
                    continue
                    
                if project_id not in projects:
                    # CRITICAL SECURITY: Only get projects from same organization
                    project_data = await DatabaseOperations.get_document(
                        "projects", 
                        {"id": project_id, "organization_id": current_user.organization_id}
                    )
                    projects[project_id] = {
                        "project_name": project_data.get("name", "Unknown") if project_data else "Unknown",
                        "hours": 0,
                        "entries": 0
                    }
                
                entry_duration = entry.get("duration", 0)
                if isinstance(entry_duration, (int, float)) and entry_duration > 0:
                    projects[project_id]["hours"] += entry_duration / 3600
                projects[project_id]["entries"] += 1
            except Exception as project_error:
                logger.error(f"Error processing project data for entry {entry.get('id', 'unknown')}: {project_error}")
                continue
        
        # Calculate activity level and real screenshots count
        activity_level = min(100, max(0, total_hours * 10)) if total_hours > 0 else 0
        
        # Count actual screenshots for this user on this date
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        screenshots_count = await DatabaseOperations.count_documents(
            "screenshots",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "timestamp": {"$gte": start_of_day, "$lte": end_of_day},
                "is_deleted": False
            }
        )
        
        response_data = {
            "date": date.isoformat(),
            "total_hours": round(total_hours, 2),
            "projects": projects,
            "entries_count": len(entries_data),
            "activity_level": round(activity_level, 1),
            "screenshots_count": screenshots_count
        }
        
        logger.info(f"Daily report generated successfully: {response_data}")
        return response_data
        
    except Exception as e:
        logger.error(f"Get daily report error: {e}", exc_info=True)
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
    """Get team time tracking report (organization-specific)"""
    try:
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=7)).date()
        if not end_date:
            end_date = datetime.utcnow().date()
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # CRITICAL SECURITY: Aggregate team data only from same organization
        pipeline = [
            {
                "$match": {
                    "organization_id": current_user.organization_id,
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
        
        # CRITICAL SECURITY: Get user details only from same organization
        for user_data in team_data:
            user_info = await DatabaseOperations.get_document(
                "users", 
                {"id": user_data["_id"], "organization_id": current_user.organization_id}
            )
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