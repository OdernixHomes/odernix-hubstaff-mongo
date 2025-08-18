import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api


print("Cloudinary Debug Info:")
print("CLOUD_NAME:", os.getenv("CLOUDINARY_CLOUD_NAME"))
print("API_KEY:", os.getenv("CLOUDINARY_API_KEY"))
print("API_SECRET:", os.getenv("CLOUDINARY_API_SECRET"))


print("🔍 Cloudinary Connection Test")
print("=" * 50)

# Load .env file
load_dotenv()

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

if not all([cloud_name, api_key, api_secret]):
    print("❌ Missing Cloudinary environment variables!")
    exit(1)

# Configure Cloudinary
cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
    secure=True
)

try:
    # Upload a sample image (use a small local file or remote URL)
    result = cloudinary.uploader.upload(
        "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        folder="test_uploads"
    )
    print("✅ Upload successful!")
    print("📸 Image URL:", result["secure_url"])

    # Fetch account usage details
    usage = cloudinary.api.usage()
    print("📊 Account info retrieved!")
    print("Transformations:", usage["transformations"]["used"], "/", usage["transformations"]["limit"])

except Exception as e:
    print("❌ Error:", e)
