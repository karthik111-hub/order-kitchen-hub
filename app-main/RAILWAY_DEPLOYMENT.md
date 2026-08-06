# Deploy to Railway.app - Complete Guide

## Why Railway for Your App?

✅ **Cheapest option**: $5/month for light projects  
✅ **Easiest setup**: Connect GitHub, auto-deploy  
✅ **Includes free MongoDB**: $5 credit covers it  
✅ **Perfect for**: Small to medium projects  
✅ **Global CDN**: Fast access from anywhere  

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up (free)
3. Create new project

---

## Step 2: Connect GitHub Repository

1. Click "Deploy from GitHub"
2. Authorize Railway to access your GitHub
3. Select your repository
4. Railway auto-detects services

---

## Step 3: Configure Backend Service

### Create Backend:
1. In Railway dashboard, click "New Service"
2. Select "Database" → "MongoDB"
3. Copy the `MONGO_URL` (or use your cloud MongoDB Atlas URL)

### Set Environment Variables:
```
MONGO_URL=mongodb+srv://karthikdonthula111_db_user:[REDACTED]@cluster0.ydr9kad.mongodb.net/?appName=Cluster0
DB_NAME=test_database
ADMIN_PASSWORD=MissionImpossible10*
MASTER_PASSWORD=Sandy0088
CHEF_PASSWORD=Sari0808
PUBLIC_BACKEND_URL=https://{your-backend-railway-url}
```

### Deploy Backend:
1. Add new service from GitHub
2. Point to `/backend` directory
3. Railway auto-detects Dockerfile
4. Click "Deploy"

**Get your backend URL:**
```
https://backend-production-xxxx.railway.app
```

---

## Step 4: Configure Frontend Service

### Set Environment Variables:
```
EXPO_PUBLIC_BACKEND_URL=https://backend-production-xxxx.railway.app
EXPO_TUNNEL_SUBDOMAIN=order-kitchen-hub
EXPO_PACKAGER_HOSTNAME=https://{your-frontend-railway-url}
EXPO_PACKAGER_PROXY_URL=https://{your-frontend-railway-url}
```

### Deploy Frontend:
1. Add new service from GitHub
2. Point to `/frontend` directory
3. Click "Deploy"

**Get your frontend URL:**
```
https://frontend-production-yyyy.railway.app
```

---

## Step 5: Test

1. Open frontend URL in browser
2. Login with credentials:
   - Role: `admin`
   - Password: `MissionImpossible10*`
3. Test categories (add/delete)
4. Access from other devices using frontend URL

---

## Environment Variables Reference

| Service | Variable | Value |
|---------|----------|-------|
| Backend | MONGO_URL | Your MongoDB Atlas connection string |
| Backend | DB_NAME | `test_database` |
| Backend | ADMIN_PASSWORD | `MissionImpossible10*` |
| Backend | MASTER_PASSWORD | `Sandy0088` |
| Backend | CHEF_PASSWORD | `Sari0808` |
| Backend | PUBLIC_BACKEND_URL | Your backend Railway URL |
| Frontend | EXPO_PUBLIC_BACKEND_URL | Your backend Railway URL |
| Frontend | EXPO_TUNNEL_SUBDOMAIN | `order-kitchen-hub` |

---

## Cost Breakdown (Railway)

| Service | Cost |
|---------|------|
| Backend Container | $5/month |
| Frontend Container | $5/month |
| MongoDB (if using Railway) | Included in $5 credit |
| **Total** | **~$10/month** |

*Your MongoDB Atlas cost ($57/month) applies regardless of where you host*

---

## Update Your Code for Railway

### Dockerfile Update (Backend)

Your current Dockerfile needs one change - use PORT environment variable:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE $PORT
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

Change to:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]
```

---

## Monitoring & Logs

In Railway dashboard:
1. Click on service (Backend/Frontend)
2. Go to "Logs" tab
3. See real-time logs
4. Check "Deployments" for history

---

## Common Issues & Fixes

**Frontend shows blank page:**
- Check EXPO_PUBLIC_BACKEND_URL is correct
- Ensure backend service is running
- Check browser console for errors

**Login not working:**
- Verify backend URL in frontend env variables
- Check MongoDB connection in backend logs
- Ensure environment variables are set correctly

**Services won't start:**
- Check logs for errors
- Verify Dockerfile syntax
- Ensure requirements.txt exists

---

## Upgrade Later

If you need more power:
- Increase Railway tier ($10, $20, $50/month)
- Or migrate to Azure/AWS

---

## Quick Deploy Steps

```bash
# 1. Push code to GitHub
git add .
git commit -m "Ready for Railway deployment"
git push

# 2. Go to railway.app
# 3. Create new project
# 4. Connect GitHub
# 5. Set environment variables
# 6. Deploy!
```

Done! Your app is live and accessible from anywhere.
