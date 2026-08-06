# Railway Frontend Crash Fix - Interactive Mode Error

## Error
```
Input is required, but 'npx expo' is in non-interactive mode.
Required input:
> Use port 11000 instead?
```

## Root Cause
Expo tries to interact with the terminal when the port is busy, but Railway containers run in non-interactive mode (no terminal).

## Solution Applied

✅ **Updated frontend/Dockerfile:**
- Added environment variables for non-interactive mode
- Created startup script to handle port properly
- Set CI=true to disable interactive prompts

✅ **Updated frontend/.env:**
- Removed localhost hardcoded values
- Added CI=true for production mode

✅ **Created frontend/start.sh:**
- Non-interactive startup script
- Properly passes environment variables to Expo

## Deploy the Fix

### Step 1: Push Updated Code
```bash
cd app-main
git add .
git commit -m "Fixed frontend interactive mode error"
git push origin main
```

### Step 2: In Railway Dashboard

#### Option A: Clear Cache & Redeploy (Recommended)
1. Click "frontend" service
2. Go to "Settings"
3. Scroll down → "Clear Build Cache"
4. Click "Redeploy"
5. Wait 5-10 minutes

#### Option B: Delete & Recreate
1. Delete "frontend" service
2. Click "Add Service" → "GitHub Repo"
3. Root Directory: `frontend`
4. Set environment variables:
   ```
   EXPO_PUBLIC_BACKEND_URL = https://your-backend-url.railway.app
   EXPO_TUNNEL_SUBDOMAIN = order-kitchen-hub
   PORT = 8082
   ```
5. Deploy

### Step 3: Monitor Logs

1. Click "frontend" service
2. Go to "Logs" tab
3. Wait for this message:
   ```
   [expo] web server started at http://0.0.0.0:8082
   ```
4. Should NOT show port conflict errors

### Step 4: Test

1. Open frontend URL (from Deployments tab)
2. Should load without errors
3. Login with: admin / MissionImpossible10*

---

## Environment Variables Needed

**Backend Service:**
```
MONGO_URL = your-mongodb-connection-string
DB_NAME = test_database
ADMIN_PASSWORD = MissionImpossible10*
MASTER_PASSWORD = Sandy0088
CHEF_PASSWORD = Sari0808
PUBLIC_BACKEND_URL = https://your-backend-url.railway.app
PORT = 8000
```

**Frontend Service:**
```
EXPO_PUBLIC_BACKEND_URL = https://your-backend-url.railway.app
EXPO_TUNNEL_SUBDOMAIN = order-kitchen-hub
PORT = 8082
```

---

## What Changed

| File | Change |
|------|--------|
| `frontend/Dockerfile` | Added startup script, CI=true, non-interactive env vars |
| `frontend/.env` | Removed localhost hardcoded values, added CI=true |
| `frontend/start.sh` | New: Non-interactive startup script for Railway |

---

## If Still Crashing

**Check backend is running:**
```
https://your-backend-url.railway.app/docs
```
Should show Swagger docs (not error page)

**Check frontend logs for:**
- `ENOENT` errors → Missing files
- `Cannot find module` → Missing dependencies
- `Connection refused` → Backend URL wrong

**Try these fixes:**
1. Clear Railway build cache
2. Restart frontend service
3. Delete and recreate both services
4. Check all environment variables are set correctly

---

## Success Signs

✅ Frontend logs show: `web server started at http://0.0.0.0:8082`
✅ Frontend URL loads in browser
✅ Can login with credentials
✅ Can create/delete categories
✅ No errors in console (F12 → Console tab)

---

## Access Your App

Once working:
```
Frontend: https://frontend-production-xxx.railway.app
Backend API: https://backend-production-yyy.railway.app
API Docs: https://backend-production-yyy.railway.app/docs
```

Share the frontend URL with others to access from any device!
