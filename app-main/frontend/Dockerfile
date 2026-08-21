FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps 2>&1

# Copy source code
COPY . .

# Expo inlines EXPO_PUBLIC_* variables into the JS bundle at build time,
# not at container runtime. Since the frontend and backend are deployed as
# separate Railway services (separate domains), this must be passed in as a
# build ARG - it can't be picked up from a runtime-only env var, and the
# hostname-based fallback in src/api.ts is only correct when frontend and
# backend share a domain, which they do not here.
ARG EXPO_PUBLIC_BACKEND_URL
ENV EXPO_PUBLIC_BACKEND_URL=${EXPO_PUBLIC_BACKEND_URL}

# Build static export
RUN npx expo export --platform web --clear

# Runtime
FROM node:24-alpine

WORKDIR /app

# Copy dist folder from builder
COPY --from=builder /app/dist ./dist

# Copy public folder with static assets
COPY --from=builder /app/public ./public

# Install express
RUN npm init -y && npm install express

# Copy server script
COPY server.js ./

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server.js"]
