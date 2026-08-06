FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json yarn.lock* ./

# Install dependencies (no preinstall hook now)
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

# Create minimal package.json for runtime
RUN echo '{"name":"server","version":"1.0.0","dependencies":{"express":"^4.18.2"}}' > package.json

# Install express
RUN npm install --production

# Create server
RUN echo 'const express=require("express");const path=require("path");const app=express();const port=process.env.PORT||8082;app.use(express.static(path.join(__dirname,"dist")));app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"dist","index.html")));app.listen(port,"0.0.0.0",()=>console.log("Server on port "+port));' > server.js

EXPOSE 8082

ENV PORT=8082

CMD ["node", "server.js"]
