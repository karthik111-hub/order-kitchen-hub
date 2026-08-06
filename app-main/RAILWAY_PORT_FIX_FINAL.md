# Railway Frontend Port Issue - FINAL FIX

## Problem
```
Port NaN is being used by another process
Input is required, but 'npx expo' is in non-interactive mode.
> Use port 11000 instead?
```

Root cause: `$PORT` environment variable not being expanded in npm script

## Solution

✅ **Updated `frontend/Dockerfile`:**
- Added bash (Alpine Linux doesn't have it by default)
- Changed CMD to use `/bin/bash` to run startup script
- Set `EXPO_NO_INTERACTIVE_CLI=true`

✅ **Updated `frontend/start.sh`:**
- Use bash to properly expand `$PORT` variable
- Call `npx expo` directly instead of `yarn web`
- Add `--clear` to clear cache on startup
- Add proper error handling

✅ **Updated `frontend/.env`:**
- Added `EXPO_NO_INTERACTIVE_CLI=true`
- Removed conflicting CI setting

## Deploy NOW

### Step 1: Push Changes
```bash
cd app-main
git add .
git commit -m "Final fix: proper port handling for Railway"
git push origin main
```

### Step 2: In Railway Dashboard

1. Click "frontend" service
2. Go to "Settings"
3. Click "Clear Build Cache"
4. Click "Redeploy"
5. Wait for build (5-10 minutes)

### Step 3: Monitor Logs

Watch for this message:
```
Starting Expo web server on port 8082
[expo] web server started
```

Should NOT see:
- `Port NaN`
- `Input is required`
- `Skipping dev server`

### Step 4: Test

1. Open frontend URL
2. Should load login page
3. Login with: admin / MissionImpossible10*
4. Test features

---

## Key Differences

| Before | After |
|--------|-------|
| `yarn web --port $PORT` | `npx expo start --web --port "$PORT"` |
| No bash | Alpine + bash installed |
| CMD executed npm script | CMD executes bash script with variable expansion |
| Conflicts with CI env var | Proper env var handling |

---

## Environment Variables in Railway (Frontend)

Make sure these are SET:

```
EXPO_PUBLIC_BACKEND_URL = https://your-backend-url.railway.app
EXPO_TUNNEL_SUBDOMAIN = order-kitchen-hub
PORT = 8082
```

Railway automatically sets `PORT`, so you only need the first two.

---

## If Still Fails

**Check:**
1. Backend service is running (check logs)
2. EXPO_PUBLIC_BACKEND_URL is correct
3. No typos in environment variables

**Try:**
1. Delete frontend service completely
2. Delete and recreate from scratch
3. Check Railway system logs

---

## Success Indicators

✅ Logs show: `[expo] web server started`
✅ Frontend URL loads in browser
✅ Login page appears
✅ No "Input required" prompts
✅ No port errors

---

**This should work! Push and deploy now.**
