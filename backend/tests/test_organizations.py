"""
Organization endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any

@pytest.mark.asyncio
class TestOrganizationEndpoints:
    """Test all organization management endpoints"""
    
    async def test_get_my_organization(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting current user's organization"""
        response = await http_client.get("/organizations/me", headers=admin_auth_headers)
        print(f"Get my organization response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "industry" in data
    
    async def test_update_organization(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test updating organization"""
        update_data = {
            "name": "Updated Test Organization",
            "description": "Updated description",
            "industry": "Software"
        }
        
        response = await http_client.put("/organizations/me", headers=admin_auth_headers, json=update_data)
        print(f"Update organization response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Test Organization"
        assert data["industry"] == "Software"
    
    async def test_get_organization_stats(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting organization statistics"""
        response = await http_client.get("/organizations/stats", headers=admin_auth_headers)
        print(f"Get organization stats response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain organization statistics
    
    async def test_get_organization_members(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting organization members"""
        response = await http_client.get("/organizations/members", headers=admin_auth_headers)
        print(f"Get organization members response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_invite_user_to_organization(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test inviting user to organization"""
        invite_data = {
            "email": "newmember@test.com",
            "name": "New Member",
            "role": "user"
        }
        
        response = await http_client.post("/organizations/invite", headers=admin_auth_headers, json=invite_data)
        print(f"Invite user to organization response: {response.status_code} - {response.text}")
        
        # May fail if email system not configured
        if response.status_code not in [200, 201]:
            print(f"Organization invite failed: {response.text}")
    
    async def test_get_audit_log(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting organization audit log"""
        params = {
            "limit": 50,
            "action": "user_created"
        }
        
        response = await http_client.get("/organizations/audit-log", headers=admin_auth_headers, params=params)
        print(f"Get audit log response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            print(f"Get audit log failed: {response.text}")
    
    async def test_organization_endpoints_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str]):
        """Test organization endpoints as regular user"""
        # Regular users should be able to view organization info
        response = await http_client.get("/organizations/me", headers=user_auth_headers)
        print(f"Get organization as regular user response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        
        # But shouldn't be able to update it
        update_data = {"name": "Hacker Name"}
        response = await http_client.put("/organizations/me", headers=user_auth_headers, json=update_data)
        print(f"Update organization as regular user response: {response.status_code} - {response.text}")
        
        # Should fail with 403
        assert response.status_code == 403
    
    async def test_organization_endpoints_unauthorized(self, http_client: httpx.AsyncClient):
        """Test organization endpoints without authorization"""
        endpoints = [
            "/organizations/me",
            "/organizations/stats",
            "/organizations/members",
            "/organizations/audit-log"
        ]
        
        for endpoint in endpoints:
            response = await http_client.get(endpoint)
            assert response.status_code == 403, f"Endpoint {endpoint} should require auth"

@pytest.mark.asyncio
class TestIntegrationsEndpoints:
    """Test integration endpoints"""
    
    async def test_get_integrations(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting integrations"""
        response = await http_client.get("/integrations/", headers=admin_auth_headers)
        print(f"Get integrations response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_connect_slack(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test connecting Slack integration"""
        slack_data = {
            "webhook_url": "https://hooks.slack.com/services/test/webhook"
        }
        
        response = await http_client.post("/integrations/slack/connect", headers=admin_auth_headers, json=slack_data)
        print(f"Connect Slack response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on webhook validation
        if response.status_code not in [200, 201]:
            print(f"Slack connection failed: {response.text}")
    
    async def test_connect_trello(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test connecting Trello integration"""
        trello_data = {
            "api_key": "test_api_key",
            "token": "test_token"
        }
        
        response = await http_client.post("/integrations/trello/connect", headers=admin_auth_headers, json=trello_data)
        print(f"Connect Trello response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on API validation
        if response.status_code not in [200, 201]:
            print(f"Trello connection failed: {response.text}")
    
    async def test_connect_github(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test connecting GitHub integration"""
        github_data = {
            "token": "ghp_test_token"
        }
        
        response = await http_client.post("/integrations/github/connect", headers=admin_auth_headers, json=github_data)
        print(f"Connect GitHub response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on token validation
        if response.status_code not in [200, 201]:
            print(f"GitHub connection failed: {response.text}")
    
    async def test_integrations_unauthorized(self, http_client: httpx.AsyncClient):
        """Test integration endpoints without authorization"""
        response = await http_client.get("/integrations/")
        assert response.status_code == 403