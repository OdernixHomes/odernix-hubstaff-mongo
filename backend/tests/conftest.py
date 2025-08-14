"""
Test configuration and fixtures for the Hubstaff Clone API tests
"""
import pytest
import pytest_asyncio
import asyncio
import httpx
import os
from typing import AsyncGenerator, Dict, Any
from dotenv import load_dotenv
from database.mongodb import connect_to_mongo, close_mongo_connection, DatabaseOperations
from auth.jwt_handler import create_access_token
import uuid

load_dotenv()

# Test configuration
API_BASE_URL = "http://localhost:8001/api"
WS_BASE_URL = "ws://localhost:8001"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def setup_database():
    """Setup database connection for tests"""
    await connect_to_mongo()
    yield
    await close_mongo_connection()

@pytest_asyncio.fixture(scope="session")
async def http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create HTTP client for API testing"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        yield client

@pytest_asyncio.fixture(scope="session")
async def test_organization(setup_database) -> Dict[str, Any]:
    """Create a test organization"""
    org_id = str(uuid.uuid4())
    org_data = {
        "id": org_id,
        "name": "Test Organization",
        "description": "Organization for testing purposes",
        "industry": "Technology",
        "size": "small",
        "timezone": "UTC",
        "current_users": 0,
        "max_users": 100,
        "created_at": "2025-01-01T00:00:00",
        "settings": {
            "screenshot_interval": 300,
            "activity_tracking": True,
            "idle_timeout": 900
        }
    }
    
    # Insert test organization
    await DatabaseOperations.create_document("organizations", org_data)
    
    yield org_data
    
    # Cleanup
    await DatabaseOperations.delete_document("organizations", {"id": org_id})

@pytest_asyncio.fixture(scope="session")
async def test_admin_user(setup_database, test_organization) -> Dict[str, Any]:
    """Create a test admin user"""
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "name": "Test Admin",
        "email": "admin@test.com",
        "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewX5lS3J6.PJXqNW",  # "password123"
        "role": "admin",
        "status": "active",
        "organization_id": test_organization["id"],
        "is_organization_owner": True,
        "timezone": "UTC",
        "created_at": "2025-01-01T00:00:00",
        "email_verified": True
    }
    
    # Insert test user
    await DatabaseOperations.create_document("users", user_data)
    
    # Create JWT token
    token_data = {
        "sub": user_data["email"],
        "user_id": user_data["id"],
        "org_id": user_data["organization_id"]
    }
    access_token = create_access_token(token_data)
    user_data["access_token"] = access_token
    
    yield user_data
    
    # Cleanup
    await DatabaseOperations.delete_document("users", {"id": user_id})

@pytest_asyncio.fixture(scope="session")
async def test_regular_user(setup_database, test_organization) -> Dict[str, Any]:
    """Create a test regular user"""
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "name": "Test User",
        "email": "user@test.com",
        "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewX5lS3J6.PJXqNW",  # "password123"
        "role": "user",
        "status": "active",
        "organization_id": test_organization["id"],
        "is_organization_owner": False,
        "timezone": "UTC",
        "created_at": "2025-01-01T00:00:00",
        "email_verified": True
    }
    
    # Insert test user
    await DatabaseOperations.create_document("users", user_data)
    
    # Create JWT token
    token_data = {
        "sub": user_data["email"],
        "user_id": user_data["id"],
        "org_id": user_data["organization_id"]
    }
    access_token = create_access_token(token_data)
    user_data["access_token"] = access_token
    
    yield user_data
    
    # Cleanup
    await DatabaseOperations.delete_document("users", {"id": user_id})

@pytest_asyncio.fixture
async def test_project(setup_database, test_admin_user) -> Dict[str, Any]:
    """Create a test project"""
    project_id = str(uuid.uuid4())
    project_data = {
        "id": project_id,
        "name": "Test Project",
        "description": "A test project",
        "client": "Test Client",
        "budget": 1000.0,
        "spent": 0.0,
        "hours_tracked": 0.0,
        "status": "active",
        "created_by": test_admin_user["id"],
        "organization_id": test_admin_user["organization_id"],
        "team_members": [test_admin_user["id"]],
        "created_at": "2025-01-01T00:00:00",
        "updated_at": "2025-01-01T00:00:00"
    }
    
    # Insert test project
    await DatabaseOperations.create_document("projects", project_data)
    
    yield project_data
    
    # Cleanup
    await DatabaseOperations.delete_document("projects", {"id": project_id})

def auth_headers(user_data: Dict[str, Any]) -> Dict[str, str]:
    """Get authorization headers for a user"""
    return {"Authorization": f"Bearer {user_data['access_token']}"}

@pytest.fixture
def admin_auth_headers(test_admin_user):
    """Get admin authorization headers"""
    return auth_headers(test_admin_user)

@pytest.fixture
def user_auth_headers(test_regular_user):
    """Get regular user authorization headers"""
    return auth_headers(test_regular_user)