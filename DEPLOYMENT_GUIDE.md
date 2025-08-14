# Deployment Guide

## ✅ Pre-Deployment Checklist
- [x] MongoDB Atlas connection tested and working
- [x] Backend server runs successfully on port 8001
- [x] Frontend builds successfully 
- [x] Environment variables configured
- [ ] Docker containers tested (Docker not available locally)

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)
**Requirements**: Server with Docker and Docker Compose

1. **Upload project to server**:
   ```bash
   scp -r hubstaff-frontend-backend/ user@your-server:/path/to/app/
   ```

2. **Update environment variables**:
   ```bash
   # Update docker-compose.yml environment section:
   environment:
     - REACT_APP_BACKEND_URL=https://your-domain.com
     - REACT_APP_ENVIRONMENT=production
   ```

3. **Deploy**:
   ```bash
   docker compose up -d
   ```

### Option 2: Cloud Platform Deployment

#### A. Render.com (Recommended)
1. **Connect GitHub repo to Render**
2. **Create Web Service for Backend**:
   - Environment: `Python 3`
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Set environment variables in Render dashboard
3. **Create Static Site for Frontend**:
   - Build Command: `cd frontend && yarn install && yarn build`
   - Publish Directory: `frontend/build`
   - Add environment variable: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

#### B. Railway.app
1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

#### C. DigitalOcean App Platform
1. Create new app from GitHub repo
2. Configure environment variables
3. Set build and run commands

#### D. AWS/Google Cloud
1. Use container services (ECS, Cloud Run)
2. Upload Docker images to registry
3. Configure load balancers and domains

### Option 3: VPS Manual Deployment

1. **Install dependencies**:
   ```bash
   # Install Node.js, Python, and nginx
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs python3 python3-pip nginx
   ```

2. **Deploy backend**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn server:app --host 0.0.0.0 --port 8001 &
   ```

3. **Deploy frontend**:
   ```bash
   cd frontend
   REACT_APP_BACKEND_URL=https://your-domain.com yarn build
   sudo cp -r build/* /var/www/html/
   ```

4. **Configure nginx**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /var/www/html;
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:8001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🔧 Environment Variables to Set

### Backend (.env)
```env
SECRET_KEY=your-production-secret-key-here
MONGO_URL=mongodb+srv://your-credentials@cluster.mongodb.net/
DB_NAME=hubstaff_clone
FRONTEND_URL=https://your-frontend-domain.com
ENVIRONMENT=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
DEFAULT_ADMIN_EMAIL=admin@your-domain.com
DEFAULT_ADMIN_PASSWORD=secure-admin-password
```

### Frontend
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
REACT_APP_ENVIRONMENT=production
```

## 🌐 Domain and SSL Setup

### For Production:
1. **Point domain to server IP**
2. **Install SSL certificate**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### For Development/Testing:
- Use services like ngrok to expose local ports
- Or use free subdomains from cloud providers

## 📊 Monitoring and Maintenance

### Health Checks
- Backend health: `https://your-domain.com/api/health`
- MongoDB connection test: Run the test script we created

### Log Monitoring
```bash
# Backend logs
tail -f backend/server.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔒 Security Considerations

1. **Change all default passwords**
2. **Use strong SECRET_KEY**
3. **Enable HTTPS only**
4. **Set up firewall rules**
5. **Regular security updates**
6. **Monitor logs for suspicious activity**

## 💡 Next Steps

1. Choose your deployment method
2. Set up domain and hosting
3. Configure environment variables
4. Deploy and test
5. Set up monitoring and backups

Your application is ready for deployment! 🎉