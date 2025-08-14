# Post-Deployment Steps

## After Vercel Deployment

### 1. Update Backend CORS Settings

Once you get your Vercel URL (e.g., `https://hubstaff-frontend-xyz.vercel.app`), you need to:

1. **Go to your Render backend dashboard**
2. **Update the `FRONTEND_URL` environment variable** to your new Vercel URL
3. **Redeploy the backend service**

### 2. Test Your Full Application

Visit your Vercel URL and test:
- [ ] Frontend loads correctly
- [ ] Can register a new account
- [ ] Can login with credentials
- [ ] Dashboard loads with data
- [ ] API calls work properly

### 3. Troubleshooting

If you see CORS errors:
1. Check that backend `FRONTEND_URL` matches your Vercel domain exactly
2. Ensure backend is redeployed after environment variable change
3. Check browser console for specific error messages

### 4. Optional: Custom Domain

If you want a custom domain:
1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update backend `FRONTEND_URL` to your custom domain

## Your Final Architecture

- **Frontend**: `https://your-app.vercel.app` (Vercel)
- **Backend**: `https://hubstaff-mongo.onrender.com` (Render)
- **Database**: MongoDB Atlas (Cloud)

All services are now production-ready! 🎉