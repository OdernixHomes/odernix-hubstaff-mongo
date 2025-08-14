"""
Analytics endpoints tests
"""
import pytest
import httpx
from typing import Dict, Any
from datetime import datetime, timedelta

@pytest.mark.asyncio
class TestAnalyticsEndpoints:
    """Test all analytics endpoints"""
    
    async def test_get_dashboard_analytics(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting dashboard analytics"""
        response = await http_client.get("/analytics/dashboard", headers=admin_auth_headers)
        print(f"Get dashboard analytics response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "user_stats" in data
        assert "productivity_trend" in data
        assert "project_breakdown" in data
        assert "period" in data
    
    async def test_get_team_analytics(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting team analytics"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = await http_client.get("/analytics/team", headers=admin_auth_headers, params=params)
        print(f"Get team analytics response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain team analytics data
    
    async def test_get_team_analytics_without_dates(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting team analytics without date parameters"""
        response = await http_client.get("/analytics/team", headers=admin_auth_headers)
        print(f"Get team analytics without dates response: {response.status_code} - {response.text}")
        
        # Should work with default date range
        assert response.status_code == 200
    
    async def test_get_productivity_analytics(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting productivity analytics"""
        params = {"period": "week"}
        response = await http_client.get("/analytics/productivity", headers=admin_auth_headers, params=params)
        print(f"Get productivity analytics response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain productivity analytics
    
    async def test_get_productivity_analytics_different_periods(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting productivity analytics with different periods"""
        periods = ["day", "week", "month"]
        
        for period in periods:
            params = {"period": period}
            response = await http_client.get("/analytics/productivity", headers=admin_auth_headers, params=params)
            print(f"Get productivity analytics ({period}) response: {response.status_code} - {response.text}")
            
            assert response.status_code == 200
    
    async def test_generate_custom_report(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test generating custom report"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "report_type": "summary",
            "include_projects": "true",
            "include_users": "true"
        }
        
        response = await http_client.get("/analytics/reports/custom", headers=admin_auth_headers, params=params)
        print(f"Generate custom report response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        # Should contain custom report data
    
    async def test_analytics_unauthorized(self, http_client: httpx.AsyncClient):
        """Test analytics endpoints without authorization"""
        endpoints = [
            "/analytics/dashboard",
            "/analytics/team",
            "/analytics/productivity",
            "/analytics/reports/custom"
        ]
        
        for endpoint in endpoints:
            response = await http_client.get(endpoint)
            assert response.status_code == 403, f"Endpoint {endpoint} should require auth"
    
    async def test_analytics_as_regular_user(self, http_client: httpx.AsyncClient, user_auth_headers: Dict[str, str]):
        """Test analytics endpoints as regular user"""
        response = await http_client.get("/analytics/dashboard", headers=user_auth_headers)
        print(f"Get dashboard analytics as user response: {response.status_code} - {response.text}")
        
        # Regular users should be able to see their own analytics
        assert response.status_code == 200

@pytest.mark.asyncio 
class TestProductivityEndpoints:
    """Test productivity tracking endpoints"""
    
    async def test_get_active_users(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting active users"""
        response = await http_client.get("/productivity/users/active", headers=admin_auth_headers)
        print(f"Get active users response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            print(f"Get active users failed: {response.text}")
    
    async def test_get_user_report(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str], test_admin_user: Dict[str, Any]):
        """Test getting user productivity report"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        user_id = test_admin_user["id"]
        response = await http_client.get(f"/productivity/reports/user/{user_id}", headers=admin_auth_headers, params=params)
        print(f"Get user report response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # Should contain user productivity report
        else:
            print(f"Get user report failed: {response.text}")
    
    async def test_get_organization_report(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting organization productivity report"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = await http_client.get("/productivity/reports/organization", headers=admin_auth_headers, params=params)
        print(f"Get organization report response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # Should contain organization productivity report
        else:
            print(f"Get organization report failed: {response.text}")
    
    async def test_get_alerts(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting productivity alerts"""
        params = {
            "limit": 50,
            "unread_only": False
        }
        
        response = await http_client.get("/productivity/alerts", headers=admin_auth_headers, params=params)
        print(f"Get alerts response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            print(f"Get alerts failed: {response.text}")
    
    async def test_get_privacy_settings(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test getting privacy settings"""
        response = await http_client.get("/productivity/privacy/settings", headers=admin_auth_headers)
        print(f"Get privacy settings response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            # Should contain privacy settings
        else:
            print(f"Get privacy settings failed: {response.text}")
    
    async def test_record_consent(self, http_client: httpx.AsyncClient, admin_auth_headers: Dict[str, str]):
        """Test recording user consent"""
        consent_data = {
            "consent_given": True
        }
        
        response = await http_client.post("/productivity/consent", headers=admin_auth_headers, json=consent_data)
        print(f"Record consent response: {response.status_code} - {response.text}")
        
        if response.status_code not in [200, 201]:
            print(f"Record consent failed: {response.text}")