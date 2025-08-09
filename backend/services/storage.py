import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, BinaryIO
from fastapi import UploadFile, HTTPException, status
from config import settings
import logging

logger = logging.getLogger(__name__)

class StorageError(Exception):
    """Custom exception for storage operations"""
    pass

class StorageService:
    """File storage service with support for local and cloud storage"""
    
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.upload_dir = settings.uploads_path
        
    async def save_file(self, file: UploadFile, subfolder: str = "", user_id: str = "") -> str:
        """
        Save uploaded file and return the file URL/path
        
        Args:
            file: FastAPI UploadFile object
            subfolder: Subfolder to organize files (e.g., 'screenshots', 'avatars')
            user_id: User ID for organizing user-specific files
            
        Returns:
            str: URL or path to the saved file
        """
        try:
            # Validate file size
            if file.size and file.size > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,  
                    detail=f"File size exceeds maximum limit of {settings.MAX_FILE_SIZE} bytes"
                )
            
            # Generate unique filename
            file_extension = self._get_file_extension(file.filename)
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            if self.storage_type == "local":
                return await self._save_local(file, subfolder, user_id, unique_filename)
            elif self.storage_type == "aws_s3":
                return await self._save_s3(file, subfolder, user_id, unique_filename)
            else:
                raise StorageError(f"Unsupported storage type: {self.storage_type}")
                
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save file"
            )
    
    async def _save_local(self, file: UploadFile, subfolder: str, user_id: str, filename: str) -> str:
        """Save file to local filesystem"""
        # Create file path
        file_path = self.upload_dir / subfolder
        if user_id:
            file_path = file_path / user_id
        file_path.mkdir(parents=True, exist_ok=True)
        
        full_path = file_path / filename
        
        # Save file
        async with aiofiles.open(full_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Return relative URL path
        relative_path = full_path.relative_to(self.upload_dir)
        return f"/uploads/{relative_path}"
    
    async def _save_s3(self, file: UploadFile, subfolder: str, user_id: str, filename: str) -> str:
        """Save file to AWS S3 (placeholder implementation)"""
        # This would require boto3 implementation
        # For now, fall back to local storage
        logger.warning("S3 storage not implemented, falling back to local storage")
        return await self._save_local(file, subfolder, user_id, filename)
    
    def _get_file_extension(self, filename: Optional[str]) -> str:
        """Extract file extension from filename"""
        if not filename:
            return ""
        return Path(filename).suffix.lower()
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            bool: True if file was deleted successfully
        """
        try:
            if self.storage_type == "local":
                full_path = self.upload_dir / file_path.lstrip("/uploads/")
                if full_path.exists():
                    full_path.unlink()
                    return True
            # Add S3 deletion logic here if needed
            return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """
        Get the full URL for a file
        
        Args:
            file_path: Relative file path
            
        Returns:
            str: Full URL to the file
        """
        if file_path.startswith("http"):
            return file_path  # Already a full URL
        
        if self.storage_type == "local":
            return f"{settings.FRONTEND_URL}{file_path}"
        elif self.storage_type == "aws_s3":
            # Return S3 URL
            return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com{file_path}"
        
        return file_path

# Global storage service instance
storage_service = StorageService()