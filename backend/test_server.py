#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Verify secret key is loaded
secret_key = os.getenv('SECRET_KEY')
if secret_key:
    print(f"✅ SECRET_KEY loaded successfully: {secret_key[:10]}...")
    print(f"✅ Secret key length: {len(secret_key)} characters")
else:
    print("❌ SECRET_KEY not found in environment")
    sys.exit(1)

# Test basic FastAPI import
try:
    from fastapi import FastAPI
    print("✅ FastAPI imported successfully")
except ImportError as e:
    print(f"❌ FastAPI import failed: {e}")
    sys.exit(1)

print("✅ Backend configuration is valid!")
print("✅ The server should run successfully with the new secret key")