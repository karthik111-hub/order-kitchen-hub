FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps 2>&1

# Copy source code
COPY . .

# Build static export
RUN npx expo export --platform web --clear

# Runtime
FROM node:24-alpine

WORKDIR /app

# Copy dist folder from builder
COPY --from=builder /app/dist ./dist

# Install express
RUN npm init -y && npm install express

# Copy server script
COPY server.js ./

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
