FROM node:24-alpine AS builder

WORKDIR /app

# Install bash
RUN apk add --no-cache bash

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Copy scripts directory
COPY scripts ./scripts

# Install all dependencies
RUN yarn install --ignore-scripts --frozen-lockfile 2>/dev/null || npm ci --ignore-scripts --legacy-peer-deps 2>/dev/null || true

# Copy source code
COPY . .

# Build static export for web
RUN EXPO_DEBUG=false CI=true NODE_ENV=production yarn exec -- expo export --platform web --clear

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Install only express via npm (no preinstall hook)
RUN npm init -y && npm install --production express

# Copy dist folder from builder
COPY --from=builder /app/dist ./dist

# Copy server script
COPY server.js ./

EXPOSE 8082

ENV NODE_ENV=production
ENV PORT=8082

CMD ["node", "server.js"]
