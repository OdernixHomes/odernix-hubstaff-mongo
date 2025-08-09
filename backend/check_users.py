#!/usr/bin/env python3

import asyncio
from dotenv import load_dotenv
from database.mongodb import DatabaseOperations, connect_to_mongo

async def main():
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize database connection
        await connect_to_mongo()
        
        # Get all users
        users = await DatabaseOperations.get_documents('users')
        
        print("=== ALL USERS IN DATABASE ===")
        print(f"Total found: {len(users)}")
        print()
        
        for i, user in enumerate(users, 1):
            print(f"{i}. Email: {user['email']}")
            print(f"   Name: {user['name']}")
            print(f"   Role: {user['role']}")
            print(f"   Status: {user.get('status', 'unknown')}")
            print()
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())