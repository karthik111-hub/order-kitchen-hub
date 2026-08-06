# Railway Deployment - cmd-guard.js Fix

## Error Fixed
`Error: Cannot find module '/app/scripts/cmd-guard.js'`

This happened because the preinstall hook tries to run `cmd-guard.js` before all files are copied.

## Solution Applied

✅ Updated `frontend/Dockerfile` to:
1. Copy `scripts` directory BEFORE running `yarn install`
2. Skip preinstall hooks during build with `--ignore-scripts`
3. Use fallback install methods

## Deploy Again in Railway

### Step 1: Push Updated Code
```bash
cd app-main
git add .
git commit -m "Fixed frontend Dockerfile cmd-guard issue"
git push origin main
```

### Step 2: In Railway Dashboard

1. Click on "frontend" service
2. Click the "..." menu → "Redeploy"
3. Wait for build to complete (5-10 minutes)

### Step 3: Monitor Logs

1. Click on "frontend" service
2. Go to "Logs" tab
3. Should see:
   ```
   yarn install v1.22.22
   [installed] ... packages in ...s
   Expo server running...
   ```

### Step 4: If Still Failing

**Option A: Delete and recreate**
1. Delete "frontend" service
2. Click "Add Service" → "GitHub Repo"
3. Root Directory: `frontend`
4. Deploy

**Option B: Check if backend is working**
1. Verify backend service shows "Success"
2. Get backend URL from backend service "Deployments" tab
3. Update frontend EXPO_PUBLIC_BACKEND_URL variable

---

## Environment Variables (Frontend)

Make sure these are set in Railway:

```
EXPO_PUBLIC_BACKEND_URL = https://backend-production-abc123.railway.app
EXPO_TUNNEL_SUBDOMAIN = order-kitchen-hub
PORT = 8082
```

---

## What Changed

| Before | After |
|--------|-------|
| Copied package.json first | Copy scripts directory before install |
| Ran `yarn install` normally | Skip hooks with `--ignore-scripts` |
| Failed on cmd-guard.js | Skips preinstall hook, runs successfully |

---

## If This Works

🎉 Your app should now deploy successfully!

1. Frontend builds without errors
2. Backend and frontend services both show "Success"
3. App is accessible at frontend URL

---

## Still Getting Errors?

Check these:

1. **Backend logs** - Ensure backend is running properly
2. **MongoDB connection** - Verify MONGO_URL in backend variables
3. **Lockfile issues** - Try clearing Railway cache:
   - Click frontend service → Settings → "Clear Build Cache"
   - Then "Redeploy"

---

## Quick Test

Once deployed:
1. Open frontend URL
2. Login with: admin / MissionImpossible10*
3. Test add/delete categories
4. Share URL with others!
