# Deployment Guide

This guide walks you through deploying the Kindred Ikon Ski Home Finder to production using **Render** (backend) and **Vercel** (frontend).

## 📋 Prerequisites

Before deploying, make sure you have:

- ✅ A GitHub account
- ✅ Your code pushed to a GitHub repository
- ✅ An [OpenRouteService API key](https://openrouteservice.org/) (free)
- ✅ A Kindred account email
- ✅ Accounts on [Render](https://render.com) and [Vercel](https://vercel.com) (both free)

---

## 🚀 Part 1: Deploy Backend to Render

### Step 1: Create a Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for easy deployment)
3. Authorize Render to access your GitHub repositories

### Step 2: Deploy the Backend

1. **Click "New +" → "Web Service"**

2. **Connect your repository:**
   - Select your `kindred-ikon-app` repository
   - Click "Connect"

3. **Configure the service:**
   - **Name:** `kindred-ikon-backend` (or any name you prefer)
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn backend_api:app`

4. **Select a plan:**
   - Choose **"Free"** (starts with $0/month)
   - Note: Free tier sleeps after 15 minutes of inactivity

5. **Add Environment Variables:**
   
   Click "Advanced" → "Add Environment Variable" and add these:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `ENVIRONMENT` | `production` | Required |
   | `ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` | ⚠️ Update after deploying frontend |
   | `OPEN_ROUTE_SERVICE_KEY` | `your_key_here` | Get from openrouteservice.org |
   | `EMAIL` | `your@email.com` | Your Kindred account email |
   | `KINDRED_BEARER_TOKEN` | (leave empty) | Optional - generated via OTP |

   > **Important:** You'll need to update `ALLOWED_ORIGINS` after deploying the frontend

6. **Deploy:**
   - Click "Create Web Service"
   - Wait 3-5 minutes for the build to complete
   - Your backend URL will be something like: `https://kindred-ikon-backend.onrender.com`

7. **Test the backend:**
   ```bash
   curl https://your-backend-url.onrender.com/api/health
   ```
   
   You should see: `{"status": "ok"}`

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### Step 2: Deploy the Frontend

1. **Click "Add New..." → "Project"**

2. **Import your repository:**
   - Find and select your `kindred-ikon-app` repository
   - Click "Import"

3. **Configure the project:**
   - **Project Name:** `kindred-ikon-frontend` (or any name)
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** Click "Edit" → Select `frontend`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)

4. **Add Environment Variables:**
   
   In "Environment Variables" section, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://your-backend-url.onrender.com` |

   > **Replace** `your-backend-url` with your actual Render backend URL from Part 1

5. **Deploy:**
   - Click "Deploy"
   - Wait 1-2 minutes for build to complete
   - Your frontend URL will be something like: `https://kindred-ikon-frontend.vercel.app`

---

## 🔄 Part 3: Update Backend CORS

Now that you have your frontend URL, update the backend to allow requests from it:

### Step 1: Update Render Environment Variables

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://kindred-ikon-frontend.vercel.app
   ```
   
   Or if you have a custom domain:
   ```
   https://kindred-ikon-frontend.vercel.app,https://www.your-domain.com
   ```

5. Click "Save Changes"
6. Your backend will automatically redeploy (takes ~2-3 minutes)

---

## ✅ Part 4: Test Your Deployment

### Test the Connection

1. **Open your frontend URL** in a browser
2. **Click "Start Your Search"**
3. **Try the authentication flow:**
   - Click "Search Available Homes" (without dates)
   - Enter your email
   - Check your email for OTP
   - Enter the OTP
   - You should see "Successfully authenticated!"

4. **Try a search:**
   - Select dates (e.g., next month)
   - Choose a region
   - Click "Search Available Homes"
   - You should see results!

### Common Issues & Solutions

#### 🔴 "Failed to fetch" or CORS errors

**Problem:** Frontend can't reach backend

**Solutions:**
- Check that `ALLOWED_ORIGINS` in Render includes your Vercel URL (with `https://`)
- Make sure `VITE_API_URL` in Vercel points to your Render backend URL
- Wait for backend to finish redeploying after changing environment variables

#### 🔴 "Failed to send OTP"

**Problem:** Backend can't authenticate with Kindred

**Solutions:**
- Verify your `EMAIL` environment variable is correct
- Check Render logs: Dashboard → Service → Logs
- Make sure your email is registered with Kindred

#### 🔴 Backend is slow on first request

**Problem:** Render free tier sleeps after 15 minutes

**Solution:**
- This is normal! First request wakes up the service (~30 seconds)
- Subsequent requests will be fast
- Consider upgrading to paid tier ($7/month) for always-on service

#### 🔴 "Driving time shows N/A"

**Problem:** OpenRouteService API key not set or invalid

**Solutions:**
- Check that `OPEN_ROUTE_SERVICE_KEY` is set in Render
- Get a new key from https://openrouteservice.org/
- Free tier: 2000 requests/day (should be plenty for personal use)

---

## 🔒 Security Checklist

Before going live, verify:

- ✅ `.env` files are in `.gitignore` (never commit API keys!)
- ✅ `ALLOWED_ORIGINS` only includes your actual frontend domains
- ✅ `ENVIRONMENT=production` is set in Render
- ✅ Backend has `debug=False` in production (automatic with our setup)
- ✅ All API keys are stored as environment variables (not in code)

---

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Render** | ✅ Free | 750 hours/month, sleeps after 15min inactivity |
| **Vercel** | ✅ Free | 100GB bandwidth, unlimited sites for personal use |
| **OpenRouteService** | ✅ Free | 2000 requests/day |
| **Total** | **$0/month** | Perfect for personal use or demos |

### When to Upgrade

Consider upgrading if:
- **Render:** You want 24/7 uptime without cold starts → $7/month
- **Vercel:** You exceed 100GB bandwidth → $20/month
- **OpenRouteService:** You exceed 2000 API calls/day → Contact for pricing

---

## 🔄 Continuous Deployment

Both Render and Vercel automatically redeploy when you push to GitHub!

**To deploy updates:**
```bash
git add .
git commit -m "Your update message"
git push origin main
```

- **Vercel:** Deploys automatically (1-2 minutes)
- **Render:** Deploys automatically (3-5 minutes)

You can watch the deployment progress in each platform's dashboard.

---

## 🌐 Custom Domain (Optional)

### For Vercel (Frontend)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `ski-homes.com`)
3. Follow DNS configuration instructions
4. Update `ALLOWED_ORIGINS` in Render to include your domain

### For Render (Backend)

1. Upgrade to paid plan ($7/month minimum)
2. Go to Settings → Custom Domain
3. Add your API subdomain (e.g., `api.ski-homes.com`)
4. Configure DNS as instructed
5. Update `VITE_API_URL` in Vercel

---

## 📊 Monitoring

### View Backend Logs

1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Monitor requests, errors, and performance

### View Frontend Analytics

Vercel provides basic analytics:
1. Go to project dashboard
2. Click "Analytics" tab
3. See visitor stats, performance metrics

---

## 🆘 Getting Help

**Render Support:**
- [Render Documentation](https://render.com/docs)
- [Community Forum](https://community.render.com/)

**Vercel Support:**
- [Vercel Documentation](https://vercel.com/docs)
- [Community Discord](https://vercel.com/discord)

**Application Issues:**
- Check backend logs in Render
- Check browser console for frontend errors
- Verify all environment variables are set correctly

---

## 🎉 You're Live!

Congratulations! Your Kindred Ikon Ski Home Finder is now deployed and accessible to anyone with the URL.

**Share your app:**
- Frontend: `https://your-app.vercel.app`
- Tell your friends who love skiing! ⛷️

**Next steps:**
- Set up a custom domain
- Monitor usage in dashboards
- Add more features!
- Consider upgrading if you get lots of traffic

---

## 📝 Quick Reference

### Environment Variables Cheatsheet

**Backend (Render):**
```env
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app
OPEN_ROUTE_SERVICE_KEY=your_key
EMAIL=your@email.com
KINDRED_BEARER_TOKEN=  # Optional
```

**Frontend (Vercel):**
```env
VITE_API_URL=https://your-backend.onrender.com
```

### Important URLs

- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **OpenRouteService:** https://openrouteservice.org/dev/#/home
- **Your Backend:** https://your-backend.onrender.com/api/health
- **Your Frontend:** https://your-frontend.vercel.app

