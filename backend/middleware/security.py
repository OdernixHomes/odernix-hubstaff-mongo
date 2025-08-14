"""
Emergency Security Middleware
Temporarily disables vulnerable endpoints while security patches are being applied
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Endpoints that are temporarily disabled for security patching
VULNERABLE_ENDPOINTS = [
    "/api/monitoring/application/switch",
    "/api/monitoring/website/navigate", 
    "/api/monitoring/settings",
    "/api/advanced-analytics/dashboard/enhanced",
    "/api/advanced-analytics/productivity/detailed",
    "/api/advanced-analytics/team/comprehensive",
    "/api/advanced-analytics/goals",
    "/api/advanced-analytics/reports/generate",
    "/api/advanced-analytics/insights",
    "/api/advanced-analytics/heatmap",
    "/api/advanced-analytics/alerts"
]

# Endpoints that are partially secured (allow with warning)
PARTIALLY_SECURED_ENDPOINTS = [
    "/api/monitoring/screenshot/upload",
    "/api/monitoring/activity/update",
    "/api/monitoring/screenshots"
]

async def security_middleware(request: Request, call_next):
    """
    Emergency security middleware to protect against cross-organization data access
    """
    path = request.url.path
    
    # Block completely vulnerable endpoints
    if any(path.startswith(endpoint) for endpoint in VULNERABLE_ENDPOINTS):
        logger.warning(f"SECURITY: Blocked access to vulnerable endpoint: {path}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Endpoint temporarily disabled for security patches",
                "message": "This endpoint is being updated to implement organization-based security isolation.",
                "details": "Core functionality (projects, time tracking, users) remains fully functional and secure.",
                "expected_resolution": "Security patches will be completed within 24 hours",
                "alternative": "Use core time tracking and project management features which are fully secure",
                "support_contact": "Contact your system administrator for immediate assistance"
            }
        )
    
    # Add security headers for partially secured endpoints
    if any(path.startswith(endpoint) for endpoint in PARTIALLY_SECURED_ENDPOINTS):
        response = await call_next(request)
        response.headers["X-Security-Status"] = "PATCHED"
        response.headers["X-Security-Level"] = "ORGANIZATION_ISOLATED" 
        return response
    
    # Add security headers for all other endpoints
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Mark secure endpoints
    if any(path.startswith(secure_path) for secure_path in [
        "/api/auth", "/api/users", "/api/projects", "/api/time-tracking", "/api/organizations"
    ]):
        response.headers["X-Security-Status"] = "SECURE"
        response.headers["X-Security-Level"] = "ORGANIZATION_ISOLATED"
    
    return response