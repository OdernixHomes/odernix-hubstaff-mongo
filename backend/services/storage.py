import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, BinaryIO
from fastapi import UploadFile, HTTPException, status
from config import settings
import logging
import base64
import httpx

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
            elif self.storage_type == "cloudinary":
                return await self._save_cloudinary(file, subfolder, user_id, unique_filename)
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
    
    async def _save_cloudinary(self, file: UploadFile, subfolder: str, user_id: str, filename: str) -> str:
        """Save file to Cloudinary (FREE cloud storage)"""
        try:
            # Read file content
            content = await file.read()
            
            # Prepare folder structure for organization
            folder = f"{subfolder}/{user_id}" if user_id else subfolder
            
            # Create public_id (filename without extension)
            public_id = f"{folder}/{filename.split('.')[0]}"
            
            # Encode file content to base64
            file_b64 = base64.b64encode(content).decode('utf-8')
            data_uri = f"data:{file.content_type};base64,{file_b64}"
            
            # Cloudinary upload URL
            upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload"
            
            # Prepare upload data
            upload_data = {
                "file": data_uri,
                "public_id": public_id,
                "folder": folder,
                "resource_type": "auto",
                "api_key": settings.CLOUDINARY_API_KEY
            }
            
            # Generate signature (simplified - in production, use cloudinary SDK)
            import hashlib
            import time
            timestamp = int(time.time())
            upload_data["timestamp"] = timestamp
            
            # Create signature string
            sig_params = [f"{k}={v}" for k, v in sorted(upload_data.items()) if k != "file" and k != "api_key"]
            sig_string = "&".join(sig_params) + settings.CLOUDINARY_API_SECRET
            signature = hashlib.sha1(sig_string.encode()).hexdigest()
            upload_data["signature"] = signature
            
            # Upload to Cloudinary
            async with httpx.AsyncClient() as client:
                response = await client.post(upload_url, data=upload_data)
                
                if response.status_code == 200:
                    result = response.json()
                    return result["secure_url"]
                else:
                    logger.error(f"Cloudinary upload failed: {response.status_code} - {response.text}")
                    raise StorageError(f"Cloudinary upload failed: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Cloudinary upload error: {e}")
            # Fall back to local storage
            logger.warning("Cloudinary upload failed, falling back to local storage")
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
    
    async def upload_file(self, filename: str, content: bytes, content_type: str) -> str:
        """
        Upload file content directly (for screenshot uploads)
        
        Args:
            filename: Destination filename with path
            content: File content as bytes
            content_type: MIME type of the file
            
        Returns:
            str: URL to the uploaded file
        """
        try:
            if self.storage_type == "local":
                # Ensure directory exists
                file_path = self.upload_dir / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write content to file
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                
                # Return URL
                return f"/uploads/{filename}"
                
            elif self.storage_type == "aws_s3":
                # S3 implementation would go here
                logger.warning("S3 upload not implemented, falling back to local storage")
                return await self.upload_file(filename, content, content_type)
                
            elif self.storage_type == "cloudinary":
                return await self._upload_cloudinary_direct(filename, content, content_type)
            
        except Exception as e:
            logger.error(f"Error uploading file {filename}: {e}")
            raise StorageError(f"Failed to upload file: {e}")
    
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
    
    async def _upload_cloudinary_direct(self, filename: str, content: bytes, content_type: str) -> str:
        """Upload content directly to Cloudinary"""
        try:
            # Extract folder and user info from filename
            path_parts = filename.split('/')
            folder = '/'.join(path_parts[:-1]) if len(path_parts) > 1 else 'screenshots'
            file_basename = path_parts[-1].split('.')[0]
            
            public_id = f"{folder}/{file_basename}"
            
            # Encode content to base64
            file_b64 = base64.b64encode(content).decode('utf-8')
            data_uri = f"data:{content_type};base64,{file_b64}"
            
            # Cloudinary upload URL
            upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload"
            
            # Prepare upload data
            import hashlib
            import time
            timestamp = int(time.time())
            
            upload_data = {
                "file": data_uri,
                "public_id": public_id,
                "folder": folder,
                "resource_type": "auto",
                "api_key": settings.CLOUDINARY_API_KEY,
                "timestamp": timestamp
            }
            
            # Create signature
            sig_params = [f"{k}={v}" for k, v in sorted(upload_data.items()) if k != "file" and k != "api_key"]
            sig_string = "&".join(sig_params) + settings.CLOUDINARY_API_SECRET
            signature = hashlib.sha1(sig_string.encode()).hexdigest()
            upload_data["signature"] = signature
            
            # Upload to Cloudinary
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(upload_url, data=upload_data)
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Successfully uploaded to Cloudinary: {result['secure_url']}")
                    return result["secure_url"]
                else:
                    logger.error(f"Cloudinary upload failed: {response.status_code} - {response.text}")
                    raise StorageError(f"Cloudinary upload failed: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Cloudinary direct upload error: {e}")
            # Fall back to local storage for screenshots
            file_path = self.upload_dir / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            return f"/uploads/{filename}"

# Global storage service instance
storage_service = StorageService()