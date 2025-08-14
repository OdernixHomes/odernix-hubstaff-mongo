# Deploy Frontend to Vercel

## 🚀 Vercel Deployment Guide

Vercel is perfect for your React frontend because:
- ✅ **Free tier with generous limits**
- ✅ **Optimized for React/Next.js**
- ✅ **Global CDN for fast loading**
- ✅ **Automatic HTTPS**
- ✅ **GitHub integration**
- ✅ **Environment variables support**

## Step-by-Step Deployment

### 1. Prepare Frontend for Vercel

Create a `vercel.json` configuration file in your frontend directory:

```json
{
  "buildCommand": "yarn build",
  "outputDirectory": "build",
  "devCommand": "yarn start",
  "installCommand": "yarn install",
  "framework": "create-react-app",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

5. **Follow the prompts**:
   ```
   ? Set up and deploy "frontend"? [Y/n] Y
   ? Which scope do you want to deploy to? [Your Account]
   ? Link to existing project? [y/N] N
   ? What's your project's name? hubstaff-frontend
   ? In which directory is your code located? ./
   ```

#### Option B: Vercel Dashboard
1. **Go to [vercel.com](https://vercel.com) and sign up/login**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure project settings**:
   - **Project Name**: `hubstaff-frontend`
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build`
   - **Output Directory**: `build`
   - **Install Command**: `yarn install`

### 3. Set Environment Variables

In Vercel dashboard or CLI, set these environment variables:

```bash
# Production Backend URL
REACT_APP_BACKEND_URL=https://hubstaff-mongo.onrender.com

# Environment
REACT_APP_ENVIRONMENT=production
```

**Via CLI**:
```bash
vercel env add REACT_APP_BACKEND_URL production
# Enter: https://hubstaff-mongo.onrender.com

vercel env add REACT_APP_ENVIRONMENT production
# Enter: production
```

**Via Dashboard**:
1. Go to Project Settings → Environment Variables
2. Add each variable for "Production" environment

### 4. Update Backend CORS Settings

Your backend needs to allow requests from Vercel domain. Update your backend environment variables on Render:

```bash
FRONTEND_URL=https://hubstaff-frontend.vercel.app
```

Or if you have a custom domain:
```bash
FRONTEND_URL=https://your-custom-domain.com
```

### 5. Test Your Deployment

1. **Visit your Vercel URL** (e.g., `https://hubstaff-frontend.vercel.app`)
2. **Check browser console** for any errors
3. **Test API connectivity** by trying to login/register
4. **Verify backend communication**

## 🔧 Advanced Configuration

### Custom Domain
1. **Go to Project Settings → Domains**
2. **Add your custom domain**
3. **Update DNS records** as instructed
4. **Update backend FRONTEND_URL** environment variable

### Build Optimization
Add to your `package.json`:
```json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false craco build"
  }
}
```

### Environment-Specific Builds
Create multiple environment variables:
```bash
REACT_APP_BACKEND_URL_STAGING=https://hubstaff-mongo-staging.onrender.com
REACT_APP_BACKEND_URL_PRODUCTION=https://hubstaff-mongo.onrender.com
```

## 🐛 Troubleshooting

### Common Issues:

1. **Build fails**:
   ```bash
   # Check build logs in Vercel dashboard
   # Ensure all dependencies are in package.json
   # Verify build command is correct
   ```

2. **API calls fail (CORS)**:
   ```bash
   # Update backend FRONTEND_URL environment variable
   # Check backend CORS configuration
   # Verify REACT_APP_BACKEND_URL is correct
   ```

3. **Routes don't work (404 on refresh)**:
   ```json
   // Add to vercel.json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

4. **Environment variables not working**:
   ```bash
   # Ensure variables start with REACT_APP_
   # Redeploy after adding environment variables
   # Check Vercel dashboard for correct values
   ```

## 📊 Performance Tips

1. **Enable Analytics**: Add Vercel Analytics to your project
2. **Optimize Images**: Use Vercel's image optimization
3. **Bundle Analysis**: Use `yarn build` and analyze bundle size
4. **Caching**: Vercel automatically handles optimal caching

## 🎯 Final Checklist

- [ ] Frontend builds successfully locally
- [ ] vercel.json configuration created
- [ ] Environment variables set in Vercel
- [ ] Backend FRONTEND_URL updated with Vercel domain
- [ ] CORS configured properly in backend
- [ ] Custom domain configured (optional)
- [ ] All routes work correctly
- [ ] API calls work from deployed frontend
- [ ] Authentication flow works end-to-end

## 🔗 Your Final URLs

After deployment:
- **Frontend**: `https://hubstaff-frontend.vercel.app`
- **Backend**: `https://hubstaff-mongo.onrender.com`
- **Full Stack App**: Frontend → Backend → MongoDB Atlas

**Deployment time**: ~5-10 minutes

You now have a fully deployed, production-ready Hubstaff clone! 🎉