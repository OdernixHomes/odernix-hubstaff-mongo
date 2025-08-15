from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from models.user import User
from auth.dependencies import get_current_user, require_admin_or_manager
from database.mongodb import DatabaseOperations
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_analytics(
    current_user: User = Depends(get_current_user)
):
    """Get dashboard analytics data"""
    try:
        # Time range for analysis
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # User's time tracking stats
        user_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "start_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_hours": {"$sum": "$duration"},
                    "total_entries": {"$sum": 1},
                    "avg_session": {"$avg": "$duration"},
                    "projects": {"$addToSet": "$project_id"}
                }
            }
        ]
        
        user_stats = await DatabaseOperations.aggregate("time_entries", user_pipeline)
        user_data = user_stats[0] if user_stats else {
            "total_hours": 0,
            "total_entries": 0,
            "avg_session": 0,
            "projects": []
        }
        
        # Convert seconds to hours
        user_data["total_hours"] = user_data["total_hours"] / 3600
        user_data["avg_session"] = user_data["avg_session"] / 3600
        user_data["projects_count"] = len(user_data["projects"])
        
        # Daily productivity trend (last 7 days)
        daily_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "start_time": {"$gte": end_date - timedelta(days=7), "$lte": end_date}
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
        
        daily_data = await DatabaseOperations.aggregate("time_entries", daily_pipeline)
        
        # Format daily data
        productivity_trend = []
        for day in daily_data:
            productivity_trend.append({
                "date": day["_id"],
                "hours": round(day["hours"] / 3600, 2),
                "activity": round(day["activity"] or 0, 1)
            })
        
        # Project breakdown
        project_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "start_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$project_id",
                    "hours": {"$sum": "$duration"},
                    "entries": {"$sum": 1},
                    "avg_activity": {"$avg": "$activity_level"}
                }
            },
            {"$sort": {"hours": -1}},
            {"$limit": 10}
        ]
        
        project_data = await DatabaseOperations.aggregate("time_entries", project_pipeline)
        
        # Get project names and format data
        project_breakdown = []
        for project in project_data:
            project_info = await DatabaseOperations.get_document("projects", {"id": project["_id"]})
            project_breakdown.append({
                "project_id": project["_id"],
                "project_name": project_info["name"] if project_info else "Unknown",
                "hours": round(project["hours"] / 3600, 2),
                "entries": project["entries"],
                "avg_activity": round(project["avg_activity"] or 0, 1)
            })
        
        return {
            "user_stats": user_data,
            "productivity_trend": productivity_trend,
            "project_breakdown": project_breakdown,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Dashboard analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dashboard analytics"
        )

@router.get("/team")
async def get_team_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_admin_or_manager)
):
    """Get team analytics (admin/manager only)"""
    try:
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).date()
        if not end_date:
            end_date = datetime.utcnow().date()
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Team productivity stats
        team_pipeline = [
            {
                "$match": {
                    "start_time": {"$gte": start_datetime, "$lte": end_datetime}
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "total_hours": {"$sum": "$duration"},
                    "total_entries": {"$sum": 1},
                    "avg_activity": {"$avg": "$activity_level"},
                    "projects": {"$addToSet": "$project_id"}
                }
            }
        ]
        
        team_data = await DatabaseOperations.aggregate("time_entries", team_pipeline)
        
        # Get user details and format data
        team_stats = []
        for member in team_data:
            user_info = await DatabaseOperations.get_document("users", {"id": member["_id"]})
            if user_info:
                team_stats.append({
                    "user_id": member["_id"],
                    "user_name": user_info["name"],
                    "user_role": user_info["role"],
                    "total_hours": round(member["total_hours"] / 3600, 2),
                    "total_entries": member["total_entries"],
                    "avg_activity": round(member["avg_activity"] or 0, 1),
                    "projects_count": len(member["projects"])
                })
        
        # Sort by total hours
        team_stats.sort(key=lambda x: x["total_hours"], reverse=True)
        
        # Daily team productivity
        daily_team_pipeline = [
            {
                "$match": {
                    "start_time": {"$gte": start_datetime, "$lte": end_datetime}
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
                    "total_hours": {"$sum": "$duration"},
                    "avg_activity": {"$avg": "$activity_level"},
                    "active_users": {"$addToSet": "$user_id"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        daily_team_data = await DatabaseOperations.aggregate("time_entries", daily_team_pipeline)
        
        daily_productivity = []
        for day in daily_team_data:
            daily_productivity.append({
                "date": day["_id"],
                "total_hours": round(day["total_hours"] / 3600, 2),
                "avg_activity": round(day["avg_activity"] or 0, 1),
                "active_users": len(day["active_users"])
            })
        
        # Project analytics
        project_analytics_pipeline = [
            {
                "$match": {
                    "start_time": {"$gte": start_datetime, "$lte": end_datetime}
                }
            },
            {
                "$group": {
                    "_id": "$project_id",
                    "total_hours": {"$sum": "$duration"},
                    "team_members": {"$addToSet": "$user_id"},
                    "avg_activity": {"$avg": "$activity_level"}
                }
            },
            {"$sort": {"total_hours": -1}}
        ]
        
        project_analytics = await DatabaseOperations.aggregate("time_entries", project_analytics_pipeline)
        
        # Get project details
        project_stats = []
        for project in project_analytics:
            project_info = await DatabaseOperations.get_document("projects", {"id": project["_id"]})
            if project_info:
                project_stats.append({
                    "project_id": project["_id"],
                    "project_name": project_info["name"],
                    "total_hours": round(project["total_hours"] / 3600, 2),
                    "team_members": len(project["team_members"]),
                    "avg_activity": round(project["avg_activity"] or 0, 1),
                    "budget": project_info.get("budget", 0),
                    "spent": project_info.get("spent", 0)
                })
        
        return {
            "team_stats": team_stats,
            "daily_productivity": daily_productivity,
            "project_stats": project_stats,
            "summary": {
                "total_team_hours": sum(member["total_hours"] for member in team_stats),
                "avg_team_activity": sum(member["avg_activity"] for member in team_stats) / len(team_stats) if team_stats else 0,
                "active_projects": len(project_stats),
                "team_size": len(team_stats)
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Team analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get team analytics"
        )

@router.get("/productivity")
async def get_productivity_analytics(
    period: str = Query("week", enum=["day", "week", "month"]),
    current_user: User = Depends(get_current_user)
):
    """Get productivity analytics with different time periods"""
    try:
        # Calculate date range based on period
        end_date = datetime.utcnow()
        if period == "day":
            start_date = end_date - timedelta(days=1)
            group_format = "%Y-%m-%d %H:00"
        elif period == "week":
            start_date = end_date - timedelta(days=7)
            group_format = "%Y-%m-%d"
        else:  # month
            start_date = end_date - timedelta(days=30)
            group_format = "%Y-%m-%d"
        
        # Productivity trend analysis
        productivity_pipeline = [
            {
                "$match": {
                    "user_id": current_user.id,
                    "start_time": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": group_format,
                            "date": "$start_time"
                        }
                    },
                    "hours": {"$sum": "$duration"},
                    "activity": {"$avg": "$activity_level"},
                    "entries": {"$sum": 1},
                    "mouse_clicks": {"$sum": {"$ifNull": ["$mouse_clicks", 0]}},
                    "keyboard_strokes": {"$sum": {"$ifNull": ["$keyboard_strokes", 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        productivity_data = await DatabaseOperations.aggregate("time_entries", productivity_pipeline)
        
        # Format productivity data
        productivity_chart = []
        for data_point in productivity_data:
            productivity_chart.append({
                "timestamp": data_point["_id"],
                "hours": round(data_point["hours"] / 3600, 2),
                "activity_level": round(data_point["activity"] or 0, 1),
                "entries": data_point["entries"],
                "mouse_clicks": data_point["mouse_clicks"],
                "keyboard_strokes": data_point["keyboard_strokes"]
            })
        
        # Calculate productivity score
        total_hours = sum(point["hours"] for point in productivity_chart)
        avg_activity = sum(point["activity_level"] for point in productivity_chart) / max(len(productivity_chart), 1)
        
        productivity_score = min(100, (avg_activity * 0.7 + (total_hours / max(len(productivity_chart) * 8, 1)) * 100 * 0.3))
        
        return {
            "productivity_chart": productivity_chart,
            "productivity_score": round(productivity_score, 1),
            "total_hours": round(total_hours, 2),
            "avg_activity": round(avg_activity, 1),
            "period": period,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Productivity analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get productivity analytics"
        )

@router.get("/screenshots/stats")
async def get_screenshot_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """Get screenshot statistics for the user"""
    try:
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).date()
        if not end_date:
            end_date = datetime.utcnow().date()
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Count screenshots for current user
        screenshot_count = await DatabaseOperations.count_documents(
            "screenshots",
            {
                "user_id": current_user.id,
                "organization_id": current_user.organization_id,
                "timestamp": {"$gte": start_datetime, "$lte": end_datetime},
                "is_deleted": {"$ne": True}
            }
        )
        
        return {
            "screenshot_count": screenshot_count,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Screenshot stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get screenshot statistics"
        )

@router.get("/reports/custom")
async def generate_custom_report(
    start_date: date,
    end_date: date,
    user_ids: Optional[List[str]] = Query(None),
    project_ids: Optional[List[str]] = Query(None),
    current_user: User = Depends(require_admin_or_manager)
):
    """Generate custom analytics report"""
    try:
        logger.info(f"Generating custom report for user {current_user.id} in org {current_user.organization_id}")
        logger.info(f"Date range: {start_date} to {end_date}")
        logger.info(f"User IDs filter: {user_ids}")
        logger.info(f"Project IDs filter: {project_ids}")
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Build query with organization isolation
        match_query = {
            "start_time": {"$gte": start_datetime, "$lte": end_datetime},
            "organization_id": current_user.organization_id
        }
        
        if user_ids:
            match_query["user_id"] = {"$in": user_ids}
        if project_ids:
            match_query["project_id"] = {"$in": project_ids}
        
        logger.info(f"Match query: {match_query}")
        
        # Check if there are any time entries at all for this organization
        total_entries = await DatabaseOperations.count_documents(
            "time_entries", 
            {"organization_id": current_user.organization_id}
        )
        logger.info(f"Total time entries for organization: {total_entries}")
        
        # Comprehensive analytics pipeline
        analytics_pipeline = [
            {"$match": match_query},
            {
                "$group": {
                    "_id": {
                        "user_id": "$user_id",
                        "project_id": "$project_id",
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$start_time"
                            }
                        }
                    },
                    "hours": {"$sum": "$duration"},
                    "activity": {"$avg": "$activity_level"},
                    "entries": {"$sum": 1}
                }
            }
        ]
        
        logger.info(f"Running aggregation pipeline: {analytics_pipeline}")
        detailed_data = await DatabaseOperations.aggregate("time_entries", analytics_pipeline)
        logger.info(f"Aggregation returned {len(detailed_data)} results")
        
        # Process and format the data
        report_data = []
        
        if detailed_data:
            logger.info(f"Processing {len(detailed_data)} aggregated entries")
            for i, entry in enumerate(detailed_data):
                logger.info(f"Processing entry {i}: {entry}")
                try:
                    user_info = await DatabaseOperations.get_document("users", {"id": entry["_id"]["user_id"], "organization_id": current_user.organization_id})
                    project_info = await DatabaseOperations.get_document("projects", {"id": entry["_id"]["project_id"], "organization_id": current_user.organization_id})
                    
                    report_data.append({
                        "date": entry["_id"]["date"],
                        "user_name": user_info["name"] if user_info else "Unknown User",
                        "project_name": project_info["name"] if project_info else "Unknown Project",
                        "hours": round(entry["hours"] / 3600, 2),
                        "activity_level": round(entry["activity"] or 0, 1),
                        "entries": entry["entries"]
                    })
                except Exception as entry_error:
                    logger.error(f"Error processing entry {i}: {entry_error}", exc_info=True)
                    # Continue processing other entries
                    continue
        else:
            logger.info("No time entries found for the specified criteria")
        
        # Calculate summary statistics
        total_hours = sum(entry["hours"] for entry in report_data)
        avg_activity = sum(entry["activity_level"] for entry in report_data) / len(report_data) if report_data else 0
        
        logger.info(f"Returning report with {len(report_data)} entries")
        
        return {
            "report_data": report_data,
            "summary": {
                "total_hours": round(total_hours, 2),
                "avg_activity": round(avg_activity, 1),
                "total_entries": sum(entry["entries"] for entry in report_data) if report_data else 0,
                "date_range": f"{start_date} to {end_date}"
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Custom report error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate custom report: {str(e)}"
        )