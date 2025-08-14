#!/usr/bin/env python3
"""
Live endpoint testing script - tests actual API endpoints
This script tests the running API server directly
"""
import asyncio
import httpx
import json
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.ENDC}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{msg}{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*60}{Colors.ENDC}")

class APITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.client = None
        
    async def setup(self):
        """Setup HTTP client"""
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def teardown(self):
        """Cleanup HTTP client"""
        if self.client:
            await self.client.aclose()
    
    async def test_health_check(self):
        """Test health check endpoint"""
        print_header("Testing Health Check")
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print_success(f"Health check passed: {data.get('status', 'unknown')}")
                return True
            else:
                print_error(f"Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Health check error: {e}")
            return False
    
    async def cleanup_test_data(self):
        """Clean up test data"""
        try:
            if self.token:
                headers = self.get_auth_headers()
                # Clean up projects, users, etc. if needed
                print_info("Test data cleanup completed")
        except:
            pass
    
    async def test_organization_registration(self):
        """Test organization registration"""
        print_header("Testing Organization Registration")
        
        import time
        domain_suffix = int(time.time()) % 10000
        
        registration_data = {
            "organization_name": "Test Organization API",
            "organization_domain": f"test-api-org-{domain_suffix}",
            "admin_name": "API Test User",
            "admin_email": "apitest@example.com",
            "admin_password": "TestPassword123",
            "plan": "free",
            "accept_terms": True,
            "accept_privacy": True
        }
        
        try:
            response = await self.client.post(f"{self.api_base}/organizations/register", 
                                             json=registration_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = {"email": "apitest@example.com", "name": "API Test User"}  # Set user data
                print_success(f"Organization registration successful")
                print_info(f"Organization: {data.get('organization_name')}")
                return True
            elif response.status_code == 201:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                print_success(f"Organization registration successful")
                print_info(f"User created: {self.user_data.get('name')} ({self.user_data.get('email')})")
                return True
            elif response.status_code == 400:
                error_data = response.json()
                if "already registered" in error_data.get('detail', ''):
                    print_warning("Registration: Email already exists (this is OK for testing)")
                    return True  # This is acceptable for testing
                else:
                    print_error(f"Registration failed: {error_data}")
                    return False
            else:
                print_warning(f"Organization registration status: {response.status_code}")
                try:
                    error_data = response.json()
                    print_warning(f"Response: {error_data}")
                except:
                    print_warning(f"Response text: {response.text}")
                return False
        except Exception as e:
            print_error(f"Organization registration error: {e}")
            return False
    
    async def test_login(self):
        """Test login endpoint"""
        print_header("Testing Login")
        
        # We can test login even if registration failed
        # by using the default credentials
            
        login_data = {
            "email": "apitest@example.com",  # Use the email from registration
            "password": "TestPassword123"
        }
        
        try:
            response = await self.client.post(f"{self.api_base}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")  # Update token
                print_success("Login successful")
                return True
            else:
                print_error(f"Login failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print_error(f"Error: {error_data}")
                except:
                    print_error(f"Response: {response.text}")
                return False
        except Exception as e:
            print_error(f"Login error: {e}")
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if not self.token:
            return {}
        return {"Authorization": f"Bearer {self.token}"}
    
    async def test_users_endpoint(self):
        """Test users endpoints"""
        print_header("Testing Users Endpoints")
        
        if not self.token:
            print_warning("No token available for users test")
            return False
            
        headers = self.get_auth_headers()
        
        try:
            # Test get users
            response = await self.client.get(f"{self.api_base}/users/", headers=headers)
            if response.status_code == 200:
                users = response.json()
                print_success(f"Get users successful: {len(users)} users found")
                
                # Test get current user
                response = await self.client.get(f"{self.api_base}/users/me", headers=headers)
                if response.status_code == 200:
                    current_user = response.json()
                    print_success(f"Get current user successful: {current_user.get('name')}")
                    return True
                else:
                    print_error(f"Get current user failed: {response.status_code}")
                    return False
            else:
                print_error(f"Get users failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print_error(f"Error: {error_data}")
                except:
                    print_error(f"Response: {response.text}")
                return False
        except Exception as e:
            print_error(f"Users endpoint error: {e}")
            return False
    
    async def test_projects_endpoint(self):
        """Test projects endpoints"""
        print_header("Testing Projects Endpoints")
        
        if not self.token:
            print_warning("No token available for projects test")
            return False
            
        headers = self.get_auth_headers()
        
        try:
            # Test get projects
            response = await self.client.get(f"{self.api_base}/projects/", headers=headers)
            if response.status_code == 200:
                projects = response.json()
                print_success(f"Get projects successful: {len(projects)} projects found")
                
                # Test create project
                project_data = {
                    "name": "API Test Project",
                    "description": "Project created via API test",
                    "client": "API Test Client",
                    "budget": 1000.0
                }
                
                response = await self.client.post(f"{self.api_base}/projects/", 
                                                 json=project_data, headers=headers)
                if response.status_code in [200, 201]:
                    project = response.json()
                    print_success(f"Create project successful: {project.get('name')}")
                    return True
                else:
                    print_warning(f"Create project status: {response.status_code}")
                    try:
                        error_data = response.json()
                        print_warning(f"Error: {error_data}")
                    except:
                        print_warning(f"Response: {response.text}")
                    return False
            else:
                print_error(f"Get projects failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Projects endpoint error: {e}")
            return False
    
    async def test_analytics_endpoint(self):
        """Test analytics endpoints"""
        print_header("Testing Analytics Endpoints")
        
        if not self.token:
            print_warning("No token available for analytics test")
            return False
            
        headers = self.get_auth_headers()
        
        try:
            response = await self.client.get(f"{self.api_base}/analytics/dashboard", headers=headers)
            if response.status_code == 200:
                analytics = response.json()
                print_success("Analytics dashboard successful")
                print_info(f"Total hours: {analytics.get('user_stats', {}).get('total_hours', 0)}")
                return True
            else:
                print_error(f"Analytics failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print_error(f"Error: {error_data}")
                except:
                    print_error(f"Response: {response.text}")
                return False
        except Exception as e:
            print_error(f"Analytics endpoint error: {e}")
            return False
    
    async def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        print_header("Testing Unauthorized Access")
        
        endpoints = [
            f"{self.api_base}/users/",
            f"{self.api_base}/projects/",
            f"{self.api_base}/analytics/dashboard"
        ]
        
        success = True
        for endpoint in endpoints:
            try:
                response = await self.client.get(endpoint)
                if response.status_code == 403:
                    print_success(f"Unauthorized access properly blocked: {endpoint}")
                else:
                    print_warning(f"Unexpected status for {endpoint}: {response.status_code}")
                    success = False
            except Exception as e:
                print_error(f"Error testing {endpoint}: {e}")
                success = False
        
        return success
    
    async def run_all_tests(self):
        """Run all API tests"""
        print_header("API Endpoint Testing Suite")
        
        results = {}
        
        # Health check
        results["health"] = await self.test_health_check()
        
        # Unauthorized access tests
        results["unauthorized"] = await self.test_unauthorized_access()
        
        # Organization registration
        results["registration"] = await self.test_organization_registration()
        
        # Login test
        results["login"] = await self.test_login()
        
        # Protected endpoint tests
        if self.token:
            results["users"] = await self.test_users_endpoint()
            results["projects"] = await self.test_projects_endpoint()
            results["analytics"] = await self.test_analytics_endpoint()
        else:
            print_warning("Skipping protected endpoint tests (no token)")
            results["users"] = False
            results["projects"] = False
            results["analytics"] = False
        
        # Summary
        print_header("Test Results Summary")
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "PASS" if result else "FAIL"
            color = Colors.GREEN if result else Colors.RED
            print(f"{color}{test_name}: {status}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}Overall: {passed}/{total} tests passed{Colors.ENDC}")
        
        if passed == total:
            print_success("All tests passed! 🎉")
        else:
            print_warning(f"{total - passed} tests failed")
        
        return passed == total

async def main():
    """Main test function"""
    tester = APITester()
    
    try:
        await tester.setup()
        success = await tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print_error(f"Test suite failed: {e}")
        return 1
    finally:
        await tester.teardown()

if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)