# Deploy to Railway.app - Complete Step-by-Step Guide

## Prerequisites
- Code pushed to GitHub (https://github.com/karthik111-hub/order-kitchen-hub)
- Railway account (free at https://railway.app)

---

## STEP 1: Create Railway Account & Project

1. Go to https://railway.app
2. Click "Start Building" or "Create new project"
3. Sign in with GitHub (recommended)
4. Railway will ask to authorize GitHub access - click "Authorize"

---

## STEP 2: Create New Project

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository: `karthik111-hub/order-kitchen-hub`
4. Railway auto-detects services

---

## STEP 3: Add MongoDB Service

### Option A: Use Railway's MongoDB (Easiest)
1. Click "Add service" → "Database" → "MongoDB"
2. Railway creates MongoDB automatically
3. Copy the connection string from "Variables"

### Option B: Use Your MongoDB Atlas (Recommended - Already Configured)
- Skip this step, you already have MongoDB Atlas set up

---

## STEP 4: Deploy Backend Service

### Create Backend Service:
1. Click "Add" → "GitHub Repo"
2. Select the same repository
3. Railway will ask for a service name - type: `backend`
4. Click "Deploy"

### Set Backend Environment Variables:

Once backend service is created:

1. Click on "backend" service in Railway dashboard
2. Go to "Variables" tab
3. Add these variables:

```
MONGO_URL=mongodb+srv://karthikdonthula111_db_user:YOUR_PASSWORD@cluster0.ydr9kad.mongodb.net/?appName=Cluster0
DB_NAME=test_database
ADMIN_PASSWORD=MissionImpossible10*
MASTER_PASSWORD=Sandy0088
CHEF_PASSWORD=Sari0808
PUBLIC_BACKEND_URL=https://backend-production-xxxxxx.railway.app
PORT=8000
```

**Important:** Replace `YOUR_PASSWORD` with your actual MongoDB Atlas password

### Configure Root Path for Backend:
1. In backend service settings, go to "Settings"
2. Find "Root Directory" and set it to: `/backend`
3. Save changes

**Get Your Backend URL:**
- Go to backend service
- Click "Deployments"
- Copy the public URL (something like `https://backend-production-xxxxxx.railway.app`)
- Update `PUBLIC_BACKEND_URL` variable with this URL

---

## STEP 5: Deploy Frontend Service

### Create Frontend Service:
1. Click "Add" → "GitHub Repo"
2. Select the same repository again
3. Service name: `frontend`
4. Click "Deploy"

### Set Frontend Environment Variables:

1. Click on "frontend" service
2. Go to "Variables" tab
3. Add these variables:

```
EXPO_PUBLIC_BACKEND_URL=https://backend-production-xxxxxx.railway.app
EXPO_TUNNEL_SUBDOMAIN=order-kitchen-hub
PORT=8082
```

**Replace the backend URL with your actual Railway backend URL from Step 4**

### Configure Root Path for Frontend:
1. In frontend service settings, go to "Settings"
2. Find "Root Directory" and set it to: `/frontend`
3. Save changes

**Get Your Frontend URL:**
- Go to frontend service
- Click "Deployments"
- Copy the public URL (something like `https://frontend-production-yyyyyy.railway.app`)

---

## STEP 6: Verify Services Are Running

### Check Backend:
```
https://backend-production-xxxxxx.railway.app/docs
```
Should show Swagger API documentation

### Check Frontend:
```
https://frontend-production-yyyyyy.railway.app
```
Should show the login page

---

## STEP 7: Test Your App

1. Open frontend URL in browser
2. Login with credentials:
   - **Role:** admin
   - **Password:** MissionImpossible10*
3. Test features:
   - Create a category
   - Delete a category
   - Navigate around

---

## STEP 8: Monitor Logs

### View Backend Logs:
1. Click "backend" service
2. Go to "Logs" tab
3. See real-time output

### View Frontend Logs:
1. Click "frontend" service
2. Go to "Logs" tab
3. See real-time output

---

## Environment Variables Reference

| Service | Variable | Value |
|---------|----------|-------|
| Backend | MONGO_URL | MongoDB Atlas connection string |
| Backend | DB_NAME | `test_database` |
| Backend | ADMIN_PASSWORD | `MissionImpossible10*` |
| Backend | MASTER_PASSWORD | `Sandy0088` |
| Backend | CHEF_PASSWORD | `Sari0808` |
| Backend | PUBLIC_BACKEND_URL | Your Railway backend URL |
| Backend | PORT | `8000` |
| Frontend | EXPO_PUBLIC_BACKEND_URL | Your Railway backend URL |
| Frontend | EXPO_TUNNEL_SUBDOMAIN | `order-kitchen-hub` |
| Frontend | PORT | `8082` |

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Backend Container | $5/month |
| Frontend Container | $5/month |
| MongoDB (if using Railway) | Free (included in $5 credit) |
| **Total** | **~$10/month** |

MongoDB Atlas: $57/month (separate, regardless of hosting)

---

## Troubleshooting

### Frontend shows blank page:
1. Check frontend logs for errors
2. Verify `EXPO_PUBLIC_BACKEND_URL` is correct
3. Open browser DevTools (F12) → Console tab
4. Look for error messages

### Login not working:
1. Check backend logs
2. Verify MongoDB connection string
3. Ensure `MONGO_URL` variable is set correctly

### Backend service won't deploy:
1. Check logs for error messages
2. Verify "Root Directory" is set to `/backend`
3. Ensure requirements.txt exists in backend folder

### Services taking too long:
1. Railway free tier may be slow
2. First deployment takes 5-10 minutes
3. Check "Deployments" tab for status

---

## Auto-Deploy on Push (Optional)

Once deployed, Railway automatically redeploys when you:
1. Push code to GitHub
2. Changes detected in repository
3. New deployment starts automatically

No manual action needed!

---

## Access from Other Devices

Your app is now accessible globally:

**Frontend URL:**
```
https://frontend-production-yyyyyy.railway.app
```

**Share this link** with anyone to access your app from any device, anywhere!

---

## Next Steps

1. ✅ Test your app thoroughly
2. ✅ Monitor logs for errors
3. ✅ Share frontend URL with others
4. ✅ Monitor costs (should be ~$10/month)
5. ✅ Scale up if needed
