import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import statistics
import re

from database.mongodb import DatabaseOperations
from models.productivity import (
    ProductivityLevel, AlertType, ProductivityAlert,
    ProductivityReport, OrganizationProductivitySummary
)

class ProductivityAnalyzer:
    """Advanced productivity analysis and insights generator"""
    
    # Application categorization
    PRODUCTIVE_APPS = {
        'code_editors': ['vscode', 'sublime', 'vim', 'emacs', 'atom', 'intellij', 'pycharm', 'webstorm'],
        'development': ['terminal', 'cmd', 'powershell', 'git', 'docker', 'postman', 'insomnia'],
        'design': ['photoshop', 'illustrator', 'sketch', 'figma', 'canva', 'gimp'],
        'office': ['word', 'excel', 'powerpoint', 'google docs', 'google sheets', 'notion', 'obsidian'],
        'communication': ['teams', 'slack', 'zoom', 'discord', 'skype', 'telegram'],
        'browsers_work': ['chrome', 'firefox', 'safari', 'edge']  # when used for work-related sites
    }
    
    NEUTRAL_APPS = {
        'system': ['explorer', 'finder', 'calculator', 'settings', 'control panel'],
        'utilities': ['notepad', 'textedit', 'calendar', 'clock']
    }
    
    DISTRACTING_APPS = {
        'games': ['steam', 'origin', 'uplay', 'epic games', 'minecraft', 'fortnite'],
        'entertainment': ['netflix', 'youtube', 'spotify', 'vlc', 'media player'],
        'social': ['facebook', 'twitter', 'instagram', 'tiktok', 'whatsapp']
    }
    
    # Website categorization
    WORK_WEBSITES = [
        'github.com', 'stackoverflow.com', 'docs.python.org', 'developer.mozilla.org',
        'atlassian.com', 'jira.com', 'confluence.com', 'notion.so', 'google.com/drive',
        'docs.google.com', 'sheets.google.com', 'slides.google.com'
    ]
    
    DISTRACTING_WEBSITES = [
        'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
        'reddit.com', 'netflix.com', 'twitch.tv', 'amazon.com', 'ebay.com'
    ]
    
    @classmethod
    async def calculate_activity_level(
        cls,
        keystroke_count: int,
        mouse_clicks: int,
        mouse_movements: int,
        time_window_minutes: int = 5
    ) -> float:
        """Calculate activity level based on input metrics"""
        try:
            # Normalize metrics to per-minute rates
            keystrokes_per_minute = keystroke_count / time_window_minutes
            clicks_per_minute = mouse_clicks / time_window_minutes
            movements_per_minute = mouse_movements / time_window_minutes
            
            # Weighted scoring (keyboard activity is weighted higher)
            keyboard_score = min(keystrokes_per_minute / 50, 1.0) * 50  # Max 50 points
            mouse_score = min(clicks_per_minute / 20, 1.0) * 25        # Max 25 points
            movement_score = min(movements_per_minute / 100, 1.0) * 25  # Max 25 points
            
            activity_level = keyboard_score + mouse_score + movement_score
            return min(activity_level, 100.0)
            
        except Exception as e:
            print(f"Error calculating activity level: {e}")
            return 0.0
    
    @classmethod
    async def determine_productivity_level(
        cls,
        activity_level: float,
        current_application: Optional[str] = None,
        current_url: Optional[str] = None
    ) -> ProductivityLevel:
        """Determine productivity level based on activity and context"""
        try:
            # Base score from activity level
            base_score = activity_level
            
            # Adjust based on application
            app_modifier = 0
            if current_application:
                app_lower = current_application.lower()
                
                # Check if app is productive
                for category, apps in cls.PRODUCTIVE_APPS.items():
                    if any(app in app_lower for app in apps):
                        app_modifier = 20
                        break
                
                # Check if app is distracting
                if app_modifier == 0:
                    for category, apps in cls.DISTRACTING_APPS.items():
                        if any(app in app_lower for app in apps):
                            app_modifier = -30
                            break
            
            # Adjust based on website
            url_modifier = 0
            if current_url:
                url_lower = current_url.lower()
                
                # Check if website is work-related
                for work_site in cls.WORK_WEBSITES:
                    if work_site in url_lower:
                        url_modifier = 15
                        break
                
                # Check if website is distracting
                if url_modifier == 0:
                    for distract_site in cls.DISTRACTING_WEBSITES:
                        if distract_site in url_lower:
                            url_modifier = -25
                            break
            
            # Calculate final score
            final_score = base_score + app_modifier + url_modifier
            
            # Map to productivity levels
            if final_score >= 80:
                return ProductivityLevel.VERY_HIGH
            elif final_score >= 60:
                return ProductivityLevel.HIGH
            elif final_score >= 40:
                return ProductivityLevel.MODERATE
            elif final_score >= 20:
                return ProductivityLevel.LOW
            else:
                return ProductivityLevel.VERY_LOW
                
        except Exception as e:
            print(f"Error determining productivity level: {e}")
            return ProductivityLevel.MODERATE
    
    @classmethod
    async def check_for_alerts(
        cls,
        user_id: str,
        organization_id: str,
        current_activity_level: float,
        current_productivity_level: ProductivityLevel
    ) -> List[ProductivityAlert]:
        """Check for conditions that require alerts"""
        alerts = []
        
        try:
            # Get recent activity history
            recent_time = datetime.utcnow() - timedelta(minutes=30)
            recent_activity = await DatabaseOperations.get_documents(
                "real_time_activity",
                {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "timestamp": {"$gte": recent_time}
                }
            )
            
            # Low activity alert
            if current_activity_level < 10:
                low_activity_periods = len([
                    a for a in recent_activity 
                    if a.get("current_activity_level", 0) < 10
                ])
                
                if low_activity_periods >= 3:  # 3 periods of low activity
                    alerts.append(ProductivityAlert(
                        organization_id=organization_id,
                        user_id=user_id,
                        alert_type=AlertType.LOW_ACTIVITY,
                        severity="medium",
                        title="Low Activity Detected",
                        message=f"User has shown low activity for the past {low_activity_periods * 5} minutes",
                        metric_value=current_activity_level,
                        threshold_value=10.0
                    ))
            
            # Productivity drop alert
            if current_productivity_level in [ProductivityLevel.LOW, ProductivityLevel.VERY_LOW]:
                recent_low_productivity = len([
                    a for a in recent_activity 
                    if a.get("productivity_level") in ["low", "very_low"]
                ])
                
                if recent_low_productivity >= 4:  # 20 minutes of low productivity
                    alerts.append(ProductivityAlert(
                        organization_id=organization_id,
                        user_id=user_id,
                        alert_type=AlertType.PRODUCTIVITY_DROP,
                        severity="high",
                        title="Productivity Drop Alert",
                        message="User productivity has been consistently low",
                        metric_value=0.0,  # Could calculate average productivity score
                        threshold_value=40.0
                    ))
            
            # Excessive idle alert
            recent_idle_periods = len([
                a for a in recent_activity 
                if a.get("tracking_status") == "idle"
            ])
            
            if recent_idle_periods >= 6:  # 30 minutes of idle time
                alerts.append(ProductivityAlert(
                    organization_id=organization_id,
                    user_id=user_id,
                    alert_type=AlertType.EXCESSIVE_IDLE,
                    severity="medium",
                    title="Excessive Idle Time",
                    message=f"User has been idle for extended periods",
                    metric_value=recent_idle_periods * 5,
                    threshold_value=30.0
                ))
            
            return alerts
            
        except Exception as e:
            print(f"Error checking for alerts: {e}")
            return []
    
    @classmethod
    async def get_real_time_recommendations(
        cls,
        activity_level: float,
        productivity_level: ProductivityLevel
    ) -> List[str]:
        """Get real-time productivity recommendations"""
        recommendations = []
        
        try:
            if activity_level < 20:
                recommendations.append("Consider taking a short break and returning refreshed")
                recommendations.append("Try the Pomodoro Technique - 25 minutes focused work")
            
            if productivity_level == ProductivityLevel.LOW:
                recommendations.append("Switch to high-priority tasks")
                recommendations.append("Minimize distracting applications")
                recommendations.append("Focus on one task at a time")
            
            if productivity_level == ProductivityLevel.VERY_LOW:
                recommendations.append("Take a 5-minute walk to re-energize")
                recommendations.append("Review your task list and prioritize")
                recommendations.append("Consider if this is the right time for deep work")
            
            if activity_level > 80 and productivity_level in [ProductivityLevel.HIGH, ProductivityLevel.VERY_HIGH]:
                recommendations.append("Great work! You're in the flow state")
                recommendations.append("Consider scheduling similar tasks during this time of day")
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return ["Stay focused and keep up the good work!"]
    
    @classmethod
    async def generate_session_summary(
        cls,
        user_id: str,
        organization_id: str,
        time_entry_id: str
    ) -> Dict[str, Any]:
        """Generate comprehensive session summary"""
        try:
            # Get all activity data for this session
            session_data = await cls._get_session_data(
                user_id, organization_id, time_entry_id
            )
            
            # Calculate summary metrics
            summary = {
                "user_id": user_id,
                "organization_id": organization_id,
                "time_entry_id": time_entry_id,
                "session_date": datetime.utcnow(),
                
                # Time metrics
                "total_tracked_time": session_data.get("total_time", 0),
                "active_time": session_data.get("active_time", 0),
                "idle_time": session_data.get("idle_time", 0),
                
                # Activity metrics
                "total_keystrokes": session_data.get("total_keystrokes", 0),
                "total_mouse_clicks": session_data.get("total_mouse_clicks", 0),
                "avg_activity_level": session_data.get("avg_activity_level", 0.0),
                
                # Productivity metrics
                "avg_productivity_score": session_data.get("avg_productivity_score", 0.0),
                "productivity_distribution": session_data.get("productivity_distribution", {}),
                
                # Application usage
                "top_applications": session_data.get("top_applications", []),
                "application_switches": session_data.get("application_switches", 0),
                
                # Screenshots
                "screenshots_taken": session_data.get("screenshots_taken", 0),
                "avg_screenshot_productivity": session_data.get("avg_screenshot_productivity", 0.0),
                
                # Insights
                "focus_score": await cls._calculate_focus_score(session_data),
                "efficiency_score": await cls._calculate_efficiency_score(session_data),
                "recommendations": await cls._generate_session_recommendations(session_data)
            }
            
            return summary
            
        except Exception as e:
            print(f"Error generating session summary: {e}")
            return {}
    
    @classmethod
    async def generate_user_report(
        cls,
        user_id: str,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> ProductivityReport:
        """Generate detailed user productivity report"""
        try:
            # Get user data for the period
            user_data = await cls._get_user_period_data(
                user_id, organization_id, start_date, end_date
            )
            
            # Calculate comprehensive metrics
            report = ProductivityReport(
                user_id=user_id,
                organization_id=organization_id,
                report_date=datetime.utcnow(),
                report_period=f"{start_date.date()} to {end_date.date()}",
                
                # Time tracking
                total_tracked_time=user_data.get("total_tracked_time", 0),
                active_time=user_data.get("active_time", 0),
                idle_time=user_data.get("idle_time", 0),
                break_time=user_data.get("break_time", 0),
                
                # Activity metrics
                total_keystrokes=user_data.get("total_keystrokes", 0),
                total_mouse_clicks=user_data.get("total_mouse_clicks", 0),
                avg_typing_speed=user_data.get("avg_typing_speed", 0.0),
                
                # Productivity scores
                overall_productivity_score=user_data.get("avg_productivity_score", 0.0),
                focus_score=user_data.get("focus_score", 0.0),
                efficiency_score=user_data.get("efficiency_score", 0.0),
                activity_level_score=user_data.get("avg_activity_level", 0.0),
                
                # Usage patterns
                top_applications=user_data.get("top_applications", []),
                top_websites=user_data.get("top_websites", []),
                productive_time_percentage=user_data.get("productive_time_percentage", 0.0),
                
                # Screenshots
                screenshots_taken=user_data.get("screenshots_taken", 0),
                avg_screenshot_productivity=user_data.get("avg_screenshot_productivity", 0.0),
                
                # Patterns
                most_productive_hours=user_data.get("most_productive_hours", []),
                productivity_trends=user_data.get("productivity_trends", {}),
                recommendations=await cls._generate_user_recommendations(user_data),
                
                # Issues
                low_activity_periods=user_data.get("low_activity_periods", 0),
                excessive_idle_periods=user_data.get("excessive_idle_periods", 0),
                distraction_incidents=user_data.get("distraction_incidents", 0)
            )
            
            return report
            
        except Exception as e:
            print(f"Error generating user report: {e}")
            return ProductivityReport(
                user_id=user_id,
                organization_id=organization_id,
                report_date=datetime.utcnow(),
                report_period="Error generating report"
            )
    
    @classmethod
    async def generate_organization_report(
        cls,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> OrganizationProductivitySummary:
        """Generate organization-wide productivity summary"""
        try:
            # Get all users in organization
            users = await DatabaseOperations.get_documents(
                "users",
                {"organization_id": organization_id}
            )
            
            # Aggregate data from all users
            org_data = await cls._get_organization_period_data(
                organization_id, start_date, end_date
            )
            
            # Generate summary
            summary = OrganizationProductivitySummary(
                organization_id=organization_id,
                report_date=datetime.utcnow(),
                report_period=f"{start_date.date()} to {end_date.date()}",
                
                # Organization metrics
                total_users_tracked=len(users),
                total_tracked_hours=org_data.get("total_tracked_hours", 0.0),
                avg_productivity_score=org_data.get("avg_productivity_score", 0.0),
                avg_activity_level=org_data.get("avg_activity_level", 0.0),
                
                # Performance analysis
                top_performers=org_data.get("top_performers", []),
                users_needing_attention=org_data.get("users_needing_attention", []),
                productivity_distribution=org_data.get("productivity_distribution", {}),
                
                # Organization insights
                peak_productivity_hours=org_data.get("peak_productivity_hours", []),
                most_used_applications=org_data.get("most_used_applications", []),
                productivity_trends=org_data.get("productivity_trends", {}),
                
                # Alerts
                active_alerts=org_data.get("active_alerts", []),
                users_with_low_activity=org_data.get("users_with_low_activity", []),
                users_with_high_productivity=org_data.get("users_with_high_productivity", [])
            )
            
            return summary
            
        except Exception as e:
            print(f"Error generating organization report: {e}")
            return OrganizationProductivitySummary(
                organization_id=organization_id,
                report_date=datetime.utcnow(),
                report_period="Error generating report"
            )
    
    # Helper methods
    @classmethod
    async def _get_session_data(cls, user_id: str, organization_id: str, time_entry_id: str) -> Dict[str, Any]:
        """Get all data for a specific session"""
        # Implementation would aggregate data from various collections
        # This is a simplified version
        return {
            "total_time": 3600,  # 1 hour
            "active_time": 2700,  # 45 minutes
            "idle_time": 900,     # 15 minutes
            "total_keystrokes": 2500,
            "total_mouse_clicks": 450,
            "avg_activity_level": 75.0,
            "avg_productivity_score": 80.0,
            "screenshots_taken": 6,
            "top_applications": ["VSCode", "Chrome", "Terminal"]
        }
    
    @classmethod
    async def _get_user_period_data(cls, user_id: str, organization_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get aggregated user data for a period"""
        # Implementation would query and aggregate data
        return {
            "total_tracked_time": 144000,  # 40 hours
            "active_time": 115200,         # 32 hours
            "avg_productivity_score": 78.5,
            "focus_score": 82.0,
            "efficiency_score": 75.0,
            "most_productive_hours": [9, 10, 11, 14, 15]
        }
    
    @classmethod
    async def _get_organization_period_data(cls, organization_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get aggregated organization data for a period"""
        # Implementation would query and aggregate data from all users
        return {
            "total_tracked_hours": 320.0,  # 8 people × 40 hours
            "avg_productivity_score": 76.2,
            "peak_productivity_hours": [10, 11, 14, 15],
            "top_performers": [],
            "users_needing_attention": []
        }
    
    @classmethod
    async def _calculate_focus_score(cls, session_data: Dict[str, Any]) -> float:
        """Calculate focus score based on application switching frequency"""
        switches = session_data.get("application_switches", 0)
        total_time_minutes = session_data.get("total_time", 3600) / 60
        
        # Lower switching frequency = higher focus
        if total_time_minutes == 0:
            return 0.0
        
        switches_per_minute = switches / total_time_minutes
        
        # Good focus: < 0.5 switches per minute
        if switches_per_minute <= 0.5:
            return 100.0
        elif switches_per_minute <= 1.0:
            return 80.0
        elif switches_per_minute <= 2.0:
            return 60.0
        else:
            return max(20.0, 100.0 - (switches_per_minute * 20))
    
    @classmethod
    async def _calculate_efficiency_score(cls, session_data: Dict[str, Any]) -> float:
        """Calculate efficiency score based on activity patterns"""
        active_time = session_data.get("active_time", 0)
        total_time = session_data.get("total_time", 1)
        avg_activity = session_data.get("avg_activity_level", 0)
        
        # Efficiency is combination of time utilization and activity intensity
        time_utilization = (active_time / total_time) * 100 if total_time > 0 else 0
        efficiency_score = (time_utilization * 0.6) + (avg_activity * 0.4)
        
        return min(efficiency_score, 100.0)
    
    @classmethod
    async def _generate_session_recommendations(cls, session_data: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on session data"""
        recommendations = []
        
        focus_score = await cls._calculate_focus_score(session_data)
        efficiency_score = await cls._calculate_efficiency_score(session_data)
        
        if focus_score < 60:
            recommendations.append("Try to minimize application switching for better focus")
        
        if efficiency_score < 50:
            recommendations.append("Consider taking more regular breaks to maintain productivity")
        
        if session_data.get("avg_activity_level", 0) < 40:
            recommendations.append("Increase engagement with more interactive tasks")
        
        return recommendations or ["Keep up the good work!"]
    
    @classmethod
    async def _generate_user_recommendations(cls, user_data: Dict[str, Any]) -> List[str]:
        """Generate personalized recommendations for user"""
        recommendations = []
        
        productivity_score = user_data.get("avg_productivity_score", 0)
        focus_score = user_data.get("focus_score", 0)
        
        if productivity_score < 60:
            recommendations.append("Focus on high-impact tasks during your most productive hours")
            recommendations.append("Consider using productivity techniques like time-blocking")
        
        if focus_score < 70:
            recommendations.append("Use focus apps to minimize distractions")
            recommendations.append("Try working in 25-minute focused sessions")
        
        most_productive_hours = user_data.get("most_productive_hours", [])
        if most_productive_hours:
            hours_str = ", ".join(f"{h}:00" for h in most_productive_hours[:3])
            recommendations.append(f"Schedule your most important tasks during {hours_str}")
        
        return recommendations or ["Continue your excellent work habits!"]