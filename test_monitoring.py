#!/usr/bin/env python3
"""
Test script for the new monitoring and analytics features
"""
import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "ChangeThisPassword123!"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpass123"

def test_health():
    """Test if the API is running"""
    try:
        response = requests.get("http://localhost:8001/health")
        if response.status_code == 200:
            print("✅ API Health Check: PASSED")
            return True
        else:
            print("❌ API Health Check: FAILED")
            return False
    except Exception as e:
        print(f"❌ API Health Check: ERROR - {e}")
        return False

def login_admin():
    """Login admin user and get token"""
    try:
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print("✅ Admin Login: PASSED")
                return token
            else:
                print("❌ Admin Login: No token received")
                return None
        else:
            print(f"❌ Admin Login: FAILED - {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Admin Login: ERROR - {e}")
        return None

def invite_test_user(admin_token):
    """Invite a test user"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        invite_data = {
            "email": TEST_USER_EMAIL,
            "role": "user"
        }
        response = requests.post(f"{BASE_URL}/auth/invite", json=invite_data, headers=headers)
        if response.status_code in [200, 201]:
            print("✅ Test User Invitation: SENT")
            return True
        elif response.status_code == 400 and "already" in response.text:
            print("✅ Test User Already Invited: OK")
            return True
        else:
            print(f"❌ Test User Invitation: FAILED - {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Test User Invitation: ERROR - {e}")
        return False

def login_test_user():
    """Login test user and get token"""
    try:
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print("✅ Test User Login: PASSED")
                return token
            else:
                print("❌ Test User Login: No token received")
                return None
        else:
            print(f"❌ Test User Login: FAILED - {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Test User Login: ERROR - {e}")
        return None

def test_monitoring_endpoints(token):
    """Test monitoring endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test monitoring settings endpoint
    try:
        response = requests.get(f"{BASE_URL}/monitoring/settings", headers=headers)
        if response.status_code == 200:
            print("✅ Monitoring Settings: PASSED")
        else:
            print(f"❌ Monitoring Settings: FAILED - {response.status_code}")
    except Exception as e:
        print(f"❌ Monitoring Settings: ERROR - {e}")
    
    # Test advanced analytics dashboard
    try:
        response = requests.get(f"{BASE_URL}/advanced-analytics/dashboard/enhanced", headers=headers)
        if response.status_code == 200:
            print("✅ Enhanced Dashboard: PASSED")
        else:
            print(f"❌ Enhanced Dashboard: FAILED - {response.status_code}")
    except Exception as e:
        print(f"❌ Enhanced Dashboard: ERROR - {e}")
    
    # Test goals endpoint
    try:
        response = requests.get(f"{BASE_URL}/advanced-analytics/goals", headers=headers)
        if response.status_code == 200:
            print("✅ Goals Endpoint: PASSED")
        else:
            print(f"❌ Goals Endpoint: FAILED - {response.status_code}")
    except Exception as e:
        print(f"❌ Goals Endpoint: ERROR - {e}")

def test_frontend_api_client():
    """Test if frontend can connect to backend"""
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend Server: RUNNING")
            return True
        else:
            print(f"❌ Frontend Server: Response {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend Server: ERROR - {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Hubstaff Clone Monitoring Tests\n")
    
    # Test basic connectivity
    if not test_health():
        print("\n❌ Basic health check failed. Make sure the backend is running on port 8001.")
        return False
    
    # Test frontend
    test_frontend_api_client()
    
    # Login as admin
    admin_token = login_admin()
    if not admin_token:
        print("\n❌ Could not login as admin. Check credentials.")
        return False
    
    # Invite test user (admin can use all endpoints too)
    invite_test_user(admin_token)
    
    print(f"\n🔑 Admin token received: {admin_token[:20]}...")
    
    # Test monitoring endpoints with admin token
    print("\n🔍 Testing Monitoring & Analytics Endpoints:")
    test_monitoring_endpoints(admin_token)
    
    print("\n✅ All tests completed!")
    print("\n📋 Next Steps:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Login with admin credentials:")
    print("   Email:", ADMIN_EMAIL)
    print("   Password:", ADMIN_PASSWORD)
    print("3. Navigate to the Analytics page to test new features")
    print("4. Try the Time Tracking page with enhanced monitoring")
    print("5. Create projects and start time tracking to generate data")
    
    return True

if __name__ == "__main__":
    main()