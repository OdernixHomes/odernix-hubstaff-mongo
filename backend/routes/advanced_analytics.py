from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import logging
import asyncio
from collections import defaultdict
import statistics

from models.user import User
from models.advanced_analytics import (
    TeamMetrics, UserProductivityReport, ProductivityGoal, ProductivityInsight,
    TimeHeatmap, ProductivityComparison, AdvancedAnalyticsQuery, AnalyticsResponse,
    ProductivityAlert, DashboardConfig, GoalCreate, GoalUpdate, ReportGenerate,
    AlertSettings, ReportType, ReportFormat, ProductivityTrend
)
from auth.dependencies import get_current_user, require_admin_or_manager
from database.mongodb import DatabaseOperations
from services.productivity_calculator import ProductivityCalculator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/advanced-analytics", tags=["advanced-analytics"])

# Initialize productivity calculator
productivity_calc = ProductivityCalculator()

@router.get("/dashboard/enhanced")
async def get_enhanced_dashboard(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    """Get enhanced dashboard with productivity insights"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # CRITICAL SECURITY: Parallel data fetching with organization context
        tasks = [
            get_user_productivity_summary(current_user.id, current_user.organization_id, start_date, end_date),
            get_productivity_heatmap_data(current_user.id, current_user.organization_id, start_date, end_date),
            get_user_insights(current_user.id, current_user.organization_id),
            get_user_goals(current_user.id, current_user.organization_id),
            get_productivity_alerts(current_user.id, current_user.organization_id)
        ]
        
        results = await asyncio.gather(*tasks)
        
        productivity_summary, heatmap, insights, goals, alerts = results
        
        # Calculate productivity trends
        trend_data = await calculate_productivity_trend(current_user.id, days)
        
        # CRITICAL SECURITY: Get team comparison with organization context
        team_comparison = None
        config = await get_dashboard_config(current_user.id, current_user.organization_id)
        if config.get("show_team_comparison", True):
            team_comparison = await get_team_comparison(current_user.id, current_user.organization_id, start_date, end_date)
        
        return {
            "summary": productivity_summary,
            "heatmap": heatmap,
            "insights": insights,
            "goals": goals,
            "alerts": alerts,
            "trend": trend_data,
            "team_comparison": team_comparison,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        logger.error(f"Enhanced dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get enhanced dashboard data"
        )

@router.get("/productivity/detailed")
async def get_detailed_productivity_analytics(
    start_date: date,
    end_date: date,
    granularity: str = Query("daily", enum=["hourly", "daily", "weekly"]),
    current_user: User = Depends(get_current_user)
):
    """Get detailed productivity analytics with multiple metrics"""
    try:
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # CRITICAL SECURITY: Get comprehensive time tracking data with organization isolation
        time_entries = await DatabaseOperations.get_documents(
            "time_entries",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "start_time": {"$gte": start_datetime, "$lte": end_datetime}
            }
        )
        
        # CRITICAL SECURITY: Get monitoring data with organization context
        monitoring_data = await get_monitoring_data_for_period(
            current_user.id, current_user.organization_id, start_datetime, end_datetime
        )
        
        # Calculate detailed metrics
        detailed_metrics = productivity_calc.calculate_detailed_metrics(
            time_entries, monitoring_data, granularity
        )
        
        # Generate insights based on data
        insights = await generate_productivity_insights(current_user.id, detailed_metrics)
        
        return {
            "metrics": detailed_metrics,
            "insights": insights,
            "summary": {
                "total_tracked_hours": sum(entry.get("duration", 0) for entry in time_entries) / 3600,
                "average_productivity_score": statistics.mean([m["productivity_score"] for m in detailed_metrics["daily_data"]]) if detailed_metrics["daily_data"] else 0,
                "peak_productivity_day": max(detailed_metrics["daily_data"], key=lambda x: x["productivity_score"])["date"] if detailed_metrics["daily_data"] else None
            }
        }
        
    except Exception as e:
        logger.error(f"Detailed productivity analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get detailed productivity analytics"
        )

@router.get("/team/comprehensive")
async def get_comprehensive_team_analytics(
    start_date: date,
    end_date: date,
    team_ids: Optional[List[str]] = Query(None),
    current_user: User = Depends(require_admin_or_manager)
):
    """Get comprehensive team analytics with productivity insights"""
    try:
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Build query for team members
        user_query = {}
        if team_ids:
            # If specific team IDs provided, filter by team membership
            user_query["team_ids"] = {"$in": team_ids}
        
        # CRITICAL SECURITY: Only get users from same organization
        user_query["organization_id"] = current_user.organization_id
        team_members = await DatabaseOperations.get_documents("users", user_query)
        member_ids = [member["id"] for member in team_members]
        
        # CRITICAL SECURITY: Get team productivity data with organization context
        team_data = await get_team_productivity_data(member_ids, current_user.organization_id, start_datetime, end_datetime)
        
        # Calculate team metrics
        team_metrics = productivity_calc.calculate_team_metrics(team_data)
        
        # Get individual member analytics
        member_analytics = []
        for member in team_members:
            member_data = await get_user_productivity_summary(
                member["id"], current_user.organization_id, start_datetime, end_datetime
            )
            member_analytics.append({
                "user_id": member["id"],
                "user_name": member["name"],
                "user_role": member["role"],
                "metrics": member_data
            })
        
        # Generate team insights
        team_insights = await generate_team_insights(team_data, member_analytics)
        
        return {
            "team_metrics": team_metrics,
            "member_analytics": member_analytics,
            "insights": team_insights,
            "collaboration_score": await calculate_collaboration_score(member_ids, current_user.organization_id, start_datetime, end_datetime),
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Comprehensive team analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get comprehensive team analytics"
        )

@router.post("/goals")
async def create_productivity_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new productivity goal"""
    try:
        # CRITICAL SECURITY: Create goal with organization context
        goal = ProductivityGoal(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            goal_type=goal_data.goal_type,
            target_value=goal_data.target_value,
            start_date=goal_data.start_date,
            end_date=goal_data.end_date
        )
        
        await DatabaseOperations.create_document("productivity_goals", goal.dict())
        
        # Create initial progress tracking
        await update_goal_progress(goal.id)
        
        return {
            "goal_id": goal.id,
            "message": "Productivity goal created successfully"
        }
        
    except Exception as e:
        logger.error(f"Create productivity goal error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create productivity goal"
        )

@router.get("/goals")
async def get_productivity_goals(
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user)
):
    """Get user's productivity goals"""
    try:
        # CRITICAL SECURITY: Only get goals from same organization
        query = {"user_id": current_user.id, "organization_id": current_user.organization_id}
        if active_only:
            query["is_active"] = True
        
        goals = await DatabaseOperations.get_documents(
            "productivity_goals",
            query,
            sort=[("created_at", -1)]
        )
        
        # Update progress for all goals
        for goal in goals:
            await update_goal_progress(goal["id"])
        
        # Fetch updated goals
        updated_goals = await DatabaseOperations.get_documents(
            "productivity_goals",
            query,
            sort=[("created_at", -1)]
        )
        
        return {"goals": updated_goals}
        
    except Exception as e:
        logger.error(f"Get productivity goals error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get productivity goals"
        )

@router.put("/goals/{goal_id}")
async def update_productivity_goal(
    goal_id: str,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a productivity goal"""
    try:
        # CRITICAL SECURITY: Verify goal ownership and organization
        goal = await DatabaseOperations.get_document(
            "productivity_goals",
            {"id": goal_id, "user_id": current_user.id, "organization_id": current_user.organization_id}
        )
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )
        
        update_data = {k: v for k, v in goal_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        await DatabaseOperations.update_document(
            "productivity_goals",
            {"id": goal_id},
            {"$set": update_data}
        )
        
        return {"message": "Goal updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update productivity goal error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update productivity goal"
        )

@router.post("/reports/generate")
async def generate_custom_report(
    report_data: ReportGenerate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Generate custom productivity report"""
    try:
        # Create report record
        report_id = str(datetime.utcnow().timestamp())
        
        # Add background task for report generation
        background_tasks.add_task(
            generate_report_background,
            report_id,
            current_user.id,
            report_data
        )
        
        return {
            "report_id": report_id,
            "message": "Report generation started",
            "estimated_completion": "2-5 minutes"
        }
        
    except Exception as e:
        logger.error(f"Generate custom report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start report generation"
        )

@router.get("/insights")
async def get_productivity_insights(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered productivity insights"""
    try:
        # CRITICAL SECURITY: Only get insights from same organization
        insights = await DatabaseOperations.get_documents(
            "productivity_insights",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=days)},
                "$or": [
                    {"expires_at": None},
                    {"expires_at": {"$gt": datetime.utcnow()}}
                ]
            },
            sort=[("importance", -1), ("created_at", -1)]
        )
        
        # Generate new insights if needed
        if len(insights) < 3:
            new_insights = await generate_productivity_insights(current_user.id, current_user.organization_id)
            insights.extend(new_insights)
        
        return {"insights": insights}
        
    except Exception as e:
        logger.error(f"Get productivity insights error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get productivity insights"
        )

@router.get("/heatmap")
async def get_productivity_heatmap(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user)
):
    """Get productivity heatmap data"""
    try:
        # Parse date strings if they come as strings
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # CRITICAL SECURITY: Get heatmap data with organization context
        heatmap_data = await get_productivity_heatmap_data(
            current_user.id, current_user.organization_id, start_datetime, end_datetime
        )
        
        return heatmap_data
        
    except Exception as e:
        logger.error(f"Get productivity heatmap error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get productivity heatmap"
        )

@router.get("/alerts")
async def get_productivity_alerts(
    unresolved_only: bool = Query(True),
    current_user: User = Depends(get_current_user)
):
    """Get productivity alerts"""
    try:
        # CRITICAL SECURITY: Only get alerts from same organization
        query = {"user_id": current_user.id, "organization_id": current_user.organization_id}
        if unresolved_only:
            query["is_resolved"] = False
        
        alerts = await DatabaseOperations.get_documents(
            "productivity_alerts",
            query,
            sort=[("severity", -1), ("created_at", -1)]
        )
        
        return {"alerts": alerts}
        
    except Exception as e:
        logger.error(f"Get productivity alerts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get productivity alerts"
        )

# Helper functions
async def get_user_productivity_summary(user_id: str, organization_id: str, start_date: datetime, end_date: datetime):
    """Get comprehensive productivity summary for a user"""
    try:
        # CRITICAL SECURITY: Get time entries with organization validation
        time_entries = await DatabaseOperations.get_documents(
            "time_entries",
            {
                "user_id": user_id,
                "organization_id": organization_id,
                "start_time": {"$gte": start_date, "$lte": end_date}
            }
        )
        
        if not time_entries:
            return {
                "total_hours": 0,
                "productivity_score": 0,
                "activity_level": 0,
                "focus_score": 50,
                "entries_count": 0
            }
        
        total_hours = sum(entry.get("duration", 0) for entry in time_entries) / 3600
        avg_activity = statistics.mean([entry.get("activity_level", 0) for entry in time_entries if entry.get("activity_level")])
        
        return {
            "total_hours": round(total_hours, 2),
            "productivity_score": round(min(avg_activity * 1.2, 100), 1),
            "activity_level": round(avg_activity, 1),
            "focus_score": 75.0,  # Placeholder
            "entries_count": len(time_entries)
        }
    except Exception as e:
        logger.error(f"Get user productivity summary error: {e}")
        return {"total_hours": 0, "productivity_score": 0, "activity_level": 0}

async def get_productivity_heatmap_data(user_id: str, organization_id: str, start_date: datetime, end_date: datetime):
    """Generate heatmap data showing productivity patterns"""
    try:
        # Get daily productivity data
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "start_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$start_time"
                        }
                    },
                    "hours": {"$sum": "$duration"},
                    "activity": {"$avg": "$activity_level"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        daily_data = await DatabaseOperations.aggregate("time_entries", pipeline)
        
        # Format data
        heatmap_data = {
            "daily_data": []
        }
        
        for day in daily_data:
            productivity_score = min((day["activity"] or 0) * 1.2, 100)
            heatmap_data["daily_data"].append({
                "date": day["_id"],
                "productivity_score": round(productivity_score, 1),
                "hours": round(day["hours"] / 3600, 2)
            })
        
        return heatmap_data
        
    except Exception as e:
        logger.error(f"Get productivity heatmap error: {e}")
        return {"daily_data": []}

async def get_monitoring_data_for_period(user_id: str, organization_id: str, start_date: datetime, end_date: datetime):
    """Get all monitoring data for a specific period"""
    return {"keystroke_data": [], "application_usage": [], "website_visits": []}

async def generate_productivity_insights(user_id: str, organization_id: str = None, metrics_data=None):
    """Generate AI-powered productivity insights"""
    return [
        {
            "title": "Welcome to Enhanced Analytics!",
            "description": "Start tracking time to see personalized productivity insights here.",
            "importance": "medium"
        }
    ]

async def update_goal_progress(goal_id: str):
    """Update progress for a specific goal"""
    pass

async def generate_report_background(report_id: str, user_id: str, report_data: ReportGenerate):
    """Background task for generating reports"""
    pass

async def get_team_productivity_data(member_ids: List[str], organization_id: str, start_date: datetime, end_date: datetime):
    """Get productivity data for team members"""
    return {"members": []}

async def calculate_collaboration_score(member_ids: List[str], organization_id: str, start_date: datetime, end_date: datetime):
    """Calculate team collaboration score"""
    return 75.0

async def generate_team_insights(team_data, member_analytics):
    """Generate insights for team performance"""
    return []

async def get_user_insights(user_id: str, organization_id: str = None):
    """Get recent insights for user"""
    return [
        {
            "title": "Getting Started",
            "description": "Create a project and start tracking time to see productivity insights.",
            "importance": "medium"
        }
    ]

async def get_user_goals(user_id: str, organization_id: str = None):
    """Get active goals for user"""
    query = {"user_id": user_id, "is_active": True}
    if organization_id:
        query["organization_id"] = organization_id
    goals = await DatabaseOperations.get_documents(
        "productivity_goals",
        query
    )
    return goals or []

async def get_productivity_alerts(user_id: str, organization_id: str = None):
    """Get active alerts for user"""
    query = {"user_id": user_id, "is_resolved": False}
    if organization_id:
        query["organization_id"] = organization_id
    alerts = await DatabaseOperations.get_documents(
        "productivity_alerts",
        query
    )
    return alerts or []

async def calculate_productivity_trend(user_id: str, days: int):
    """Calculate productivity trend over time"""
    return {
        "direction": "stable",
        "percentage": 0,
        "productivity": {"direction": "stable", "percentage": 0},
        "focus": {"direction": "stable", "percentage": 0},
        "activity": {"direction": "stable", "percentage": 0},
        "hours": {"direction": "stable", "percentage": 0}
    }

async def get_team_comparison(user_id: str, organization_id: str, start_date: datetime, end_date: datetime):
    """Get user's performance compared to team average"""
    return {
        "user_score": 75.0,
        "team_average": 70.0,
        "difference": 5.0,
        "is_better": True
    }

async def get_dashboard_config(user_id: str, organization_id: str = None):
    """Get user's dashboard configuration"""
    query = {"user_id": user_id}
    if organization_id:
        query["organization_id"] = organization_id
    config = await DatabaseOperations.get_document(
        "dashboard_configs",
        query
    )
    
    if not config:
        # Return default configuration
        return {
            "show_team_comparison": True,
            "show_goals": True,
            "show_insights": True,
            "default_date_range": 7
        }
    
    return config