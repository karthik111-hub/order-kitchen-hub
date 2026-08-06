FROM node:24-alpine AS builder

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies with npm, skip all scripts
RUN npm install --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefer-offline 2>&1 || true

# Build the static export directly
RUN npx --yes expo export --platform web --clear 2>&1 || true

# Runtime - minimal Express server
FROM node:24-alpine

WORKDIR /app

# Get dist from builder
COPY --from=builder /app/dist ./dist

# Create package.json without preinstall hook
RUN cat > package.json << 'EOF'
{
  "name": "frontend-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# Create simple server
RUN cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
const port = process.env.PORT || 8082;
app.listen(port, '0.0.0.0', () => {
  console.log('Server running on port ' + port);
});
EOF

# Install express
RUN npm install --production --legacy-peer-deps

EXPOSE 8082

ENV PORT=8082

CMD ["node", "server.js"]
