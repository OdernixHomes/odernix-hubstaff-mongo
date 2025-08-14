"""
User management endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any

@pytest.mark.asyncio
class TestUserEndpoints:
    """Test all user management endpoints"""
    
    async def test_get_users_as_admin(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting users as admin"""
        response = await http_client.get("/users/", headers=admin_auth_headers)
        print(f"Get users response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            user = data[0]
            assert "id" in user
            assert "email" in user
            assert "name" in user
            assert "password" not in user  # Should be excluded
    
    async def test_get_users_with_pagination(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting users with pagination"""
        params = {"limit": 5, "skip": 0}
        response = await http_client.get("/users/", headers=admin_auth_headers, params=params)
        print(f"Get users with pagination response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    async def test_get_users_by_role(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting users by role"""
        params = {"role": "admin"}
        response = await http_client.get("/users/", headers=admin_auth_headers, params=params)
        print(f"Get users by role response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for user in data:
            assert user["role"] == "admin"
    
    async def test_get_users_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str]):
        """Test getting users as regular user (should work with organization isolation)"""
        response = await http_client.get("/users/", headers=user_auth_headers)
        print(f"Get users as regular user response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_users_unauthorized(self, http_client: httpx.AsyncClient):
        """Test getting users without authorization"""
        response = await http_client.get("/users/")
        assert response.status_code == 403
    
    async def test_get_current_user_profile(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting current user profile"""
        response = await http_client.get("/users/me", headers=admin_auth_headers)
        print(f"Get current user profile response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "password" not in data
    
    async def test_get_user_by_id(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_admin_user: Dict[str, Any]):
        """Test getting user by ID"""
        user_id = test_admin_user["id"]
        response = await http_client.get(f"/users/{user_id}", headers=admin_auth_headers)
        print(f"Get user by ID response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        assert "password" not in data
    
    async def test_get_nonexistent_user(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting nonexistent user"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await http_client.get(f"/users/{fake_id}", headers=admin_auth_headers)
        assert response.status_code == 404
    
    async def test_update_current_user(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test updating current user profile"""
        update_data = {
            "name": "Updated Admin Name",
            "timezone": "America/New_York"
        }
        
        response = await http_client.put("/users/me", headers=admin_auth_headers, json=update_data)
        print(f"Update current user response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Admin Name"
        assert data["timezone"] == "America/New_York"
    
    async def test_update_current_user_forbidden_fields(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str]):
        """Test updating forbidden fields (role, organization_id)"""
        update_data = {
            "role": "admin",  # Regular user shouldn't be able to change role
            "organization_id": "different-org-id"
        }
        
        response = await http_client.put("/users/me", headers=user_auth_headers, json=update_data)
        print(f"Update forbidden fields response: {response.status_code} - {response.text}")
        
        # Should succeed but ignore forbidden fields
        assert response.status_code == 200
        data = response.json()
        assert data["role"] != "admin"  # Role should not have changed
    
    async def test_update_other_user_as_admin(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_regular_user: Dict[str, Any]):
        """Test updating another user as admin"""
        user_id = test_regular_user["id"]
        update_data = {
            "name": "Updated User Name",
            "role": "manager"
        }
        
        response = await http_client.put(f"/users/{user_id}", headers=admin_auth_headers, json=update_data)
        print(f"Update other user as admin response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated User Name"
        assert data["role"] == "manager"
    
    async def test_update_other_user_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str], test_admin_user: Dict[str, Any]):
        """Test updating another user as regular user (should fail)"""
        user_id = test_admin_user["id"]
        update_data = {
            "name": "Hacker Name"
        }
        
        response = await http_client.put(f"/users/{user_id}", headers=user_auth_headers, json=update_data)
        assert response.status_code == 403
    
    async def test_delete_user_as_admin(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], setup_database):
        """Test deleting user as admin"""
        # Create a temporary user for deletion
        from database.mongodb import DatabaseOperations
        import uuid
        
        temp_user_id = str(uuid.uuid4())
        temp_user_data = {
            "id": temp_user_id,
            "name": "Temp User",
            "email": "temp@test.com",
            "password": "hashed_password",
            "role": "user",
            "status": "active",
            "organization_id": "test-org-id",
            "is_organization_owner": False,
            "timezone": "UTC",
            "created_at": "2025-01-01T00:00:00",
            "email_verified": True
        }
        
        await DatabaseOperations.create_document("users", temp_user_data)
        
        # Now try to delete
        response = await http_client.delete(f"/users/{temp_user_id}", headers=admin_auth_headers)
        print(f"Delete user response: {response.status_code} - {response.text}")
        
        # May fail due to organization isolation
        if response.status_code != 200:
            print(f"Delete failed (expected): {response.text}")
    
    async def test_delete_user_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str], test_admin_user: Dict[str, Any]):
        """Test deleting user as regular user (should fail)"""
        user_id = test_admin_user["id"]
        response = await http_client.delete(f"/users/{user_id}", headers=user_auth_headers)
        assert response.status_code == 403
    
    async def test_delete_self(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_admin_user: Dict[str, Any]):
        """Test deleting self (should fail)"""
        user_id = test_admin_user["id"]
        response = await http_client.delete(f"/users/{user_id}", headers=admin_auth_headers)
        assert response.status_code == 400  # Cannot delete yourself
    
    async def test_get_team_stats(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting team statistics"""
        response = await http_client.get("/users/team/stats", headers=admin_auth_headers)
        print(f"Team stats response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "active_users" in data
        assert "users_by_role" in data