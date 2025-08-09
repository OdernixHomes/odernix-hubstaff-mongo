from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional, Dict, Any
import httpx
import os
from datetime import datetime
from models.user import User
from auth.dependencies import get_current_user, require_admin_or_manager
from database.mongodb import DatabaseOperations
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])

# Integration Models
class SlackIntegration:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
    
    async def send_notification(self, message: str, channel: str = None):
        """Send notification to Slack"""
        try:
            payload = {
                "text": message,
                "username": "Hubstaff Bot"
            }
            if channel:
                payload["channel"] = channel
            
            async with httpx.AsyncClient() as client:
                response = await client.post(self.webhook_url, json=payload)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Slack notification error: {e}")
            return False

class TrelloIntegration:
    def __init__(self, api_key: str, token: str):
        self.api_key = api_key
        self.token = token
        self.base_url = "https://api.trello.com/1"
    
    async def create_card(self, list_id: str, name: str, description: str = None):
        """Create a Trello card"""
        try:
            url = f"{self.base_url}/cards"
            params = {
                "key": self.api_key,
                "token": self.token,
                "idList": list_id,
                "name": name
            }
            if description:
                params["desc"] = description
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, params=params)
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"Trello card creation error: {e}")
            return None
    
    async def get_boards(self):
        """Get user's Trello boards"""
        try:
            url = f"{self.base_url}/members/me/boards"
            params = {
                "key": self.api_key,
                "token": self.token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"Trello boards fetch error: {e}")
            return []

class GitHubIntegration:
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    async def create_issue(self, repo: str, title: str, body: str = None, labels: List[str] = None):
        """Create a GitHub issue"""
        try:
            url = f"{self.base_url}/repos/{repo}/issues"
            payload = {
                "title": title,
                "body": body or "",
                "labels": labels or []
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                return response.json() if response.status_code == 201 else None
        except Exception as e:
            logger.error(f"GitHub issue creation error: {e}")
            return None
    
    async def get_repositories(self):
        """Get user's GitHub repositories"""
        try:
            url = f"{self.base_url}/user/repos"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self.headers)
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"GitHub repos fetch error: {e}")
            return []

# Integration Routes
@router.post("/slack/connect")
async def connect_slack(
    webhook_url: str,
    current_user: User = Depends(get_current_user)
):
    """Connect Slack integration"""
    try:
        # Test the webhook
        slack = SlackIntegration(webhook_url)
        success = await slack.send_notification("Hubstaff integration connected successfully!")
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Slack webhook URL"
            )
        
        # Store integration
        integration_data = {
            "user_id": current_user.id,
            "type": "slack",
            "config": {"webhook_url": webhook_url},
            "active": True,
            "created_at": datetime.utcnow()
        }
        
        await DatabaseOperations.create_document("integrations", integration_data)
        
        return {"message": "Slack integration connected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Slack connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect Slack integration"
        )

@router.post("/trello/connect")
async def connect_trello(
    api_key: str,
    token: str,
    current_user: User = Depends(get_current_user)
):
    """Connect Trello integration"""
    try:
        # Test the credentials
        trello = TrelloIntegration(api_key, token)
        boards = await trello.get_boards()
        
        if not boards:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Trello credentials"
            )
        
        # Store integration
        integration_data = {
            "user_id": current_user.id,
            "type": "trello",
            "config": {"api_key": api_key, "token": token},
            "active": True,
            "created_at": datetime.utcnow()
        }
        
        await DatabaseOperations.create_document("integrations", integration_data)
        
        return {
            "message": "Trello integration connected successfully",
            "boards": boards[:5]  # Return first 5 boards
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trello connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect Trello integration"
        )

@router.post("/github/connect")
async def connect_github(
    token: str,
    current_user: User = Depends(get_current_user)
):
    """Connect GitHub integration"""
    try:
        # Test the token
        github = GitHubIntegration(token)
        repos = await github.get_repositories()
        
        if not repos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub token"
            )
        
        # Store integration
        integration_data = {
            "user_id": current_user.id,
            "type": "github",
            "config": {"token": token},
            "active": True,
            "created_at": datetime.utcnow()
        }
        
        await DatabaseOperations.create_document("integrations", integration_data)
        
        return {
            "message": "GitHub integration connected successfully",
            "repositories": repos[:10]  # Return first 10 repos
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect GitHub integration"
        )

@router.get("/")
async def get_integrations(current_user: User = Depends(get_current_user)):
    """Get user's integrations"""
    try:
        integrations = await DatabaseOperations.get_documents(
            "integrations",
            {"user_id": current_user.id, "active": True}
        )
        
        # Remove sensitive data
        for integration in integrations:
            if "config" in integration:
                config = integration["config"]
                if "token" in config:
                    config["token"] = "***"
                if "api_key" in config:
                    config["api_key"] = "***"
        
        return {"integrations": integrations}
        
    except Exception as e:
        logger.error(f"Get integrations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get integrations"
        )

@router.post("/slack/notify")
async def send_slack_notification(
    message: str,
    channel: str = None,
    current_user: User = Depends(get_current_user)
):
    """Send Slack notification"""
    try:
        # Get Slack integration
        integration = await DatabaseOperations.get_document(
            "integrations",
            {"user_id": current_user.id, "type": "slack", "active": True}
        )
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slack integration not found"
            )
        
        webhook_url = integration["config"]["webhook_url"]
        slack = SlackIntegration(webhook_url)
        
        success = await slack.send_notification(message, channel)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send Slack notification"
            )
        
        return {"message": "Notification sent successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Slack notification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send notification"
        )

@router.post("/trello/create-card")
async def create_trello_card(
    list_id: str,
    name: str,
    description: str = None,
    current_user: User = Depends(get_current_user)
):
    """Create Trello card from task"""
    try:
        # Get Trello integration
        integration = await DatabaseOperations.get_document(
            "integrations",
            {"user_id": current_user.id, "type": "trello", "active": True}
        )
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trello integration not found"
            )
        
        config = integration["config"]
        trello = TrelloIntegration(config["api_key"], config["token"])
        
        card = await trello.create_card(list_id, name, description)
        
        if not card:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create Trello card"
            )
        
        return {"message": "Trello card created successfully", "card": card}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trello card creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create Trello card"
        )

@router.post("/github/create-issue")
async def create_github_issue(
    repo: str,
    title: str,
    body: str = None,
    labels: List[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Create GitHub issue from task"""
    try:
        # Get GitHub integration
        integration = await DatabaseOperations.get_document(
            "integrations",
            {"user_id": current_user.id, "type": "github", "active": True}
        )
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="GitHub integration not found"
            )
        
        token = integration["config"]["token"]
        github = GitHubIntegration(token)
        
        issue = await github.create_issue(repo, title, body, labels)
        
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create GitHub issue"
            )
        
        return {"message": "GitHub issue created successfully", "issue": issue}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub issue creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create GitHub issue"
        )

@router.delete("/{integration_id}")
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user)
):
    """Disconnect integration"""
    try:
        integration = await DatabaseOperations.get_document(
            "integrations",
            {"id": integration_id, "user_id": current_user.id}
        )
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        
        await DatabaseOperations.update_document(
            "integrations",
            {"id": integration_id},
            {"active": False}
        )
        
        return {"message": "Integration disconnected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Disconnect integration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect integration"
        )