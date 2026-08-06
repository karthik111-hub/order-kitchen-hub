# Two Deployment Options for Expo App

## Option 1: Use Render.com (RECOMMENDED - Easiest)

Render is specifically designed for Expo web and won't have interactive prompt issues.

### Step 1: Create Account
- Go to https://render.com
- Sign up with GitHub

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select: `karthik111-hub/order-kitchen-hub`
4. Service name: `frontend`
5. Root Directory: `frontend`
6. Runtime: Node
7. Build Command: `yarn install && yarn web --clear`
8. Start Command: `yarn web`

### Step 3: Set Environment Variables
In Render dashboard → Environment:
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-railway-url
EXPO_TUNNEL_SUBDOMAIN=order-kitchen-hub
NODE_ENV=production
```

### Step 4: Deploy Backend
Repeat same steps for backend in Railway (keep backend on Railway)

### Pros:
✅ Render handles Expo better
✅ No interactive prompt issues
✅ Similar cost ($7-10/month)
✅ Better for React Native web

---

## Option 2: Build Static Export (Production)

Export Expo to static files and serve with Node.

### Update package.json:
```json
{
  "scripts": {
    "web": "expo start --web",
    "web:export": "expo export --platform web",
    "build": "expo export --platform web",
    "start": "node server.js"
  }
}
```

### Create server.js:
```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8082;

// Serve static exported files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router (send all requests to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### New Dockerfile:
```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json yarn.lock ./
COPY scripts ./scripts

RUN yarn install --ignore-scripts --frozen-lockfile

COPY . .

# Build static export
RUN yarn web:export

# Install express for serving
RUN yarn add express

EXPOSE 8082

CMD ["node", "server.js"]
```

### Pros:
✅ No interactive prompts
✅ Fast loading (static files)
✅ Works on Railway
✅ Production-ready

---

## MY RECOMMENDATION

**Use Render.com** - it's simpler and designed for Expo.

**Steps:**
1. Keep backend on Railway (it's working)
2. Deploy frontend to Render instead
3. Takes 5 minutes

Would you like me to:
A) Set up Render deployment (recommended)
B) Set up static export method
C) Try another Railway workaround
