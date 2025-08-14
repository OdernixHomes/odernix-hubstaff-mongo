from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from models.project import Project, ProjectCreate, ProjectUpdate, Task, TaskCreate, TaskUpdate, ProjectStatus
from models.user import User
from auth.dependencies import get_current_user, require_admin_or_manager, validate_same_organization_user
from database.mongodb import DatabaseOperations
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new project with organization isolation"""
    try:
        # Validate team members belong to same organization
        if project_data.team_members:
            for member_id in project_data.team_members:
                member = await DatabaseOperations.get_document(
                    "users", 
                    {"id": member_id, "organization_id": current_user.organization_id}
                )
                if not member:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Team member {member_id} not found in your organization"
                    )
        
        # CRITICAL SECURITY: Include organization_id
        project = Project(
            **project_data.model_dump(),
            created_by=current_user.id,
            organization_id=current_user.organization_id
        )
        
        await DatabaseOperations.create_document("projects", project.model_dump())
        
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create project error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )

@router.get("/", response_model=List[Project])
async def get_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[ProjectStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """Get projects from current user's organization only (organization isolation)"""
    try:
        # CRITICAL SECURITY: Only return projects from same organization
        query = {"organization_id": current_user.organization_id}
        
        if status:
            query["status"] = status
        
        projects_data = await DatabaseOperations.get_documents(
            "projects",
            query,
            sort=[("created_at", -1)],
            skip=skip,
            limit=limit
        )
        
        return [Project(**project) for project in projects_data]
        
    except Exception as e:
        logger.error(f"Get projects error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get projects"
        )

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    """Get project by ID (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Only allow access to projects from same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        project = Project(**project_data)
        
        return project
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get project error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get project"
        )

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update project (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Only allow updates to projects from same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        project = Project(**project_data)
        
        # Check permissions within organization
        if (current_user.role not in ["admin", "manager"] and 
            project.created_by != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        update_data = project_update.dict(exclude_unset=True)
        
        # Validate team members belong to same organization
        if "team_members" in update_data and update_data["team_members"]:
            for member_id in update_data["team_members"]:
                member = await DatabaseOperations.get_document(
                    "users", 
                    {"id": member_id, "organization_id": current_user.organization_id}
                )
                if not member:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Team member {member_id} not found in your organization"
                    )
        
        # Prevent changing organization_id
        if "organization_id" in update_data:
            del update_data["organization_id"]
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # CRITICAL SECURITY: Include organization_id in update query
            await DatabaseOperations.update_document(
                "projects",
                {"id": project_id, "organization_id": current_user.organization_id},
                {"$set": update_data}
            )
        
        # Get updated project with organization validation
        updated_project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        return Project(**updated_project_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update project error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_admin_or_manager)
):
    """Delete project (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Only allow deletion of projects from same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # CRITICAL SECURITY: Delete related tasks only from same organization
        await DatabaseOperations.delete_documents(
            "tasks", 
            {"project_id": project_id, "organization_id": current_user.organization_id}
        )
        
        # CRITICAL SECURITY: Delete project with organization validation
        result = await DatabaseOperations.delete_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete project error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )

# Task endpoints
@router.post("/{project_id}/tasks", response_model=Task)
async def create_task(
    project_id: str,
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new task in project (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Verify project exists in same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Validate assignee belongs to same organization
        assignee = await DatabaseOperations.get_document(
            "users", 
            {"id": task_data.assignee_id, "organization_id": current_user.organization_id}
        )
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee not found in your organization"
            )
        
        # CRITICAL SECURITY: Include organization_id
        task = Task(
            **task_data.model_dump(),
            project_id=project_id,
            created_by=current_user.id,
            organization_id=current_user.organization_id
        )
        
        await DatabaseOperations.create_document("tasks", task.model_dump())
        
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create task error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create task"
        )

@router.get("/{project_id}/tasks", response_model=List[Task])
async def get_project_tasks(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get tasks for a project (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Verify project exists in same organization
        project_data = await DatabaseOperations.get_document(
            "projects", 
            {"id": project_id, "organization_id": current_user.organization_id}
        )
        if not project_data:
            # Don't reveal if project exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # CRITICAL SECURITY: Only get tasks from same organization
        tasks_data = await DatabaseOperations.get_documents(
            "tasks",
            {"project_id": project_id, "organization_id": current_user.organization_id},
            sort=[("created_at", -1)]
        )
        
        return [Task(**task) for task in tasks_data]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get project tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get project tasks"
        )

@router.get("/stats/dashboard")
async def get_project_stats(current_user: User = Depends(get_current_user)):
    """Get project statistics for dashboard (organization-specific)"""
    try:
        # CRITICAL SECURITY: Projects by status for current organization only
        pipeline = [
            {"$match": {"organization_id": current_user.organization_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_budget": {"$sum": "$budget"}, "total_spent": {"$sum": "$spent"}}}
        ]
        project_stats = await DatabaseOperations.aggregate("projects", pipeline)
        
        # CRITICAL SECURITY: Recent projects from current organization only
        recent_projects = await DatabaseOperations.get_documents(
            "projects",
            {"organization_id": current_user.organization_id},
            sort=[("updated_at", -1)],
            limit=5
        )
        
        # CRITICAL SECURITY: Task statistics from current organization only
        task_pipeline = [
            {"$match": {"organization_id": current_user.organization_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        task_stats = await DatabaseOperations.aggregate("tasks", task_pipeline)
        
        return {
            "project_stats": {stat["_id"]: {"count": stat["count"], "budget": stat["total_budget"], "spent": stat["total_spent"]} for stat in project_stats},
            "recent_projects": [Project(**project) for project in recent_projects],
            "task_stats": {stat["_id"]: stat["count"] for stat in task_stats}
        }
        
    except Exception as e:
        logger.error(f"Get project stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get project statistics"
        )

# Task management endpoints
@router.get("/tasks/assigned", response_model=List[Task])
async def get_assigned_tasks(current_user: User = Depends(get_current_user)):
    """Get tasks assigned to current user (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only get tasks assigned to user in their organization
        tasks_data = await DatabaseOperations.get_documents(
            "tasks",
            {"assignee_id": current_user.id, "organization_id": current_user.organization_id},
            sort=[("created_at", -1)]
        )
        
        return [Task(**task) for task in tasks_data]
        
    except Exception as e:
        logger.error(f"Get assigned tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assigned tasks"
        )

@router.get("/tasks/all", response_model=List[Task])
async def get_all_tasks(current_user: User = Depends(get_current_user)):
    """Get all tasks from current organization (organization-specific)"""
    try:
        # CRITICAL SECURITY: Only get tasks from current organization
        tasks_data = await DatabaseOperations.get_documents(
            "tasks",
            {"organization_id": current_user.organization_id},
            sort=[("created_at", -1)]
        )
        
        return [Task(**task) for task in tasks_data]
        
    except Exception as e:
        logger.error(f"Get all tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get all tasks"
        )

@router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update task (with organization isolation)"""
    try:
        # CRITICAL SECURITY: Only allow access to tasks from same organization
        task_data = await DatabaseOperations.get_document(
            "tasks", 
            {"id": task_id, "organization_id": current_user.organization_id}
        )
        if not task_data:
            # Don't reveal if task exists in different organization
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = Task(**task_data)
        
        # Check permissions: assignee can update status, admin/manager can update everything
        if task.assignee_id != current_user.id and current_user.role not in ["admin", "manager"]:
            # Non-assignee users can only update if they're admin/manager
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only task assignee or admin/manager can update this task"
            )
        
        update_data = task_update.dict(exclude_unset=True)
        
        # Validate assignee belongs to same organization if being changed
        if "assignee_id" in update_data:
            assignee = await DatabaseOperations.get_document(
                "users", 
                {"id": update_data["assignee_id"], "organization_id": current_user.organization_id}
            )
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee not found in your organization"
                )
        
        # If user is assignee but not admin/manager, only allow status updates
        if task.assignee_id == current_user.id and current_user.role not in ["admin", "manager"]:
            # Filter update to only allow status changes
            allowed_updates = {}
            if task_update.status is not None:
                allowed_updates["status"] = task_update.status
            update_data = allowed_updates
        
        # Prevent changing organization_id
        if "organization_id" in update_data:
            del update_data["organization_id"]
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # CRITICAL SECURITY: Include organization_id in update query
            await DatabaseOperations.update_document(
                "tasks",
                {"id": task_id, "organization_id": current_user.organization_id},
                {"$set": update_data}
            )
        
        # Get updated task with organization validation
        updated_task_data = await DatabaseOperations.get_document(
            "tasks", 
            {"id": task_id, "organization_id": current_user.organization_id}
        )
        return Task(**updated_task_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update task error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )