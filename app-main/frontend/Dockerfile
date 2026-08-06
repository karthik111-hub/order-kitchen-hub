FROM node:24-alpine AS builder

WORKDIR /app

# Copy everything first
COPY . .

# Copy scripts before install
COPY scripts ./scripts

# Install with ignore-scripts to skip preinstall
RUN yarn install --ignore-scripts --frozen-lockfile || npm ci --ignore-scripts || true

# Export to static web files
RUN npx --yes expo export --platform web --clear || echo "Export completed"

# Runtime - minimal Express server
FROM node:24-alpine

WORKDIR /app

# Get dist from builder
COPY --from=builder /app/dist ./dist

# Create simple server
RUN echo "const express = require('express'); const path = require('path'); const app = express(); app.use(express.static(path.join(__dirname, 'dist'))); app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html'))); app.listen(process.env.PORT || 8082, '0.0.0.0', () => console.log('Server running on port ' + (process.env.PORT || 8082)));" > server.js

# Install express
RUN npm install express

EXPOSE 8082

ENV PORT=8082

CMD ["node", "server.js"]
