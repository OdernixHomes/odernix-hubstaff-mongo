#!/usr/bin/env python3
"""
DEPRECATED: This script is deprecated. Use the new admin management system instead.

New usage:
    python -m management.admin reset-password --email admin@example.com --password newpassword123
    python -m management.admin create-admin --email admin@example.com --name "Admin User" --password admin123
    python -m management.admin setup-database
"""

import sys
print("="*80)
print("⚠️  DEPRECATION WARNING")
print("="*80)
print("This script is deprecated. Please use the new admin management system:")
print()
print("To reset a password:")
print("    python -m management.admin reset-password --email admin@example.com --password newpassword123")
print()
print("To create a new admin:")
print("    python -m management.admin create-admin --email admin@example.com --name 'Admin User' --password admin123")
print()
print("To setup the database:")
print("    python -m management.admin setup-database")
print()
print("="*80)
sys.exit(1)