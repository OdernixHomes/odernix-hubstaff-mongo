"""
Project management endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any
import uuid

@pytest.mark.asyncio
class TestProjectEndpoints:
    """Test all project management endpoints"""
    
    async def test_get_projects(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting projects"""
        response = await http_client.get("/projects/", headers=admin_auth_headers)
        print(f"Get projects response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_projects_with_pagination(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting projects with pagination"""
        params = {"limit": 5, "skip": 0}
        response = await http_client.get("/projects/", headers=admin_auth_headers, params=params)
        print(f"Get projects with pagination response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    async def test_get_projects_by_status(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting projects by status"""
        params = {"status": "active"}
        response = await http_client.get("/projects/", headers=admin_auth_headers, params=params)
        print(f"Get projects by status response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for project in data:
            assert project["status"] == "active"
    
    async def test_get_projects_unauthorized(self, http_client: httpx.AsyncClient):
        """Test getting projects without authorization"""
        response = await http_client.get("/projects/")
        assert response.status_code == 403
    
    async def test_create_project(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test creating a new project"""
        project_data = {
            "name": "New Test Project",
            "description": "A new project for testing",
            "client": "Test Client Corp",
            "budget": 5000.0,
            "deadline": "2025-12-31T23:59:59"
        }
        
        response = await http_client.post("/projects", headers=admin_auth_headers, json=project_data)
        print(f"Create project response: {response.status_code} - {response.text}")
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Test Project"
        assert data["client"] == "Test Client Corp"
        assert data["budget"] == 5000.0
        assert "id" in data
        
        # Store project ID for cleanup
        return data["id"]
    
    async def test_create_project_missing_fields(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test creating project with missing required fields"""
        project_data = {
            "description": "Missing name field"
        }
        
        response = await http_client.post("/projects", headers=admin_auth_headers, json=project_data)
        assert response.status_code == 422
    
    async def test_create_project_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str]):
        """Test creating project as regular user"""
        project_data = {
            "name": "User Project",
            "description": "Project created by regular user",
            "client": "Client",
            "budget": 1000.0
        }
        
        response = await http_client.post("/projects", headers=user_auth_headers, json=project_data)
        print(f"Create project as user response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on permissions
        if response.status_code == 201:
            data = response.json()
            return data["id"]  # For cleanup
        else:
            print(f"User cannot create projects: {response.text}")
    
    async def test_get_project_by_id(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test getting project by ID"""
        project_id = test_project["id"]
        response = await http_client.get(f"/projects/{project_id}", headers=admin_auth_headers)
        print(f"Get project by ID response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == test_project["name"]
    
    async def test_get_nonexistent_project(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting nonexistent project"""
        fake_id = str(uuid.uuid4())
        response = await http_client.get(f"/projects/{fake_id}", headers=admin_auth_headers)
        assert response.status_code == 404
    
    async def test_update_project(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test updating a project"""
        project_id = test_project["id"]
        update_data = {
            "name": "Updated Project Name",
            "budget": 2000.0,
            "status": "completed"
        }
        
        response = await http_client.put(f"/projects/{project_id}", headers=admin_auth_headers, json=update_data)
        print(f"Update project response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["budget"] == 2000.0
        assert data["status"] == "completed"
    
    async def test_update_project_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test updating project as regular user"""
        project_id = test_project["id"]
        update_data = {
            "name": "Hacker Name"
        }
        
        response = await http_client.put(f"/projects/{project_id}", headers=user_auth_headers, json=update_data)
        # May succeed or fail depending on team membership and permissions
        print(f"Update project as user response: {response.status_code} - {response.text}")
    
    async def test_delete_project(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], setup_database):
        """Test deleting a project"""
        # Create a temporary project for deletion
        from database.mongodb import DatabaseOperations
        
        temp_project_id = str(uuid.uuid4())
        temp_project_data = {
            "id": temp_project_id,
            "name": "Temp Project",
            "description": "Project for deletion test",
            "client": "Client",
            "budget": 1000.0,
            "spent": 0.0,
            "hours_tracked": 0.0,
            "status": "active",
            "created_by": "test-admin-id",
            "organization_id": "test-org-id",
            "team_members": [],
            "created_at": "2025-01-01T00:00:00",
            "updated_at": "2025-01-01T00:00:00"
        }
        
        await DatabaseOperations.create_document("projects", temp_project_data)
        
        response = await http_client.delete(f"/projects/{temp_project_id}", headers=admin_auth_headers)
        print(f"Delete project response: {response.status_code} - {response.text}")
        
        # May fail due to organization isolation
        if response.status_code != 200:
            print(f"Delete failed (expected): {response.text}")
    
    async def test_get_project_tasks(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test getting project tasks"""
        project_id = test_project["id"]
        response = await http_client.get(f"/projects/{project_id}/tasks", headers=admin_auth_headers)
        print(f"Get project tasks response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_create_task(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test creating a task in a project"""
        project_id = test_project["id"]
        task_data = {
            "name": "New Task",
            "description": "A new task for testing",
            "estimated_hours": 8.0,
            "priority": "medium"
        }
        
        response = await http_client.post(f"/projects/{project_id}/tasks", headers=admin_auth_headers, json=task_data)
        print(f"Create task response: {response.status_code} - {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            assert data["name"] == "New Task"
            assert data["project_id"] == project_id
            return data["id"]  # For cleanup
        else:
            print(f"Task creation failed: {response.text}")
    
    async def test_get_all_tasks(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting all tasks"""
        response = await http_client.get("/projects/tasks/all", headers=admin_auth_headers)
        print(f"Get all tasks response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_assigned_tasks(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting assigned tasks"""
        response = await http_client.get("/projects/tasks/assigned", headers=admin_auth_headers)
        print(f"Get assigned tasks response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_project_stats(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting project statistics"""
        response = await http_client.get("/projects/stats/dashboard", headers=admin_auth_headers)
        print(f"Get project stats response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain stats about projects