import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from collections import defaultdict
import math

logger = logging.getLogger(__name__)

class ProductivityCalculator:
    """Service for calculating productivity metrics and scores"""
    
    def __init__(self):
        self.productivity_weights = {
            "activity_level": 0.25,
            "focus_score": 0.30,
            "time_utilization": 0.20,
            "keystroke_efficiency": 0.15,
            "application_productivity": 0.10
        }
    
    def calculate_detailed_metrics(self, time_entries: List[Dict], monitoring_data: Dict, granularity: str = "daily"):
        """Calculate detailed productivity metrics"""
        try:
            if not time_entries:
                return {"daily_data": [], "summary": {}}
            
            # Group data by granularity
            grouped_data = self._group_by_granularity(time_entries, monitoring_data, granularity)
            
            # Calculate metrics for each period
            detailed_data = []
            for period, data in grouped_data.items():
                metrics = self._calculate_period_metrics(data)
                metrics["date"] = period
                detailed_data.append(metrics)
            
            # Sort by date
            detailed_data.sort(key=lambda x: x["date"])
            
            # Calculate summary
            summary = self._calculate_summary_metrics(detailed_data)
            
            return {
                "daily_data": detailed_data,
                "summary": summary,
                "granularity": granularity
            }
            
        except Exception as e:
            logger.error(f"Calculate detailed metrics error: {e}")
            return {"daily_data": [], "summary": {}}
    
    def calculate_team_metrics(self, team_data: Dict) -> Dict[str, Any]:
        """Calculate comprehensive team metrics"""
        try:
            if not team_data:
                return {}
            
            team_metrics = {
                "total_members": len(team_data.get("members", [])),
                "active_members": len([m for m in team_data.get("members", []) if m.get("total_hours", 0) > 0]),
                "total_hours": sum(m.get("total_hours", 0) for m in team_data.get("members", [])),
                "average_productivity": statistics.mean([m.get("productivity_score", 0) for m in team_data.get("members", [])]) if team_data.get("members") else 0,
                "collaboration_score": self._calculate_team_collaboration_score(team_data),
                "top_performers": self._identify_top_performers(team_data.get("members", [])),
                "productivity_distribution": self._calculate_productivity_distribution(team_data.get("members", []))
            }
            
            return team_metrics
            
        except Exception as e:
            logger.error(f"Calculate team metrics error: {e}")
            return {}
    
    def calculate_productivity_score(self, activity_data: Dict) -> float:
        """Calculate overall productivity score (0-100)"""
        try:
            scores = {}
            
            # Activity level score
            scores["activity_level"] = min(activity_data.get("activity_level", 0), 100)
            
            # Focus score (based on application switching)
            app_switches = activity_data.get("application_switches", 0)
            working_hours = activity_data.get("working_hours", 1)
            switches_per_hour = app_switches / max(working_hours, 0.1)
            scores["focus_score"] = max(0, 100 - (switches_per_hour * 5))  # Penalty for too many switches
            
            # Time utilization score
            active_time = activity_data.get("active_time_seconds", 0)
            total_time = activity_data.get("total_time_seconds", 1)
            scores["time_utilization"] = (active_time / max(total_time, 1)) * 100
            
            # Keystroke efficiency
            keystrokes = activity_data.get("keystrokes", 0)
            keystroke_rate = keystrokes / max(working_hours * 60, 1)  # per minute
            scores["keystroke_efficiency"] = min(keystroke_rate / 50 * 100, 100)  # 50 keystrokes/min = 100%
            
            # Application productivity score
            productive_time = activity_data.get("productive_app_time", 0)
            total_app_time = activity_data.get("total_app_time", 1)
            scores["application_productivity"] = (productive_time / max(total_app_time, 1)) * 100
            
            # Calculate weighted score
            total_score = sum(
                scores.get(metric, 0) * weight 
                for metric, weight in self.productivity_weights.items()
            )
            
            return round(min(max(total_score, 0), 100), 1)
            
        except Exception as e:
            logger.error(f"Calculate productivity score error: {e}")
            return 0.0
    
    def calculate_focus_score(self, activity_data: Dict) -> float:
        """Calculate focus score based on activity patterns"""
        try:
            app_switches = activity_data.get("application_switches", 0)
            working_hours = activity_data.get("working_hours", 1)
            
            # Ideal switches per hour (research suggests 15-20 is normal for focused work)
            ideal_switches_per_hour = 15
            actual_switches_per_hour = app_switches / max(working_hours, 0.1)
            
            # Calculate deviation from ideal
            deviation = abs(actual_switches_per_hour - ideal_switches_per_hour)
            
            # Convert to score (lower deviation = higher score)
            focus_score = max(0, 100 - (deviation * 3))
            
            return round(focus_score, 1)
            
        except Exception as e:
            logger.error(f"Calculate focus score error: {e}")
            return 50.0
    
    def calculate_efficiency_score(self, time_data: Dict, output_metrics: Dict) -> float:
        """Calculate efficiency based on time spent vs output achieved"""
        try:
            # Time-based metrics
            productive_time = time_data.get("productive_time", 0)
            total_time = time_data.get("total_time", 1)
            
            # Output metrics (keystrokes, tasks completed, etc.)
            keystrokes = output_metrics.get("keystrokes", 0)
            tasks_completed = output_metrics.get("tasks_completed", 0)
            
            # Time efficiency
            time_efficiency = (productive_time / max(total_time, 1)) * 100
            
            # Output efficiency (normalized)
            keystroke_efficiency = min((keystrokes / max(productive_time / 3600, 0.1)) / 1000 * 100, 100)
            task_efficiency = tasks_completed * 20  # 20 points per task, max 100
            
            # Weighted combination
            efficiency_score = (
                time_efficiency * 0.5 +
                keystroke_efficiency * 0.3 +
                min(task_efficiency, 100) * 0.2
            )
            
            return round(min(efficiency_score, 100), 1)
            
        except Exception as e:
            logger.error(f"Calculate efficiency score error: {e}")
            return 50.0
    
    def generate_productivity_insights(self, user_data: Dict, historical_data: List[Dict]) -> List[Dict]:
        """Generate actionable productivity insights"""
        insights = []
        
        try:
            # Peak hours analysis
            peak_hours = self._analyze_peak_hours(historical_data)
            if peak_hours:
                insights.append({
                    "type": "peak_hours",
                    "title": "Optimize Your Schedule",
                    "description": f"You're most productive between {peak_hours['start']}:00 and {peak_hours['end']}:00. Consider scheduling important tasks during this time.",
                    "importance": "high",
                    "actionable": True
                })
            
            # Distraction patterns
            distractions = self._analyze_distraction_patterns(user_data)
            if distractions:
                insights.append({
                    "type": "distraction_pattern",
                    "title": "Reduce Distractions",
                    "description": f"You spend {distractions['percentage']:.1f}% of time on distracting applications. Consider using website blockers during focused work.",
                    "importance": "medium",
                    "actionable": True
                })
            
            # Focus improvement suggestions
            focus_score = user_data.get("focus_score", 50)
            if focus_score < 70:
                insights.append({
                    "type": "focus_improvement",
                    "title": "Improve Focus",
                    "description": "Try the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break.",
                    "importance": "medium",
                    "actionable": True
                })
            
            # Productivity trend analysis
            trend = self._analyze_productivity_trend(historical_data)
            if trend == "declining":
                insights.append({
                    "type": "productivity_decline",
                    "title": "Productivity Declining",
                    "description": "Your productivity has decreased over the past week. Consider reviewing your work environment and taking breaks.",
                    "importance": "high",
                    "actionable": True
                })
            elif trend == "improving":
                insights.append({
                    "type": "productivity_improving",
                    "title": "Great Progress!",
                    "description": "Your productivity is improving! Keep up the good work and maintain your current routines.",
                    "importance": "medium",
                    "actionable": False
                })
            
        except Exception as e:
            logger.error(f"Generate insights error: {e}")
        
        return insights
    
    def _group_by_granularity(self, time_entries: List[Dict], monitoring_data: Dict, granularity: str) -> Dict:
        """Group data by specified granularity"""
        grouped = defaultdict(lambda: {"time_entries": [], "monitoring": {}})
        
        for entry in time_entries:
            start_time = entry.get("start_time")
            if not start_time:
                continue
            
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            
            if granularity == "hourly":
                key = start_time.strftime("%Y-%m-%d %H:00")
            elif granularity == "daily":
                key = start_time.strftime("%Y-%m-%d")
            elif granularity == "weekly":
                # Get Monday of the week
                monday = start_time - timedelta(days=start_time.weekday())
                key = monday.strftime("%Y-%m-%d")
            else:
                key = start_time.strftime("%Y-%m-%d")
            
            grouped[key]["time_entries"].append(entry)
        
        return grouped
    
    def _calculate_period_metrics(self, period_data: Dict) -> Dict[str, Any]:
        """Calculate metrics for a specific period"""
        time_entries = period_data.get("time_entries", [])
        
        if not time_entries:
            return {
                "hours": 0,
                "productivity_score": 0,
                "activity_level": 0,
                "focus_score": 0,
                "efficiency_score": 0
            }
        
        total_duration = sum(entry.get("duration", 0) for entry in time_entries) / 3600
        avg_activity = statistics.mean([entry.get("activity_level", 0) for entry in time_entries if entry.get("activity_level")])
        
        # Calculate productivity score based on available data
        activity_data = {
            "activity_level": avg_activity,
            "working_hours": total_duration,
            "application_switches": len(set(entry.get("active_app", "") for entry in time_entries if entry.get("active_app"))),
            "keystrokes": sum(entry.get("keyboard_strokes", 0) for entry in time_entries),
            "active_time_seconds": sum(entry.get("duration", 0) for entry in time_entries),
            "total_time_seconds": sum(entry.get("duration", 0) for entry in time_entries)
        }
        
        productivity_score = self.calculate_productivity_score(activity_data)
        focus_score = self.calculate_focus_score(activity_data)
        
        return {
            "hours": round(total_duration, 2),
            "productivity_score": productivity_score,
            "activity_level": round(avg_activity, 1),
            "focus_score": focus_score,
            "efficiency_score": 75.0,  # Placeholder for now
            "entries_count": len(time_entries)
        }
    
    def _calculate_summary_metrics(self, detailed_data: List[Dict]) -> Dict[str, Any]:
        """Calculate summary metrics from detailed data"""
        if not detailed_data:
            return {}
        
        total_hours = sum(item["hours"] for item in detailed_data)
        avg_productivity = statistics.mean([item["productivity_score"] for item in detailed_data])
        avg_activity = statistics.mean([item["activity_level"] for item in detailed_data])
        avg_focus = statistics.mean([item["focus_score"] for item in detailed_data])
        
        return {
            "total_hours": round(total_hours, 2),
            "average_productivity_score": round(avg_productivity, 1),
            "average_activity_level": round(avg_activity, 1),
            "average_focus_score": round(avg_focus, 1),
            "most_productive_day": max(detailed_data, key=lambda x: x["productivity_score"])["date"],
            "least_productive_day": min(detailed_data, key=lambda x: x["productivity_score"])["date"]
        }
    
    def _calculate_team_collaboration_score(self, team_data: Dict) -> float:
        """Calculate team collaboration score"""
        # This would analyze communication app usage, meeting participation, etc.
        # Placeholder implementation
        return 75.0
    
    def _identify_top_performers(self, members: List[Dict], top_n: int = 3) -> List[Dict]:
        """Identify top performing team members"""
        sorted_members = sorted(
            members, 
            key=lambda x: x.get("productivity_score", 0), 
            reverse=True
        )
        return sorted_members[:top_n]
    
    def _calculate_productivity_distribution(self, members: List[Dict]) -> Dict[str, int]:
        """Calculate distribution of productivity scores across team"""
        if not members:
            return {}
        
        scores = [member.get("productivity_score", 0) for member in members]
        
        distribution = {
            "excellent": len([s for s in scores if s >= 90]),
            "good": len([s for s in scores if 75 <= s < 90]),
            "average": len([s for s in scores if 50 <= s < 75]),
            "needs_improvement": len([s for s in scores if s < 50])
        }
        
        return distribution
    
    def _analyze_peak_hours(self, historical_data: List[Dict]) -> Optional[Dict]:
        """Analyze user's peak productive hours"""
        # This would analyze hourly productivity patterns
        # Placeholder implementation
        return {"start": 9, "end": 11}
    
    def _analyze_distraction_patterns(self, user_data: Dict) -> Optional[Dict]:
        """Analyze user's distraction patterns"""
        # This would analyze application usage categorization
        # Placeholder implementation
        return {"percentage": 15.5}
    
    def _analyze_productivity_trend(self, historical_data: List[Dict]) -> str:
        """Analyze productivity trend over time"""
        if len(historical_data) < 2:
            return "stable"
        
        recent_scores = [item.get("productivity_score", 0) for item in historical_data[-7:]]
        older_scores = [item.get("productivity_score", 0) for item in historical_data[-14:-7]]
        
        if not older_scores:
            return "stable"
        
        recent_avg = statistics.mean(recent_scores)
        older_avg = statistics.mean(older_scores)
        
        if recent_avg > older_avg + 5:
            return "improving"
        elif recent_avg < older_avg - 5:
            return "declining"
        else:
            return "stable"