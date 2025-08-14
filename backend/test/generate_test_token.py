#!/usr/bin/env python3
"""
Generate a test JWT token for debugging authentication issues.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from auth.jwt_handler import create_access_token

def generate_test_token():
    """Generate a test JWT token with organization context"""
    
    # Test user data (you can modify this)
    test_user_data = {
        "sub": "test@example.com",  # user email
        "user_id": "test-user-123",
        "org_id": "test-org-456",
        "role": "admin"
    }
    
    # Generate token with 24 hour expiry for testing
    token_expires = timedelta(hours=24)
    token = create_access_token(
        data=test_user_data,
        expires_delta=token_expires
    )
    
    print("=" * 60)
    print("🔑 TEST JWT TOKEN GENERATED")
    print("=" * 60)
    print(f"Token: {token}")
    print("=" * 60)
    print("📋 Token Data:")
    for key, value in test_user_data.items():
        print(f"  {key}: {value}")
    print("=" * 60)
    print("⏰ Expires: 24 hours from now")
    print("=" * 60)
    print()
    print("🔧 HOW TO USE:")
    print("1. Copy the token above")
    print("2. In browser console, run:")
    print("   localStorage.setItem('hubstaff_token', 'PASTE_TOKEN_HERE')")
    print("3. Refresh the page and try logging in")
    print("=" * 60)
    
    return token

if __name__ == "__main__":
    generate_test_token()