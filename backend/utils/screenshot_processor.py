import os
import asyncio
from typing import Optional, Dict, List, Any
from datetime import datetime
from PIL import Image, ImageFilter, ImageDraw
import io
import base64
import uuid

from models.productivity import ScreenshotAnalysis
from database.mongodb import DatabaseOperations

class ScreenshotProcessor:
    """Advanced screenshot processing and analysis"""
    
    # Privacy-sensitive content patterns
    SENSITIVE_PATTERNS = [
        r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # Credit card numbers
        r'\b\d{3}-\d{2}-\d{4}\b',                        # SSN
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email addresses
        r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'       # IP addresses
    ]
    
    # Productivity-indicating elements
    PRODUCTIVE_INDICATORS = {
        'code_editors': ['vscode', 'sublime', 'vim', 'atom', 'intellij'],
        'terminals': ['terminal', 'cmd', 'powershell', 'bash'],
        'development_tools': ['git', 'docker', 'postman', 'swagger'],
        'office_apps': ['word', 'excel', 'powerpoint', 'google docs'],
        'design_tools': ['photoshop', 'illustrator', 'figma', 'sketch'],
        'communication': ['teams', 'slack', 'zoom', 'discord']
    }
    
    DISTRACTING_INDICATORS = {
        'social_media': ['facebook', 'twitter', 'instagram', 'tiktok'],
        'entertainment': ['netflix', 'youtube', 'twitch', 'spotify'],
        'games': ['steam', 'epic games', 'origin', 'gaming'],
        'shopping': ['amazon', 'ebay', 'shopping', 'cart']
    }
    
    @classmethod
    async def initialize_for_user(
        cls,
        user_id: str,
        organization_id: str,
        time_entry_id: str
    ) -> Dict[str, Any]:
        """Initialize screenshot processing for a user session"""
        try:
            # Create user-specific screenshot directory
            upload_dir = os.getenv("UPLOAD_DIR", "uploads")
            user_dir = os.path.join(upload_dir, "screenshots", organization_id, user_id)
            os.makedirs(user_dir, exist_ok=True)
            
            # Get user privacy settings
            privacy_settings = await DatabaseOperations.get_document(
                "monitoring_settings",
                {
                    "user_id": user_id,
                    "organization_id": organization_id
                }
            )
            
            return {
                "success": True,
                "screenshot_directory": user_dir,
                "privacy_settings": privacy_settings or {},
                "auto_blur_enabled": privacy_settings.get("blur_screenshots", False) if privacy_settings else False
            }
            
        except Exception as e:
            print(f"Error initializing screenshot processor: {e}")
            return {"success": False, "error": str(e)}
    
    @classmethod
    async def create_thumbnail(
        cls,
        screenshot_data: bytes,
        thumbnail_path: str,
        size: tuple = (200, 150)
    ) -> bool:
        """Create thumbnail from screenshot"""
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(screenshot_data))
            
            # Create thumbnail
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            image.save(thumbnail_path, "PNG", optimize=True)
            
            return True
            
        except Exception as e:
            print(f"Error creating thumbnail: {e}")
            return False
    
    @classmethod
    async def apply_privacy_blur(
        cls,
        screenshot_data: bytes,
        blur_level: int = 3,
        sensitive_areas: List[Dict[str, float]] = None
    ) -> bytes:
        """Apply privacy blur to screenshot"""
        try:
            image = Image.open(io.BytesIO(screenshot_data))
            
            if sensitive_areas:
                # Blur only specific areas
                for area in sensitive_areas:
                    x1 = int(area['x'] * image.width)
                    y1 = int(area['y'] * image.height)
                    x2 = int((area['x'] + area['width']) * image.width)
                    y2 = int((area['y'] + area['height']) * image.height)
                    
                    # Extract region, blur it, and paste back
                    region = image.crop((x1, y1, x2, y2))
                    blurred_region = region.filter(ImageFilter.GaussianBlur(radius=blur_level))
                    image.paste(blurred_region, (x1, y1))
            else:
                # Blur entire image
                image = image.filter(ImageFilter.GaussianBlur(radius=blur_level))
            
            # Convert back to bytes
            output = io.BytesIO()
            image.save(output, format='PNG')
            return output.getvalue()
            
        except Exception as e:
            print(f"Error applying privacy blur: {e}")
            return screenshot_data
    
    @classmethod
    async def analyze_screenshot(
        cls,
        screenshot_data: bytes,
        user_id: str,
        organization_id: str
    ) -> Optional[ScreenshotAnalysis]:
        """Analyze screenshot for productivity insights"""
        try:
            # Note: In a real implementation, this would use OCR and computer vision
            # For this example, we'll simulate the analysis
            
            analysis = ScreenshotAnalysis(
                screenshot_id=str(uuid.uuid4()),
                user_id=user_id,
                organization_id=organization_id,
                analysis_timestamp=datetime.utcnow()
            )
            
            # Simulate OCR text extraction
            extracted_text = await cls._simulate_ocr_extraction(screenshot_data)
            
            # Analyze productivity
            productivity_score = await cls._analyze_productivity_content(extracted_text)
            analysis.productivity_score = productivity_score
            
            # Analyze focus level
            focus_level = await cls._analyze_focus_level(extracted_text)
            analysis.focus_level = focus_level
            
            # Detect applications
            detected_apps = await cls._detect_applications(extracted_text)
            analysis.applications_detected = detected_apps
            
            # Detect websites
            detected_websites = await cls._detect_websites(extracted_text)
            analysis.websites_detected = detected_websites
            
            # Check for sensitive content
            contains_sensitive = await cls._detect_sensitive_content(extracted_text)
            analysis.contains_sensitive_data = contains_sensitive
            
            # Calculate screen utilization
            screen_utilization = await cls._calculate_screen_utilization(screenshot_data)
            analysis.screen_utilization = screen_utilization
            
            # Calculate distraction level
            distraction_level = 100.0 - productivity_score
            analysis.distraction_level = max(0.0, distraction_level)
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing screenshot: {e}")
            return None
    
    @classmethod
    async def _simulate_ocr_extraction(cls, screenshot_data: bytes) -> str:
        """Simulate OCR text extraction (would use real OCR in production)"""
        # In production, this would use libraries like pytesseract or cloud OCR services
        # For demonstration, we'll return simulated text based on common scenarios
        
        simulated_texts = [
            "Visual Studio Code - main.py",
            "Google Chrome - Stack Overflow",
            "Microsoft Teams - Meeting",
            "Terminal - git commit -m",
            "Slack - #development channel",
            "YouTube - Python Tutorial",
            "Facebook - Social Feed",
            "Figma - UI Design",
            "Excel - Budget Analysis",
            "Netflix - Continue Watching"
        ]
        
        # Return a random simulation (in reality, this would be actual OCR)
        import random
        return random.choice(simulated_texts)
    
    @classmethod
    async def _analyze_productivity_content(cls, text: str) -> float:
        """Analyze text content for productivity indicators"""
        try:
            text_lower = text.lower()
            productivity_score = 50.0  # Base score
            
            # Check for productive indicators
            for category, indicators in cls.PRODUCTIVE_INDICATORS.items():
                for indicator in indicators:
                    if indicator in text_lower:
                        if category == 'code_editors':
                            productivity_score += 25
                        elif category == 'development_tools':
                            productivity_score += 20
                        elif category == 'office_apps':
                            productivity_score += 15
                        elif category == 'design_tools':
                            productivity_score += 15
                        elif category == 'communication':
                            productivity_score += 10
                        break
            
            # Check for distracting indicators
            for category, indicators in cls.DISTRACTING_INDICATORS.items():
                for indicator in indicators:
                    if indicator in text_lower:
                        if category == 'social_media':
                            productivity_score -= 30
                        elif category == 'entertainment':
                            productivity_score -= 25
                        elif category == 'games':
                            productivity_score -= 35
                        elif category == 'shopping':
                            productivity_score -= 20
                        break
            
            return max(0.0, min(100.0, productivity_score))
            
        except Exception as e:
            print(f"Error analyzing productivity content: {e}")
            return 50.0
    
    @classmethod
    async def _analyze_focus_level(cls, text: str) -> float:
        """Analyze focus level based on content"""
        try:
            text_lower = text.lower()
            
            # High focus indicators
            focus_indicators = [
                'coding', 'programming', 'documentation', 'analysis',
                'writing', 'design', 'development', 'testing'
            ]
            
            # Low focus indicators
            distraction_indicators = [
                'social', 'chat', 'news', 'shopping', 'video',
                'gaming', 'entertainment', 'browsing'
            ]
            
            focus_score = 50.0
            
            for indicator in focus_indicators:
                if indicator in text_lower:
                    focus_score += 15
            
            for indicator in distraction_indicators:
                if indicator in text_lower:
                    focus_score -= 20
            
            return max(0.0, min(100.0, focus_score))
            
        except Exception as e:
            print(f"Error analyzing focus level: {e}")
            return 50.0
    
    @classmethod
    async def _detect_applications(cls, text: str) -> List[str]:
        """Detect applications from screenshot text"""
        detected = []
        text_lower = text.lower()
        
        all_apps = []
        for category, apps in cls.PRODUCTIVE_INDICATORS.items():
            all_apps.extend(apps)
        for category, apps in cls.DISTRACTING_INDICATORS.items():
            all_apps.extend(apps)
        
        for app in all_apps:
            if app in text_lower:
                detected.append(app.title())
        
        return detected[:5]  # Return top 5 detected apps
    
    @classmethod
    async def _detect_websites(cls, text: str) -> List[str]:
        """Detect websites from screenshot text"""
        detected = []
        text_lower = text.lower()
        
        common_websites = [
            'google.com', 'stackoverflow.com', 'github.com', 'youtube.com',
            'facebook.com', 'twitter.com', 'linkedin.com', 'amazon.com',
            'netflix.com', 'discord.com', 'slack.com', 'teams.microsoft.com'
        ]
        
        for website in common_websites:
            if website.replace('.com', '') in text_lower:
                detected.append(website)
        
        return detected[:3]  # Return top 3 detected websites
    
    @classmethod
    async def _detect_sensitive_content(cls, text: str) -> bool:
        """Detect potentially sensitive content in screenshot"""
        import re
        
        for pattern in cls.SENSITIVE_PATTERNS:
            if re.search(pattern, text):
                return True
        
        # Check for common sensitive keywords
        sensitive_keywords = [
            'password', 'confidential', 'private', 'secret',
            'ssn', 'social security', 'credit card', 'bank account'
        ]
        
        text_lower = text.lower()
        for keyword in sensitive_keywords:
            if keyword in text_lower:
                return True
        
        return False
    
    @classmethod
    async def _calculate_screen_utilization(cls, screenshot_data: bytes) -> float:
        """Calculate how much of the screen is being utilized"""
        try:
            # In production, this would analyze the actual image
            # For simulation, we'll return a value based on typical usage patterns
            import random
            return random.uniform(60.0, 95.0)
            
        except Exception as e:
            print(f"Error calculating screen utilization: {e}")
            return 75.0
    
    @classmethod
    async def redact_sensitive_areas(
        cls,
        screenshot_data: bytes,
        sensitive_areas: List[Dict[str, float]]
    ) -> bytes:
        """Redact sensitive areas with black boxes"""
        try:
            image = Image.open(io.BytesIO(screenshot_data))
            draw = ImageDraw.Draw(image)
            
            for area in sensitive_areas:
                x1 = int(area['x'] * image.width)
                y1 = int(area['y'] * image.height)
                x2 = int((area['x'] + area['width']) * image.width)
                y2 = int((area['y'] + area['height']) * image.height)
                
                # Draw black rectangle
                draw.rectangle([x1, y1, x2, y2], fill='black')
            
            # Convert back to bytes
            output = io.BytesIO()
            image.save(output, format='PNG')
            return output.getvalue()
            
        except Exception as e:
            print(f"Error redacting sensitive areas: {e}")
            return screenshot_data
    
    @classmethod
    async def compress_screenshot(
        cls,
        screenshot_data: bytes,
        quality: str = "medium"
    ) -> bytes:
        """Compress screenshot based on quality setting"""
        try:
            image = Image.open(io.BytesIO(screenshot_data))
            
            # Quality settings
            quality_settings = {
                "low": {"quality": 60, "optimize": True},
                "medium": {"quality": 80, "optimize": True},
                "high": {"quality": 95, "optimize": False}
            }
            
            settings = quality_settings.get(quality, quality_settings["medium"])
            
            # Compress and save
            output = io.BytesIO()
            if image.mode in ('RGBA', 'LA'):
                # Convert to RGB for JPEG compression
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            image.save(output, format='JPEG', **settings)
            return output.getvalue()
            
        except Exception as e:
            print(f"Error compressing screenshot: {e}")
            return screenshot_data
    
    @classmethod
    async def generate_privacy_report(
        cls,
        user_id: str,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate privacy report for screenshot data"""
        try:
            # Get all screenshots for user in period
            screenshots = await DatabaseOperations.get_documents(
                "screenshots",
                {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "timestamp": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }
            )
            
            # Get screenshot analyses
            analyses = await DatabaseOperations.get_documents(
                "screenshot_analysis",
                {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "analysis_timestamp": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }
            )
            
            # Calculate privacy metrics
            total_screenshots = len(screenshots)
            blurred_screenshots = len([s for s in screenshots if s.get("blur_level", 0) > 0])
            sensitive_content_detected = len([a for a in analyses if a.get("contains_sensitive_data", False)])
            
            privacy_report = {
                "user_id": user_id,
                "organization_id": organization_id,
                "report_period": f"{start_date.date()} to {end_date.date()}",
                "total_screenshots": total_screenshots,
                "blurred_screenshots": blurred_screenshots,
                "blur_percentage": (blurred_screenshots / total_screenshots * 100) if total_screenshots > 0 else 0,
                "sensitive_content_detected": sensitive_content_detected,
                "privacy_compliance_score": cls._calculate_privacy_compliance_score(
                    total_screenshots, blurred_screenshots, sensitive_content_detected
                ),
                "recommendations": cls._generate_privacy_recommendations(
                    blurred_screenshots, sensitive_content_detected, total_screenshots
                )
            }
            
            return privacy_report
            
        except Exception as e:
            print(f"Error generating privacy report: {e}")
            return {}
    
    @classmethod
    def _calculate_privacy_compliance_score(
        cls,
        total_screenshots: int,
        blurred_screenshots: int,
        sensitive_content_detected: int
    ) -> float:
        """Calculate privacy compliance score"""
        if total_screenshots == 0:
            return 100.0
        
        # Base score
        score = 100.0
        
        # Deduct for unblurred screenshots when sensitive content is detected
        if sensitive_content_detected > 0:
            unprotected_sensitive = sensitive_content_detected - blurred_screenshots
            if unprotected_sensitive > 0:
                score -= (unprotected_sensitive / total_screenshots) * 50
        
        # Bonus for proactive blurring
        blur_rate = blurred_screenshots / total_screenshots
        if blur_rate > 0.5:
            score += 10
        
        return max(0.0, min(100.0, score))
    
    @classmethod
    def _generate_privacy_recommendations(
        cls,
        blurred_screenshots: int,
        sensitive_content_detected: int,
        total_screenshots: int
    ) -> List[str]:
        """Generate privacy recommendations"""
        recommendations = []
        
        if sensitive_content_detected > 0 and blurred_screenshots == 0:
            recommendations.append("Enable automatic blurring to protect sensitive content")
        
        if total_screenshots > 0:
            blur_rate = blurred_screenshots / total_screenshots
            if blur_rate < 0.3:
                recommendations.append("Consider increasing privacy settings for better data protection")
        
        if sensitive_content_detected > 5:
            recommendations.append("Review workspace setup to minimize sensitive content visibility")
        
        return recommendations or ["Privacy settings are well configured"]