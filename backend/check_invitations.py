#!/usr/bin/env python3

import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv
from database.mongodb import DatabaseOperations, connect_to_mongo

async def main():
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize database connection
        await connect_to_mongo()
        
        # Get all invitations
        invitations = await DatabaseOperations.get_documents('invitations')
        
        print("=== ALL INVITATIONS IN DATABASE ===")
        print(f"Total found: {len(invitations)}")
        print()
        
        if not invitations:
            print("No invitations found in database.")
            return
            
        for i, inv in enumerate(invitations, 1):
            print(f"{i}. Email: {inv['email']}")
            print(f"   Role: {inv['role']}")
            print(f"   Accepted: {'Yes' if inv['accepted'] else 'No'}")
            print(f"   Created: {inv['created_at']}")
            print(f"   Expires: {inv['expires_at']}")
            print(f"   Token: {inv['token']}")
            print(f"   Invite Link: http://localhost:3000/accept-invite?token={inv['token']}")
            print()
            
        # Check specific emails
        target_emails = ['balogunsamueltobi@gmail.com', 'samlito001@gmail.com']
        print("=== CHECKING SPECIFIC EMAILS ===")
        for email in target_emails:
            found = [inv for inv in invitations if inv['email'] == email]
            if found:
                print(f"✓ Found invitation for {email}")
                for inv in found:
                    status = "accepted" if inv['accepted'] else "pending"
                    print(f"  Status: {status}")
                    if not inv['accepted']:
                        print(f"  Invite Link: http://localhost:3000/accept-invite?token={inv['token']}")
            else:
                print(f"✗ No invitation found for {email}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())