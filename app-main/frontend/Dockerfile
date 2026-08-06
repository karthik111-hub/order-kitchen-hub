FROM node:24-alpine AS builder

WORKDIR /app

# Copy everything
COPY . .

# Remove the preinstall script from package.json temporarily
RUN sed -i 's/"preinstall":[^,}]*,\?//' package.json

# Install with npm (more reliable with --ignore-scripts)
RUN npm install --ignore-scripts --legacy-peer-deps --no-audit --no-fund 2>&1

# Now build the static export
RUN npx expo export --platform web --clear 2>&1

# Runtime - minimal Express server
FROM node:24-alpine

WORKDIR /app

# Get dist from builder
COPY --from=builder /app/dist ./dist

# Create simple server
RUN echo "const express = require('express'); const path = require('path'); const app = express(); app.use(express.static(path.join(__dirname, 'dist'))); app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html'))); const port = process.env.PORT || 8082; app.listen(port, '0.0.0.0', () => console.log('Server running on port ' + port));" > server.js

# Install express only
RUN npm init -y && npm install --production express --legacy-peer-deps

EXPOSE 8082

ENV PORT=8082

CMD ["node", "server.js"]
