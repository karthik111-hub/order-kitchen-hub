FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Copy scripts directory
COPY scripts ./scripts

# Install all dependencies
RUN yarn install --ignore-scripts --frozen-lockfile 2>/dev/null || npm ci --ignore-scripts --legacy-peer-deps 2>/dev/null || true

# Copy source code
COPY . .

# Build static export for web - use npx directly instead of npm script
RUN EXPO_DEBUG=false CI=true NODE_ENV=production npx expo export --platform web --clear

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Create minimal package.json for express only
RUN echo '{"name":"frontend-server","version":"1.0.0","scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.2"}}' > package.json

# Install only express
RUN npm install --production && npm cache clean --force

# Copy dist folder from builder
COPY --from=builder /app/dist ./dist

# Copy server script
COPY server.js ./

EXPOSE 8082

ENV NODE_ENV=production
ENV PORT=8082

CMD ["node", "server.js"]
