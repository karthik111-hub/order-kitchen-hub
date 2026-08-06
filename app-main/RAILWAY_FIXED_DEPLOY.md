# Railway Deployment - Fixed Steps

## The Error You Got
`railpack process exited with an error` - This happens because:
- Frontend tries to build web bundle during Docker build
- Railway doesn't support pre-building Expo apps

## Solution: Simple Deployment Steps

### Step 1: Delete Old Services

1. Go to Railway dashboard
2. Delete the broken backend and frontend services
3. Click "Add Service" on the project

---

### Step 2: Create Backend Service (Simpler)

1. Click "Add Service" → "GitHub Repo"
2. Railway asks which repository - select: `karthik111-hub/order-kitchen-hub`
3. For "Root Directory", enter: `backend`
4. Click "Deploy"

**Wait for backend to deploy successfully**

---

### Step 3: Set Backend Environment Variables

Once backend shows "Success":

1. Click on "backend" service
2. Go to "Variables" tab
3. Click "Add Variable" for each:

```
MONGO_URL = mongodb+srv://karthikdonthula111_db_user:YOUR_PASSWORD@cluster0.ydr9kad.mongodb.net/?appName=Cluster0
DB_NAME = test_database
ADMIN_PASSWORD = MissionImpossible10*
MASTER_PASSWORD = Sandy0088
CHEF_PASSWORD = Sari0808
PORT = 8000
```

**Important:** Replace `YOUR_PASSWORD` with actual MongoDB Atlas password

4. Go to "Deployments" and copy the public URL (like `https://backend-production-abc123.railway.app`)
5. Add one more variable:

```
PUBLIC_BACKEND_URL = https://backend-production-abc123.railway.app
```

---

### Step 4: Create Frontend Service

1. Click "Add" → "GitHub Repo"
2. Select same repository
3. For "Root Directory", enter: `frontend`
4. Click "Deploy"

**Wait for it to build (5-10 minutes)**

---

### Step 5: Set Frontend Environment Variables

Once frontend shows "Success":

1. Click on "frontend" service
2. Go to "Variables" tab
3. Add these variables:

```
EXPO_PUBLIC_BACKEND_URL = https://backend-production-abc123.railway.app
EXPO_TUNNEL_SUBDOMAIN = order-kitchen-hub
PORT = 8082
```

**Use the actual backend URL from Step 3**

---

### Step 6: Check Logs

#### Backend Logs:
1. Click "backend" service
2. Go to "Logs" tab
3. Should show:
   - `Application startup complete`
   - No errors

#### Frontend Logs:
1. Click "frontend" service
2. Go to "Logs" tab
3. Should show:
   - `Expo server running on http://...`
   - No errors

---

### Step 7: Test Your App

1. Get frontend URL from "frontend" service → "Deployments"
2. Open it in browser (like `https://frontend-production-xyz789.railway.app`)
3. Login with:
   - Role: `admin`
   - Password: `MissionImpossible10*`
4. Test creating/deleting categories

---

## If It Still Fails

**Check Backend Logs:**
```
Error: ModuleNotFoundError
→ Missing dependency in requirements.txt

Error: Connection refused
→ Check MONGO_URL variable
→ Verify MongoDB Atlas IP whitelist
```

**Check Frontend Logs:**
```
Error: ENOENT
→ Check root directory is set to "frontend"

Error: Cannot find module
→ Try clicking "Redeploy" button
```

---

## If Backend Shows "Success" but Frontend Fails

This is normal! Frontend takes 5-10 minutes to build Expo.

**Just wait and check logs every minute**

---

## Cost

- Backend: $5/month
- Frontend: $5/month
- **Total: $10/month**

---

## Files I've Updated

✅ `frontend/Dockerfile` - Fixed to work with Railway
✅ `.railwayignore` - Prevents unnecessary rebuilds
✅ `railway-backend.toml` - Backend config
✅ `railway-frontend.toml` - Frontend config

---

## Quick Checklist

- [ ] Delete old broken services
- [ ] Create backend service with root directory: `backend`
- [ ] Set all backend environment variables
- [ ] Backend shows "Success" in Deployments
- [ ] Create frontend service with root directory: `frontend`
- [ ] Set all frontend environment variables
- [ ] Wait 5-10 minutes for frontend build
- [ ] Test app in browser
- [ ] Share frontend URL with others

---

**Push these changes to GitHub first, then deploy in Railway!**
