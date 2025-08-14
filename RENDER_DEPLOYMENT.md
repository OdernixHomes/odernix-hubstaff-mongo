# Render.com Deployment Guide

## 🚀 Deploy to Render.com (Recommended)

Render.com is perfect for this project because:
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy GitHub integration
- ✅ Supports both static sites and web services

## Step-by-Step Deployment

### 1. Prepare Your Repository

1. **Push code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### 2. Deploy Backend (Web Service)

1. **Go to [render.com](https://render.com) and sign up/login**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service**:
   
   **Basic Settings:**
   - **Name**: `hubstaff-backend`
   - **Environment**: `Python 3`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   
   **Build & Deploy:**
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   
5. **Set Environment Variables**:
   ```
   SECRET_KEY=your-production-secret-key-here
   MONGO_URL=mongodb+srv://balosneh77:8M3wndakfnz4enXr@cluster0.4sirhlz.mongodb.net/
   DB_NAME=hubstaff_clone
   FRONTEND_URL=https://your-frontend-name.onrender.com
   ENVIRONMENT=production
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=secure-admin-password
   ```

6. **Click "Create Web Service"**
7. **Wait for deployment** (5-10 minutes)
8. **Copy the backend URL** (e.g., `https://hubstaff-backend.onrender.com`)

### 3. Deploy Frontend (Static Site)

1. **Click "New +" → "Static Site"**
2. **Connect same GitHub repository**
3. **Configure the site**:
   
   **Basic Settings:**
   - **Name**: `hubstaff-frontend`
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   
   **Build Settings:**
   - **Build Command**: `cd frontend && yarn install && yarn build`
   - **Publish Directory**: `frontend/build`
   
4. **Set Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://hubstaff-backend.onrender.com
   REACT_APP_ENVIRONMENT=production
   ```

5. **Click "Create Static Site"**
6. **Wait for deployment** (3-5 minutes)

### 4. Update Backend with Frontend URL

1. **Go back to your backend service settings**
2. **Update the `FRONTEND_URL` environment variable**:
   ```
   FRONTEND_URL=https://hubstaff-frontend.onrender.com
   ```
3. **Save and redeploy**

### 5. Test Your Deployment

1. **Visit your frontend URL**
2. **Check backend health**: `https://hubstaff-backend.onrender.com/health`
3. **Try logging in/registering**

## 🔧 Important Notes

### Free Tier Limitations
- **Backend**: Spins down after 15 minutes of inactivity (cold starts)
- **Storage**: No persistent disk storage
- **Bandwidth**: 100 GB/month

### Performance Tips
1. **Keep backend warm**: Set up a cron job to ping your backend every 14 minutes
2. **Optimize build times**: Cache dependencies where possible

### Troubleshooting

#### Common Issues:

1. **Build fails**:
   ```bash
   # Check build logs in Render dashboard
   # Ensure all dependencies are in requirements.txt
   ```

2. **Backend won't start**:
   ```bash
   # Check environment variables
   # Verify MongoDB connection string
   # Check start command syntax
   ```

3. **Frontend can't connect to backend**:
   ```bash
   # Verify REACT_APP_BACKEND_URL is set correctly
   # Check CORS settings in backend
   # Ensure backend is running
   ```

4. **CORS errors**:
   ```python
   # In your backend server.py, ensure CORS allows your frontend domain
   origins = [
       "https://hubstaff-frontend.onrender.com",
       "http://localhost:3000"  # for development
   ]
   ```

## 🎯 Post-Deployment Checklist

- [ ] Backend health check responds
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] Login/logout functionality
- [ ] MongoDB connection stable
- [ ] All API endpoints responding
- [ ] Email notifications working (if configured)

## 💡 Pro Tips

1. **Custom Domain**: Upgrade to paid plan for custom domains
2. **Auto-Deploy**: Enable auto-deploy on git push
3. **Monitoring**: Set up health check alerts
4. **Backups**: Regular MongoDB backups
5. **Logs**: Monitor application logs in Render dashboard

## 🔗 Your Deployed URLs

After deployment, you'll have:
- **Frontend**: `https://hubstaff-frontend.onrender.com`
- **Backend**: `https://hubstaff-backend.onrender.com`
- **API Docs**: `https://hubstaff-backend.onrender.com/docs`

**Total deployment time**: ~15-20 minutes

You're all set! 🎉