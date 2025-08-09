#!/usr/bin/env python3
"""
Admin management utilities for Hubstaff Clone

Usage:
    python -m management.admin create-admin --email admin@example.com --name "Admin User" --password admin123
    python -m management.admin reset-password --email admin@example.com --password newpassword123
    python -m management.admin list-users
    python -m management.admin setup-database
"""

import asyncio
import argparse
import sys
from pathlib import Path
from typing import Optional

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from database.mongodb import DatabaseOperations, connect_to_mongo, close_mongo_connection
from auth.jwt_handler import hash_password
from models.user import User
from config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdminManager:
    """Admin management utilities"""
    
    def __init__(self):
        self.db_connected = False
    
    async def ensure_db_connection(self):
        """Ensure database connection is established"""
        if not self.db_connected:
            await connect_to_mongo()
            self.db_connected = True
    
    async def create_admin_user(self, email: str, name: str, password: str, company: str = "Hubstaff Clone") -> bool:
        """
        Create a new admin user
        
        Args:
            email: Admin email address
            name: Admin full name
            password: Admin password
            company: Company name (optional)
            
        Returns:
            bool: True if admin was created successfully
        """
        try:
            await self.ensure_db_connection()
            
            # Check if user already exists
            existing_user = await DatabaseOperations.get_document("users", {"email": email})
            if existing_user:
                logger.error(f"User with email {email} already exists")
                return False
            
            # Create admin user
            admin_user = User(
                name=name,
                email=email,
                company=company,
                role="admin",
                status="active"
            )
            
            user_dict = admin_user.dict()
            user_dict["password"] = hash_password(password)
            
            await DatabaseOperations.create_document("users", user_dict)
            
            logger.info(f"✓ Admin user created successfully!")
            logger.info(f"  Email: {email}")
            logger.info(f"  Name: {name}")
            logger.info(f"  Role: admin")
            logger.info(f"  Password: {password}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create admin user: {e}")
            return False
    
    async def reset_user_password(self, email: str, new_password: str) -> bool:
        """
        Reset a user's password
        
        Args:
            email: User email address
            new_password: New password
            
        Returns:
            bool: True if password was reset successfully
        """
        try:
            await self.ensure_db_connection()
            
            # Check if user exists
            user_data = await DatabaseOperations.get_document("users", {"email": email})
            if not user_data:
                logger.error(f"User with email {email} not found")
                return False
            
            # Update password
            hashed_password = hash_password(new_password)
            result = await DatabaseOperations.update_document(
                "users",
                {"email": email},
                {"password": hashed_password}
            )
            
            if result:
                logger.info(f"✓ Password reset successfully for {email}")
                logger.info(f"  New password: {new_password}")
                return True
            else:
                logger.error(f"Failed to reset password for {email}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to reset password: {e}")
            return False
    
    async def list_users(self, role_filter: Optional[str] = None) -> bool:
        """
        List all users in the system
        
        Args:
            role_filter: Optional role filter (admin, manager, user)
            
        Returns:
            bool: True if operation completed successfully
        """
        try:
            await self.ensure_db_connection()
            
            query = {}
            if role_filter:
                query["role"] = role_filter
            
            users = await DatabaseOperations.get_documents("users", query)
            
            if not users:
                logger.info("No users found")
                return True
            
            logger.info(f"\n{'='*80}")
            logger.info(f"{'Users List':<20} {'Role':<10} {'Status':<10} {'Email':<30}")
            logger.info(f"{'='*80}")
            
            for user in users:
                logger.info(f"{user.get('name', 'N/A'):<20} {user.get('role', 'N/A'):<10} {user.get('status', 'N/A'):<10} {user.get('email', 'N/A'):<30}")
            
            logger.info(f"{'='*80}")
            logger.info(f"Total users: {len(users)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to list users: {e}")
            return False
    
    async def setup_database(self) -> bool:
        """
        Setup database with initial configuration
        
        Returns:
            bool: True if setup completed successfully
        """
        try:
            await self.ensure_db_connection()
            
            logger.info("Setting up database...")
            
            # Check if default admin already exists
            admin_exists = await DatabaseOperations.get_document(
                "users", 
                {"email": settings.DEFAULT_ADMIN_EMAIL}
            )
            
            if not admin_exists:
                # Create default admin user
                success = await self.create_admin_user(
                    email=settings.DEFAULT_ADMIN_EMAIL,
                    name="Default Admin",
                    password=settings.DEFAULT_ADMIN_PASSWORD
                )
                
                if not success:
                    logger.error("Failed to create default admin user")
                    return False
            else:
                logger.info(f"Default admin user already exists: {settings.DEFAULT_ADMIN_EMAIL}")
            
            logger.info("✓ Database setup completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup database: {e}")
            return False
    
    async def cleanup(self):
        """Cleanup database connections"""
        if self.db_connected:
            await close_mongo_connection()

async def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Hubstaff Clone Admin Management")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create admin command
    create_parser = subparsers.add_parser('create-admin', help='Create a new admin user')
    create_parser.add_argument('--email', required=True, help='Admin email address')
    create_parser.add_argument('--name', required=True, help='Admin full name')
    create_parser.add_argument('--password', required=True, help='Admin password')
    create_parser.add_argument('--company', default='Hubstaff Clone', help='Company name')
    
    # Reset password command
    reset_parser = subparsers.add_parser('reset-password', help='Reset user password')
    reset_parser.add_argument('--email', required=True, help='User email address')
    reset_parser.add_argument('--password', required=True, help='New password')
    
    # List users command
    list_parser = subparsers.add_parser('list-users', help='List all users')
    list_parser.add_argument('--role', choices=['admin', 'manager', 'user'], help='Filter by role')
    
    # Setup database command
    subparsers.add_parser('setup-database', help='Setup database with initial configuration')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    admin_manager = AdminManager()
    
    try:
        if args.command == 'create-admin':
            success = await admin_manager.create_admin_user(
                email=args.email,
                name=args.name,
                password=args.password,
                company=args.company
            )
            sys.exit(0 if success else 1)
            
        elif args.command == 'reset-password':
            success = await admin_manager.reset_user_password(
                email=args.email,
                new_password=args.password
            )
            sys.exit(0 if success else 1)
            
        elif args.command == 'list-users':
            success = await admin_manager.list_users(role_filter=args.role)
            sys.exit(0 if success else 1)
            
        elif args.command == 'setup-database':
            success = await admin_manager.setup_database()
            sys.exit(0 if success else 1)
            
    except KeyboardInterrupt:
        logger.info("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        await admin_manager.cleanup()

if __name__ == "__main__":
    asyncio.run(main())