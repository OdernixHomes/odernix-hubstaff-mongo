import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from database.mongodb import DatabaseOperations
from models.productivity import ProductivityAlert, AlertType

class NotificationService:
    """Service for managing productivity notifications and alerts"""
    
    # Alert severity levels and their thresholds
    ALERT_THRESHOLDS = {
        AlertType.LOW_ACTIVITY: {
            "medium": {"duration_minutes": 15, "activity_threshold": 10},
            "high": {"duration_minutes": 30, "activity_threshold": 5},
            "critical": {"duration_minutes": 60, "activity_threshold": 2}
        },
        AlertType.EXCESSIVE_IDLE: {
            "medium": {"duration_minutes": 20, "idle_percentage": 70},
            "high": {"duration_minutes": 40, "idle_percentage": 80},
            "critical": {"duration_minutes": 60, "idle_percentage": 90}
        },
        AlertType.PRODUCTIVITY_DROP: {
            "medium": {"duration_minutes": 20, "productivity_threshold": 40},
            "high": {"duration_minutes": 40, "productivity_threshold": 30},
            "critical": {"duration_minutes": 60, "productivity_threshold": 20}
        },
        AlertType.DISTRACTION_ALERT: {
            "medium": {"duration_minutes": 10, "distraction_apps": 3},
            "high": {"duration_minutes": 20, "distraction_apps": 5},
            "critical": {"duration_minutes": 30, "distraction_apps": 8}
        }
    }
    
    @classmethod
    async def send_productivity_alerts(
        cls,
        organization_id: str,
        alerts: List[ProductivityAlert]
    ) -> Dict[str, Any]:
        """Send productivity alerts to organization admins"""
        try:
            # Get organization admins
            admins = await DatabaseOperations.get_documents(
                "users",
                {
                    "organization_id": organization_id,
                    "role": {"$in": ["admin", "owner"]}
                }
            )
            
            if not admins:
                return {"success": False, "message": "No admins found for organization"}
            
            # Store alerts in database
            stored_alerts = []
            for alert in alerts:
                alert_data = alert.dict()
                alert_id = await DatabaseOperations.create_document(
                    "productivity_alerts",
                    alert_data
                )
                if alert_id:
                    stored_alerts.append(alert_data)
            
            # Send real-time notifications to admins
            notification_results = []
            for admin in admins:
                result = await cls._send_real_time_notification(
                    admin["id"],
                    organization_id,
                    stored_alerts
                )
                notification_results.append(result)
            
            # Send email notifications for high-severity alerts
            high_severity_alerts = [
                a for a in stored_alerts 
                if a.get("severity") in ["high", "critical"]
            ]
            
            if high_severity_alerts:
                email_results = await cls._send_email_notifications(
                    organization_id,
                    admins,
                    high_severity_alerts
                )
                notification_results.extend(email_results)
            
            return {
                "success": True,
                "alerts_sent": len(stored_alerts),
                "admins_notified": len(admins),
                "notification_results": notification_results
            }
            
        except Exception as e:
            print(f"Error sending productivity alerts: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    async def _send_real_time_notification(
        cls,
        admin_id: str,
        organization_id: str,
        alerts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Send real-time notification to admin"""
        try:
            # In production, this would integrate with WebSocket or push notification service
            # For now, we'll store the notification for the admin to retrieve
            
            notification = {
                "id": f"notif_{datetime.utcnow().timestamp()}",
                "admin_id": admin_id,
                "organization_id": organization_id,
                "type": "productivity_alert",
                "title": f"{len(alerts)} Productivity Alert(s)",
                "message": cls._format_alert_summary(alerts),
                "alerts": alerts,
                "timestamp": datetime.utcnow(),
                "is_read": False,
                "priority": cls._determine_notification_priority(alerts)
            }
            
            # Store notification
            await DatabaseOperations.create_document(
                "notifications",
                notification
            )
            
            return {
                "success": True,
                "admin_id": admin_id,
                "notification_id": notification["id"]
            }
            
        except Exception as e:
            print(f"Error sending real-time notification: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    async def _send_email_notifications(
        cls,
        organization_id: str,
        admins: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Send email notifications for high-severity alerts"""
        try:
            # In production, this would integrate with an email service
            # For now, we'll simulate email sending
            
            email_results = []
            
            for admin in admins:
                email_content = cls._generate_alert_email(
                    admin["name"],
                    organization_id,
                    alerts
                )
                
                # Simulate email sending
                email_result = {
                    "success": True,
                    "admin_email": admin.get("email", ""),
                    "admin_name": admin.get("name", ""),
                    "email_type": "productivity_alert",
                    "alerts_count": len(alerts),
                    "sent_at": datetime.utcnow()
                }
                
                # Store email log
                await DatabaseOperations.create_document(
                    "email_logs",
                    email_result
                )
                
                email_results.append(email_result)
            
            return email_results
            
        except Exception as e:
            print(f"Error sending email notifications: {e}")
            return []
    
    @classmethod
    def _format_alert_summary(cls, alerts: List[Dict[str, Any]]) -> str:
        """Format alert summary for notifications"""
        try:
            if len(alerts) == 1:
                alert = alerts[0]
                return f"{alert.get('title', 'Productivity Alert')}: {alert.get('message', '')}"
            
            # Group alerts by type
            alert_groups = {}
            for alert in alerts:
                alert_type = alert.get("alert_type", "unknown")
                if alert_type not in alert_groups:
                    alert_groups[alert_type] = []
                alert_groups[alert_type].append(alert)
            
            # Create summary
            summary_parts = []
            for alert_type, group_alerts in alert_groups.items():
                count = len(group_alerts)
                type_name = alert_type.replace("_", " ").title()
                summary_parts.append(f"{count} {type_name} alert(s)")
            
            return f"Multiple alerts: {', '.join(summary_parts)}"
            
        except Exception as e:
            print(f"Error formatting alert summary: {e}")
            return f"{len(alerts)} productivity alerts detected"
    
    @classmethod
    def _determine_notification_priority(cls, alerts: List[Dict[str, Any]]) -> str:
        """Determine notification priority based on alert severities"""
        try:
            severities = [alert.get("severity", "medium") for alert in alerts]
            
            if "critical" in severities:
                return "critical"
            elif "high" in severities:
                return "high"
            elif "medium" in severities:
                return "medium"
            else:
                return "low"
                
        except Exception as e:
            print(f"Error determining notification priority: {e}")
            return "medium"
    
    @classmethod
    def _generate_alert_email(
        cls,
        admin_name: str,
        organization_id: str,
        alerts: List[Dict[str, Any]]
    ) -> str:
        """Generate email content for productivity alerts"""
        try:
            email_content = f"""
Dear {admin_name},

We've detected productivity alerts that require your attention for your organization.

Alert Summary:
"""
            
            for alert in alerts:
                user_id = alert.get("user_id", "Unknown")
                alert_type = alert.get("alert_type", "").replace("_", " ").title()
                severity = alert.get("severity", "medium").upper()
                message = alert.get("message", "")
                
                email_content += f"""
- [{severity}] {alert_type}
  User: {user_id}
  Details: {message}
  Time: {alert.get('triggered_at', datetime.utcnow())}
"""
            
            email_content += """

Recommended Actions:
- Review user activity patterns
- Consider reaching out to affected users
- Adjust productivity goals if necessary
- Review team workload distribution

Best regards,
Productivity Monitoring System
"""
            
            return email_content
            
        except Exception as e:
            print(f"Error generating alert email: {e}")
            return "Productivity alerts detected. Please check your dashboard for details."
    
    @classmethod
    async def get_admin_notifications(
        cls,
        admin_id: str,
        organization_id: str,
        limit: int = 50,
        unread_only: bool = False
    ) -> Dict[str, Any]:
        """Get notifications for an admin"""
        try:
            # Build query
            query = {
                "admin_id": admin_id,
                "organization_id": organization_id
            }
            
            if unread_only:
                query["is_read"] = False
            
            # Get notifications
            notifications = await DatabaseOperations.get_documents(
                "notifications",
                query,
                limit=limit,
                sort=[("timestamp", -1)]
            )
            
            # Count unread notifications
            unread_count = len([n for n in notifications if not n.get("is_read", False)])
            
            return {
                "notifications": notifications,
                "total_count": len(notifications),
                "unread_count": unread_count
            }
            
        except Exception as e:
            print(f"Error getting admin notifications: {e}")
            return {"notifications": [], "total_count": 0, "unread_count": 0}
    
    @classmethod
    async def mark_notification_as_read(
        cls,
        notification_id: str,
        admin_id: str,
        organization_id: str
    ) -> bool:
        """Mark notification as read"""
        try:
            result = await DatabaseOperations.update_document(
                "notifications",
                {
                    "id": notification_id,
                    "admin_id": admin_id,
                    "organization_id": organization_id
                },
                {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            )
            
            return bool(result)
            
        except Exception as e:
            print(f"Error marking notification as read: {e}")
            return False
    
    @classmethod
    async def create_productivity_summary_notification(
        cls,
        organization_id: str,
        summary_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create daily/weekly productivity summary notification"""
        try:
            # Get organization admins
            admins = await DatabaseOperations.get_documents(
                "users",
                {
                    "organization_id": organization_id,
                    "role": {"$in": ["admin", "owner"]}
                }
            )
            
            if not admins:
                return {"success": False, "message": "No admins found"}
            
            # Create summary notification for each admin
            notifications_created = 0
            
            for admin in admins:
                notification = {
                    "id": f"summary_{datetime.utcnow().timestamp()}_{admin['id']}",
                    "admin_id": admin["id"],
                    "organization_id": organization_id,
                    "type": "productivity_summary",
                    "title": f"Productivity Summary - {summary_data.get('period', 'Daily')}",
                    "message": cls._format_summary_message(summary_data),
                    "summary_data": summary_data,
                    "timestamp": datetime.utcnow(),
                    "is_read": False,
                    "priority": "low"
                }
                
                await DatabaseOperations.create_document(
                    "notifications",
                    notification
                )
                notifications_created += 1
            
            return {
                "success": True,
                "notifications_created": notifications_created,
                "admins_notified": len(admins)
            }
            
        except Exception as e:
            print(f"Error creating productivity summary notification: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    def _format_summary_message(cls, summary_data: Dict[str, Any]) -> str:
        """Format productivity summary message"""
        try:
            avg_productivity = summary_data.get("avg_productivity_score", 0)
            total_users = summary_data.get("total_users_tracked", 0)
            total_hours = summary_data.get("total_tracked_hours", 0)
            
            return f"Organization productivity summary: {avg_productivity:.1f}% average productivity across {total_users} users and {total_hours:.1f} tracked hours."
            
        except Exception as e:
            print(f"Error formatting summary message: {e}")
            return "Productivity summary available for review."
    
    @classmethod
    async def schedule_recurring_notifications(
        cls,
        organization_id: str,
        notification_type: str,
        schedule: str  # "daily", "weekly", "monthly"
    ) -> Dict[str, Any]:
        """Schedule recurring productivity notifications"""
        try:
            # Create scheduled notification record
            scheduled_notification = {
                "id": f"scheduled_{datetime.utcnow().timestamp()}",
                "organization_id": organization_id,
                "notification_type": notification_type,
                "schedule": schedule,
                "created_at": datetime.utcnow(),
                "is_active": True,
                "last_sent": None,
                "next_due": cls._calculate_next_due_date(schedule)
            }
            
            await DatabaseOperations.create_document(
                "scheduled_notifications",
                scheduled_notification
            )
            
            return {
                "success": True,
                "scheduled_id": scheduled_notification["id"],
                "next_due": scheduled_notification["next_due"]
            }
            
        except Exception as e:
            print(f"Error scheduling recurring notifications: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    def _calculate_next_due_date(cls, schedule: str) -> datetime:
        """Calculate next due date for recurring notifications"""
        now = datetime.utcnow()
        
        if schedule == "daily":
            return now + timedelta(days=1)
        elif schedule == "weekly":
            return now + timedelta(weeks=1)
        elif schedule == "monthly":
            return now + timedelta(days=30)
        else:
            return now + timedelta(days=1)  # Default to daily
    
    @classmethod
    async def process_scheduled_notifications(cls) -> Dict[str, Any]:
        """Process all due scheduled notifications"""
        try:
            # Get all due notifications
            due_notifications = await DatabaseOperations.get_documents(
                "scheduled_notifications",
                {
                    "is_active": True,
                    "next_due": {"$lte": datetime.utcnow()}
                }
            )
            
            processed_count = 0
            
            for notification in due_notifications:
                # Process based on type
                if notification["notification_type"] == "productivity_summary":
                    await cls._send_scheduled_productivity_summary(
                        notification["organization_id"]
                    )
                
                # Update next due date
                await DatabaseOperations.update_document(
                    "scheduled_notifications",
                    {"id": notification["id"]},
                    {
                        "last_sent": datetime.utcnow(),
                        "next_due": cls._calculate_next_due_date(notification["schedule"])
                    }
                )
                
                processed_count += 1
            
            return {
                "success": True,
                "processed_count": processed_count
            }
            
        except Exception as e:
            print(f"Error processing scheduled notifications: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    async def _send_scheduled_productivity_summary(cls, organization_id: str) -> None:
        """Send scheduled productivity summary"""
        try:
            # Generate productivity summary for the organization
            # This would integrate with the ProductivityAnalyzer
            summary_data = {
                "period": "Daily",
                "avg_productivity_score": 75.5,
                "total_users_tracked": 8,
                "total_tracked_hours": 64.0,
                "organization_id": organization_id
            }
            
            await cls.create_productivity_summary_notification(
                organization_id,
                summary_data
            )
            
        except Exception as e:
            print(f"Error sending scheduled productivity summary: {e}")