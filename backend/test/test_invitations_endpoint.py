#!/usr/bin/env python3

import asyncio
from dotenv import load_dotenv
from database.mongodb import DatabaseOperations, connect_to_mongo
from datetime import datetime

async def main():
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize database connection
        await connect_to_mongo()
        
        # Test the same logic as the getAllInvitations endpoint
        invitations = await DatabaseOperations.get_documents("invitations")
        
        print("=== TESTING INVITATIONS ENDPOINT LOGIC ===")
        print(f"Raw invitations from DB: {len(invitations)}")
        print()
        
        # Add invite link and status to each invitation (same as endpoint)
        for invitation in invitations:
            invitation["invite_link"] = f"http://localhost:3000/accept-invite?token={invitation['token']}"
            
            if invitation["accepted"]:
                invitation["status"] = "accepted"
            elif datetime.utcnow() > invitation["expires_at"]:
                invitation["status"] = "expired"
            else:
                invitation["status"] = "pending"
        
        # Sort by created_at descending (newest first)
        invitations.sort(key=lambda x: x["created_at"], reverse=True)
        
        print("=== PROCESSED INVITATIONS (as API would return) ===")
        for inv in invitations:
            print(f"Email: {inv['email']}")
            print(f"Status: {inv['status']}")
            print(f"Created: {inv['created_at']}")
            print(f"Link: {inv['invite_link']}")
            print()
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())