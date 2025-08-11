import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending notifications and invitations"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.is_configured = bool(self.smtp_host and self.smtp_username and self.smtp_password)
    
    async def send_invitation_email(self, 
                                  to_email: str, 
                                  inviter_name: str, 
                                  role: str, 
                                  invite_link: str) -> bool:
        """
        Send invitation email to new user
        
        Args:
            to_email: Recipient email address
            inviter_name: Name of the person sending the invitation
            role: Role being assigned (admin, manager, user)
            invite_link: Link to accept the invitation
            
        Returns:
            bool: True if email was sent successfully
        """
        if not self.is_configured:
            logger.warning("Email service not configured, printing invitation details to console")
            self._print_invitation_details(to_email, inviter_name, role, invite_link)
            return True
        
        try:
            subject = f"Invitation to join Hubstaff Clone as {role.title()}"
            
            # Create email content
            html_content = self._create_invitation_html(inviter_name, role, invite_link)
            text_content = self._create_invitation_text(inviter_name, role, invite_link)
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Invitation email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send invitation email to {to_email}: {e}")
            # Fall back to console output
            self._print_invitation_details(to_email, inviter_name, role, invite_link)
            return False
    
    def _create_invitation_html(self, inviter_name: str, role: str, invite_link: str) -> str:
        """Create HTML email content for invitation"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>You're invited to join Hubstaff Clone</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🚀 You're Invited!</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                    <h2 style="color: #495057; margin-top: 0;">Join Hubstaff Clone</h2>
                    
                    <p>Hi there!</p>
                    
                    <p><strong>{inviter_name}</strong> has invited you to join their team on <strong>Hubstaff Clone</strong> as a <strong>{role.title()}</strong>.</p>
                    
                    <p>Hubstaff Clone is a comprehensive time tracking and productivity monitoring platform that helps teams work more efficiently.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_link}" 
                           style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Accept Invitation
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6c757d;">
                        This invitation will expire in {settings.INVITATION_EXPIRE_DAYS} days. 
                        If you can't click the button above, copy and paste this link into your browser:
                    </p>
                    
                    <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">
                        {invite_link}
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                    
                    <p style="font-size: 12px; color: #6c757d; text-align: center;">
                        If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_invitation_text(self, inviter_name: str, role: str, invite_link: str) -> str:
        """Create plain text email content for invitation"""
        return f"""
You're invited to join Hubstaff Clone!

Hi there!

{inviter_name} has invited you to join their team on Hubstaff Clone as a {role.title()}.

Hubstaff Clone is a comprehensive time tracking and productivity monitoring platform that helps teams work more efficiently.

To accept this invitation, please click the following link:
{invite_link}

This invitation will expire in {settings.INVITATION_EXPIRE_DAYS} days.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The Hubstaff Clone Team
        """
    
    async def send_password_reset_email(self, 
                                       to_email: str, 
                                       user_name: str, 
                                       reset_link: str) -> bool:
        """
        Send password reset email
        
        Args:
            to_email: Recipient email address
            user_name: Name of the user requesting reset
            reset_link: Link to reset password
            
        Returns:
            bool: True if email was sent successfully
        """
        if not self.is_configured:
            logger.warning("Email service not configured, printing reset details to console")
            self._print_reset_details(to_email, user_name, reset_link)
            return True
        
        try:
            subject = "Password Reset - Hubstaff Clone"
            
            # Create email content
            html_content = self._create_reset_html(user_name, reset_link)
            text_content = self._create_reset_text(user_name, reset_link)
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Password reset email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {to_email}: {e}")
            # Fall back to console output
            self._print_reset_details(to_email, user_name, reset_link)
            return False
    
    def _create_reset_html(self, user_name: str, reset_link: str) -> str:
        """Create HTML email content for password reset"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset - Hubstaff Clone</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                    <h2 style="color: #495057; margin-top: 0;">Reset Your Password</h2>
                    
                    <p>Hi {user_name},</p>
                    
                    <p>We received a request to reset your password for your <strong>Hubstaff Clone</strong> account.</p>
                    
                    <p>If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6c757d;">
                        This link will expire in 1 hour for security reasons. 
                        If you can't click the button above, copy and paste this link into your browser:
                    </p>
                    
                    <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">
                        {reset_link}
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                    
                    <p style="font-size: 12px; color: #6c757d; text-align: center;">
                        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_reset_text(self, user_name: str, reset_link: str) -> str:
        """Create plain text email content for password reset"""
        return f"""
Password Reset - Hubstaff Clone

Hi {user_name},

We received a request to reset your password for your Hubstaff Clone account.

If you made this request, please click the following link to reset your password:
{reset_link}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Hubstaff Clone Team
        """
    
    def _print_invitation_details(self, to_email: str, inviter_name: str, role: str, invite_link: str):
        """Print invitation details to console when email is not configured"""
        print("\n" + "="*60)
        print("📧 INVITATION EMAIL (Email service not configured)")
        print("="*60)
        print(f"To: {to_email}")
        print(f"Inviter: {inviter_name}")
        print(f"Role: {role.title()}")
        print(f"Invitation Link: {invite_link}")
        print(f"Expires: {settings.INVITATION_EXPIRE_DAYS} days")
        print("="*60 + "\n")
    
    def _print_reset_details(self, to_email: str, user_name: str, reset_link: str):
        """Print password reset details to console when email is not configured"""
        print("\n" + "="*60)
        print("🔐 PASSWORD RESET EMAIL (Email service not configured)")
        print("="*60)
        print(f"To: {to_email}")
        print(f"User: {user_name}")
        print(f"Reset Link: {reset_link}")
        print(f"Expires: 1 hour")
        print("="*60 + "\n")

# Global email service instance
email_service = EmailService()