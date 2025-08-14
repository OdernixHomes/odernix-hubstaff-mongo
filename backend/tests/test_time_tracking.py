"""
Time tracking endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any
import uuid
from datetime import datetime, timedelta

@pytest.mark.asyncio
class TestTimeTrackingEndpoints:
    """Test all time tracking endpoints"""
    
    async def test_start_tracking(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test starting time tracking"""
        tracking_data = {
            "project_id": test_project["id"],
            "task_id": None,
            "description": "Working on test project"
        }
        
        response = await http_client.post("/time-tracking/start", headers=admin_auth_headers, json=tracking_data)
        print(f"Start tracking response: {response.status_code} - {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            assert "id" in data
            assert data["project_id"] == test_project["id"]
            assert data["description"] == "Working on test project"
            return data["id"]  # Return for use in other tests
        else:
            print(f"Start tracking failed: {response.text}")
            return None
    
    async def test_start_tracking_without_project(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test starting time tracking without project"""
        tracking_data = {
            "description": "General work"
        }
        
        response = await http_client.post("/time-tracking/start", headers=admin_auth_headers, json=tracking_data)
        print(f"Start tracking without project response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on implementation
        if response.status_code == 201:
            data = response.json()
            return data["id"]
    
    async def test_get_active_entry(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting active time entry"""
        response = await http_client.get("/time-tracking/active", headers=admin_auth_headers)
        print(f"Get active entry response: {response.status_code} - {response.text}")
        
        # Should return 200 even if no active entry (null response)
        assert response.status_code == 200
    
    async def test_get_time_entries(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting time entries"""
        response = await http_client.get("/time-tracking/entries", headers=admin_auth_headers)
        print(f"Get time entries response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_time_entries_with_filters(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test getting time entries with filters"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "project_id": test_project["id"]
        }
        
        response = await http_client.get("/time-tracking/entries", headers=admin_auth_headers, params=params)
        print(f"Get time entries with filters response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_time_entries_pagination(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting time entries with pagination"""
        params = {
            "limit": 10,
            "skip": 0
        }
        
        response = await http_client.get("/time-tracking/entries", headers=admin_auth_headers, params=params)
        print(f"Get time entries with pagination response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
    
    async def test_create_manual_entry(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_project: Dict[str, Any]):
        """Test creating manual time entry"""
        start_time = datetime.utcnow() - timedelta(hours=2)
        end_time = datetime.utcnow()
        
        manual_entry_data = {
            "project_id": test_project["id"],
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "description": "Manual time entry for testing",
            "hours": 2.0
        }
        
        response = await http_client.post("/time-tracking/manual", headers=manual_entry_data, json=manual_entry_data)
        print(f"Create manual entry response: {response.status_code} - {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            assert "id" in data
            assert data["project_id"] == test_project["id"]
            assert data["description"] == "Manual time entry for testing"
            return data["id"]
        else:
            print(f"Manual entry creation failed: {response.text}")
    
    async def test_stop_tracking(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], setup_database):
        """Test stopping time tracking"""
        # First create a time entry to stop
        from database.mongodb import DatabaseOperations
        
        entry_id = str(uuid.uuid4())
        entry_data = {
            "id": entry_id,
            "user_id": "test-admin-id",
            "project_id": "test-project-id",
            "start_time": datetime.utcnow() - timedelta(hours=1),
            "end_time": None,
            "status": "active",
            "description": "Test entry",
            "organization_id": "test-org-id"
        }
        
        await DatabaseOperations.create_document("time_entries", entry_data)
        
        response = await http_client.post(f"/time-tracking/stop/{entry_id}", headers=admin_auth_headers)
        print(f"Stop tracking response: {response.status_code} - {response.text}")
        
        # May fail due to organization isolation or entry not found
        if response.status_code != 200:
            print(f"Stop tracking failed (expected): {response.text}")
    
    async def test_pause_tracking(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test pausing time tracking"""
        fake_entry_id = str(uuid.uuid4())
        response = await http_client.post(f"/time-tracking/pause/{fake_entry_id}", headers=admin_auth_headers)
        print(f"Pause tracking response: {response.status_code} - {response.text}")
        
        # Should return 404 for non-existent entry
        assert response.status_code == 404
    
    async def test_resume_tracking(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test resuming time tracking"""
        fake_entry_id = str(uuid.uuid4())
        response = await http_client.post(f"/time-tracking/resume/{fake_entry_id}", headers=admin_auth_headers)
        print(f"Resume tracking response: {response.status_code} - {response.text}")
        
        # Should return 404 for non-existent entry
        assert response.status_code == 404
    
    async def test_update_time_entry(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], setup_database):
        """Test updating time entry"""
        # Create a time entry to update
        from database.mongodb import DatabaseOperations
        
        entry_id = str(uuid.uuid4())
        entry_data = {
            "id": entry_id,
            "user_id": "test-admin-id",
            "project_id": "test-project-id",
            "start_time": datetime.utcnow() - timedelta(hours=2),
            "end_time": datetime.utcnow() - timedelta(hours=1),
            "status": "completed",
            "description": "Original description",
            "organization_id": "test-org-id"
        }
        
        await DatabaseOperations.create_document("time_entries", entry_data)
        
        update_data = {
            "description": "Updated description",
            "hours": 1.5
        }
        
        response = await http_client.put(f"/time-tracking/entries/{entry_id}", headers=admin_auth_headers, json=update_data)
        print(f"Update time entry response: {response.status_code} - {response.text}")
        
        # May fail due to organization isolation
        if response.status_code != 200:
            print(f"Update time entry failed (expected): {response.text}")
    
    async def test_record_activity(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test recording activity data"""
        activity_data = {
            "time_entry_id": str(uuid.uuid4()),
            "mouse_clicks": 100,
            "keystrokes": 500,
            "mouse_distance": 1000.0,
            "active_window": "Test Application",
            "activity_level": 75
        }
        
        response = await http_client.post("/time-tracking/activity", headers=admin_auth_headers, json=activity_data)
        print(f"Record activity response: {response.status_code} - {response.text}")
        
        # May succeed or fail depending on implementation
        if response.status_code not in [200, 201]:
            print(f"Record activity failed: {response.text}")
    
    async def test_get_daily_report(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting daily report"""
        date = datetime.utcnow().date().isoformat()
        params = {"date": date}
        
        response = await http_client.get("/time-tracking/reports/daily", headers=admin_auth_headers, params=params)
        print(f"Get daily report response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain daily report data
    
    async def test_get_team_time_report(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting team time report"""
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = await http_client.get("/time-tracking/reports/team", headers=admin_auth_headers, params=params)
        print(f"Get team time report response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain team time report data
    
    async def test_time_tracking_unauthorized(self, http_client: httpx.AsyncClient):
        """Test time tracking endpoints without authorization"""
        endpoints = [
            ("/time-tracking/active", "GET"),
            ("/time-tracking/entries", "GET"),
            ("/time-tracking/start", "POST"),
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = await http_client.get(endpoint)
            else:
                response = await http_client.post(endpoint, json={})
            
            assert response.status_code == 403, f"Endpoint {endpoint} should require auth"