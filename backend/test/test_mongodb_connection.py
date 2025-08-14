#!/usr/bin/env python3
"""
MongoDB Connection Test Script
Tests the MongoDB connection using the configuration from .env file
"""

import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

async def test_mongodb_connection():
    """Test MongoDB connection and basic operations"""
    
    mongo_url = os.getenv('MONGO_URL')
    db_name = os.getenv('DB_NAME', 'hubstaff_clone')
    
    print(f"Testing MongoDB connection...")
    print(f"Database: {db_name}")
    print(f"Connection URL: {mongo_url[:30]}...")
    
    try:
        # Create MongoDB client
        client = AsyncIOMotorClient(mongo_url)
        
        # Test connection by pinging the server
        print("\n1. Testing server connection...")
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB server")
        
        # Get database
        db = client[db_name]
        
        # Test database access
        print(f"\n2. Testing database access ({db_name})...")
        collections = await db.list_collection_names()
        print(f"✅ Successfully accessed database. Collections: {collections}")
        
        # Test write operation
        print("\n3. Testing write operation...")
        test_collection = db['connection_test']
        test_doc = {"test": "connection", "timestamp": "2024-01-01"}
        result = await test_collection.insert_one(test_doc)
        print(f"✅ Successfully inserted test document with ID: {result.inserted_id}")
        
        # Test read operation
        print("\n4. Testing read operation...")
        found_doc = await test_collection.find_one({"_id": result.inserted_id})
        print(f"✅ Successfully read document: {found_doc}")
        
        # Clean up test document
        print("\n5. Cleaning up test data...")
        await test_collection.delete_one({"_id": result.inserted_id})
        print("✅ Successfully cleaned up test document")
        
        # Show database stats
        print("\n6. Database statistics...")
        stats = await db.command("dbStats")
        print(f"✅ Database size: {stats.get('dataSize', 0)} bytes")
        print(f"✅ Collections: {stats.get('collections', 0)}")
        
        print("\n🎉 All MongoDB connection tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ MongoDB connection test failed: {str(e)}")
        return False
        
    finally:
        # Close the connection
        if 'client' in locals():
            client.close()
            print("\n📝 MongoDB connection closed")

async def check_existing_data():
    """Check for existing collections and data"""
    
    mongo_url = os.getenv('MONGO_URL')
    db_name = os.getenv('DB_NAME', 'hubstaff_clone')
    
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print(f"\n📊 Checking existing data in {db_name}...")
        
        collections = await db.list_collection_names()
        if not collections:
            print("No collections found in database")
            return
            
        for collection_name in collections:
            collection = db[collection_name]
            count = await collection.count_documents({})
            print(f"  📁 {collection_name}: {count} documents")
            
            if count > 0 and count <= 3:
                # Show sample documents for small collections
                print(f"    Sample documents:")
                async for doc in collection.find().limit(2):
                    # Remove _id for cleaner output
                    doc_copy = {k: v for k, v in doc.items() if k != '_id'}
                    print(f"      {doc_copy}")
        
    except Exception as e:
        print(f"Error checking existing data: {str(e)}")
    finally:
        if 'client' in locals():
            client.close()

def main():
    """Main function to run the connection test"""
    print("🔍 MongoDB Connection Test")
    print("=" * 50)
    
    # Check if required environment variables are set
    mongo_url = os.getenv('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL environment variable not found!")
        print("Make sure the .env file exists and contains MONGO_URL")
        sys.exit(1)
    
    # Run the async test
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Test connection
        success = loop.run_until_complete(test_mongodb_connection())
        
        if success:
            # Check existing data
            loop.run_until_complete(check_existing_data())
            
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        return 1
    finally:
        loop.close()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)