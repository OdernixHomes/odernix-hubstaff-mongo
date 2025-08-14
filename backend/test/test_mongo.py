from fastapi import FastAPI
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Get MongoDB URI from environment
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Create FastAPI app
app = FastAPI()

# Test MongoDB connection
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.test_database
    # Force a call to trigger error if connection fails
    client.server_info()
    mongo_status = "Connected successfully ✅"
except Exception as e:
    mongo_status = f"Connection failed ❌: {str(e)}"

@app.get("/")
def root():
    return {"message": "MongoDB connection test API"}

@app.get("/test-mongo")
def test_mongo():
    return {
        "status": mongo_status,
        "database": db.name if mongo_status.startswith("Connected") else None
    }
