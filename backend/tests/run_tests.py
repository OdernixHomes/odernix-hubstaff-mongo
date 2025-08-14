#!/usr/bin/env python3
"""
Comprehensive test runner for Hubstaff Clone API
This script runs all tests and provides detailed reporting
"""
import asyncio
import subprocess
import sys
import os
from pathlib import Path
import time
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_colored(message, color=Colors.ENDC):
    """Print colored message"""
    print(f"{color}{message}{Colors.ENDC}")

def print_header(message):
    """Print header message"""
    print_colored(f"\n{'='*60}", Colors.HEADER)
    print_colored(f"{message}", Colors.HEADER)
    print_colored(f"{'='*60}", Colors.HEADER)

def print_success(message):
    """Print success message"""
    print_colored(f"✅ {message}", Colors.OKGREEN)

def print_error(message):
    """Print error message"""
    print_colored(f"❌ {message}", Colors.FAIL)

def print_warning(message):
    """Print warning message"""
    print_colored(f"⚠️  {message}", Colors.WARNING)

def print_info(message):
    """Print info message"""
    print_colored(f"ℹ️  {message}", Colors.OKBLUE)

async def check_server_health():
    """Check if the server is running and healthy"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8001/health")
            if response.status_code == 200:
                print_success("Server is running and healthy")
                return True
            else:
                print_error(f"Server health check failed: {response.status_code}")
                return False
    except Exception as e:
        print_error(f"Cannot connect to server: {e}")
        print_info("Make sure the server is running: uvicorn server:app --host 0.0.0.0 --port 8001")
        return False

def run_pytest_tests():
    """Run pytest tests with detailed output"""
    print_header("Running Backend API Tests")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    
    # Run pytest with verbose output
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--color=yes",
        "--durations=10",
        "-x"  # Stop on first failure
    ]
    
    print_info(f"Running command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Print stdout
        if result.stdout:
            print(result.stdout)
        
        # Print stderr
        if result.stderr:
            print_colored("STDERR:", Colors.WARNING)
            print(result.stderr)
        
        if result.returncode == 0:
            print_success("All tests passed!")
            return True
        else:
            print_error(f"Tests failed with return code: {result.returncode}")
            return False
            
    except Exception as e:
        print_error(f"Failed to run pytest: {e}")
        return False

def run_manual_endpoint_tests():
    """Run manual endpoint tests using curl"""
    print_header("Running Manual Endpoint Tests")
    
    # Test basic endpoints without authentication
    basic_endpoints = [
        ("GET", "http://localhost:8001/health", "Health Check"),
        ("GET", "http://localhost:8001/docs", "API Documentation"),
    ]
    
    for method, url, description in basic_endpoints:
        try:
            cmd = ["curl", "-s", "-w", "%{http_code}", "-o", "/dev/null", url]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            status_code = result.stdout.strip()
            if status_code == "200":
                print_success(f"{description}: {status_code}")
            else:
                print_warning(f"{description}: {status_code}")
                
        except subprocess.TimeoutExpired:
            print_error(f"{description}: Timeout")
        except Exception as e:
            print_error(f"{description}: {e}")

def check_test_requirements():
    """Check if all test requirements are installed"""
    print_header("Checking Test Requirements")
    
    required_packages = [
        "pytest",
        "httpx",
        "websockets",
        "pytest-asyncio"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print_success(f"{package} is installed")
        except ImportError:
            print_error(f"{package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        print_warning("Install missing packages with:")
        print_info(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def generate_test_report():
    """Generate a test report"""
    print_header("Test Report")
    
    report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "server_status": "Unknown",
        "test_results": "Unknown"
    }
    
    # Save report to file
    report_file = Path("test_report.txt")
    with open(report_file, "w") as f:
        f.write(f"Hubstaff Clone API Test Report\n")
        f.write(f"Generated: {report_data['timestamp']}\n")
        f.write(f"{'='*50}\n\n")
        f.write(f"Server Status: {report_data['server_status']}\n")
        f.write(f"Test Results: {report_data['test_results']}\n")
    
    print_info(f"Test report saved to: {report_file}")

async def main():
    """Main test runner function"""
    print_header("Hubstaff Clone API Test Suite")
    
    # Check requirements
    if not check_test_requirements():
        print_error("Missing test requirements. Please install them first.")
        return 1
    
    # Check server health
    server_healthy = await check_server_health()
    if not server_healthy:
        print_error("Server is not healthy. Cannot run API tests.")
        return 1
    
    # Run manual tests
    run_manual_endpoint_tests()
    
    # Run pytest tests
    tests_passed = run_pytest_tests()
    
    # Generate report
    generate_test_report()
    
    if tests_passed:
        print_success("All tests completed successfully!")
        return 0
    else:
        print_error("Some tests failed. Please check the output above.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print_warning("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Test runner failed: {e}")
        sys.exit(1)