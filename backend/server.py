from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# Import database connection
from database.mongodb import connect_to_mongo, close_mongo_connection

# Import routes
from routes import auth, users, projects, time_tracking, analytics, integrations, websocket, monitoring, advanced_analytics
from routes import organizations, productivity

# Import configuration
from config import settings

# Import security middleware
from middleware.security import security_middleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await connect_to_mongo()
    logger.info("Hubstaff Clone API started successfully")
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("Hubstaff Clone API shutdown complete")

# Create the main app
app = FastAPI(
    title="Hubstaff Clone API",
    description="A comprehensive time tracking and productivity monitoring API",
    version="1.0.0",
    lifespan=lifespan
)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Add CORS middleware with production-ready settings
allowed_origins = [
    settings.FRONTEND_URL,  # Frontend URL from environment
    "http://localhost:3000",  # Local development
    "http://127.0.0.1:3000",  # Local development alternative
]

# Add production origins if environment is production
if os.getenv("ENVIRONMENT") == "production":
    # Add your production frontend URLs here
    production_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    allowed_origins.extend([origin.strip() for origin in production_origins if origin.strip()])

# Add security middleware FIRST (highest priority)
app.middleware("http")(security_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Include all route modules
api_router.include_router(organizations.router)  # Organization management (SECURE)
api_router.include_router(auth.router)  # Authentication (SECURE)
api_router.include_router(users.router)  # User management (SECURE) 
api_router.include_router(projects.router)  # Project management (SECURE)
api_router.include_router(time_tracking.router)  # Time tracking (SECURE)
api_router.include_router(analytics.router)  # Basic analytics (SECURE)
api_router.include_router(productivity.router)  # Productivity tracking (SECURE)
api_router.include_router(integrations.router)  # Integrations
api_router.include_router(monitoring.router)  # Monitoring (PARTIALLY SECURED - middleware protected)
api_router.include_router(advanced_analytics.router)  # Advanced analytics (MIDDLEWARE PROTECTED)

# Include WebSocket routes (without /api prefix)
app.include_router(websocket.router)

# Include the API router in the main app
app.include_router(api_router)

# Mount static files for uploads (if storage type is local)
if settings.STORAGE_TYPE == "local":
    uploads_path = settings.uploads_path
    if uploads_path.exists():
        app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Hubstaff Clone API",
        "version": "1.0.0"
    }

# API Health check endpoint
@api_router.get("/health")
async def api_health_check():
    return {
        "status": "healthy",
        "service": "Hubstaff Clone API",
        "version": "1.0.0",
        "api_path": "/api"
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {
        "message": "Welcome to Hubstaff Clone API",
        "version": "1.0.0",
        "documentation": "/docs"
    }
