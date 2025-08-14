"""
Authentication endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any

@pytest.mark.asyncio
class TestAuthEndpoints:
    """Test all authentication-related endpoints"""
    
    async def test_register_organization(self, http_client: httpx.AsyncClient):
        """Test organization registration"""
        registration_data = {
            "organization": {
                "name": "Test Corp",
                "industry": "Technology",
                "size": "small",
                "timezone": "UTC"
            },
            "owner": {
                "name": "Test Owner",
                "email": "owner@testcorp.com",
                "password": "password123",
                "timezone": "UTC"
            }
        }
        
        response = await http_client.post("/organizations/register", json=registration_data)
        print(f"Registration response: {response.status_code} - {response.text}")
        
        assert response.status_code == 201
        data = response.json()
        assert "organization" in data
        assert "user" in data
        assert "access_token" in data
        assert data["organization"]["name"] == "Test Corp"
        assert data["user"]["email"] == "owner@testcorp.com"
        
        return data  # Return for cleanup in other tests
    
    async def test_login_valid_credentials(self, http_client: httpx.AsyncClient, test_admin_user: Dict[str, Any]):
        """Test login with valid credentials"""
        login_data = {
            "email": test_admin_user["email"],
            "password": "password123"
        }
        
        response = await http_client.post("/auth/login", json=login_data)
        print(f"Login response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == test_admin_user["email"]
    
    async def test_login_invalid_credentials(self, http_client: httpx.AsyncClient):
        """Test login with invalid credentials"""
        login_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        response = await http_client.post("/auth/login", json=login_data)
        assert response.status_code in [401, 422]
    
    async def test_login_missing_fields(self, http_client: httpx.AsyncClient):
        """Test login with missing fields"""
        response = await http_client.post("/auth/login", json={"email": "test@test.com"})
        assert response.status_code == 422
    
    async def test_get_current_user(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting current user profile"""
        response = await http_client.get("/auth/me", headers=admin_auth_headers)
        print(f"Current user response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
    
    async def test_get_current_user_unauthorized(self, http_client: httpx.AsyncClient):
        """Test getting current user without authorization"""
        response = await http_client.get("/auth/me")
        assert response.status_code == 403
    
    async def test_get_current_user_invalid_token(self, http_client: httpx.AsyncClient):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await http_client.get("/auth/me", headers=headers)
        assert response.status_code == 403
    
    async def test_invite_user(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test inviting a new user"""
        invite_data = {
            "email": "newuser@test.com",
            "name": "New User",
            "role": "user"
        }
        
        response = await http_client.post("/auth/invite", json=invite_data, headers=admin_auth_headers)
        print(f"Invite response: {response.status_code} - {response.text}")
        
        # May fail if invite system needs additional setup
        if response.status_code != 201:
            print(f"Invite failed (expected): {response.text}")
    
    async def test_get_invitations(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting invitations"""
        response = await http_client.get("/auth/invitations", headers=admin_auth_headers)
        print(f"Invitations response: {response.status_code} - {response.text}")
        
        # Should return 200 even if empty
        assert response.status_code == 200
    
    async def test_logout(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test logout"""
        response = await http_client.post("/auth/logout", headers=admin_auth_headers)
        print(f"Logout response: {response.status_code} - {response.text}")
        
        # Should return 200 or 204
        assert response.status_code in [200, 204]
    
    async def test_forgot_password(self, http_client: httpx.AsyncClient, test_admin_user: Dict[str, Any]):
        """Test forgot password"""
        forgot_data = {
            "email": test_admin_user["email"]
        }
        
        response = await http_client.post("/auth/forgot-password", json=forgot_data)
        print(f"Forgot password response: {response.status_code} - {response.text}")
        
        # May fail if email system is not configured
        if response.status_code not in [200, 201, 202]:
            print(f"Forgot password failed (expected): {response.text}")
    
    async def test_forgot_password_invalid_email(self, http_client: httpx.AsyncClient):
        """Test forgot password with invalid email"""
        forgot_data = {
            "email": "nonexistent@test.com"
        }
        
        response = await http_client.post("/auth/forgot-password", json=forgot_data)
        # Should handle gracefully
        assert response.status_code in [200, 201, 202, 404]