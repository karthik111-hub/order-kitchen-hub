FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Copy scripts directory (required by preinstall)
COPY scripts ./scripts

# Install dependencies - skip preinstall hook during Docker build
RUN yarn install --ignore-scripts --frozen-lockfile 2>/dev/null || npm ci --ignore-scripts --legacy-peer-deps || npm install --legacy-peer-deps 2>/dev/null || true

# Copy the rest of the application
COPY . .

# Copy and make startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8082

# Set environment variables for non-interactive mode
ENV EXPO_DEBUG=true
ENV CI=true
ENV NODE_ENV=production
ENV PORT=8082

CMD ["/app/start.sh"]
