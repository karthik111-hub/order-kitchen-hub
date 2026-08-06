# Azure Container Deployment Guide

## Prerequisites
- Azure Account with active subscription
- Azure CLI installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Docker installed (for local testing)

## Step 1: Create Azure Resource Group

```bash
az group create --name order-kitchen-hub --location eastus
```

## Step 2: Create Azure Container Registry (ACR)

```bash
az acr create --resource-group order-kitchen-hub \
  --name orderkitchenhubregistry \
  --sku Basic
```

## Step 3: Login to ACR

```bash
az acr login --name orderkitchenhubregistry
```

## Step 4: Build and Push Docker Images

### Backend

```bash
cd backend
az acr build --registry orderkitchenhubregistry \
  --image backend:latest .
cd ..
```

### Frontend

```bash
cd frontend
az acr build --registry orderkitchenhubregistry \
  --image frontend:latest .
cd ..
```

## Step 5: Create Environment Variables File

Create `azure-env.txt`:

```
MONGO_URL=mongodb+srv://karthikdonthula111_db_user:pYDtxLXofefSmd1l@cluster0.ydr9kad.mongodb.net/?appName=Cluster0
DB_NAME=test_database
ADMIN_PASSWORD=MissionImpossible10*
MASTER_PASSWORD=Sandy0088
CHEF_PASSWORD=Sari0808
PUBLIC_BACKEND_URL=https://YOUR_BACKEND_AZURE_URL
EXPO_PUBLIC_BACKEND_URL=https://YOUR_BACKEND_AZURE_URL
EXPO_TUNNEL_SUBDOMAIN=order-kitchen-hub
```

## Step 6: Deploy Backend Container

```bash
az container create \
  --resource-group order-kitchen-hub \
  --name order-kitchen-backend \
  --image orderkitchenhubregistry.azurecr.io/backend:latest \
  --registry-login-server orderkitchenhubregistry.azurecr.io \
  --registry-username <ACR_USERNAME> \
  --registry-password <ACR_PASSWORD> \
  --ports 8000 \
  --environment-variables \
    MONGO_URL="mongodb+srv://karthikdonthula111_db_user:pYDtxLXofefSmd1l@cluster0.ydr9kad.mongodb.net/?appName=Cluster0" \
    DB_NAME="test_database" \
    ADMIN_PASSWORD="MissionImpossible10*" \
    MASTER_PASSWORD="Sandy0088" \
    CHEF_PASSWORD="Sari0808" \
    PUBLIC_BACKEND_URL="https://order-kitchen-backend.azurecontainer.io:8000" \
  --cpu 1 \
  --memory 1
```

## Step 7: Deploy Frontend Container

```bash
az container create \
  --resource-group order-kitchen-hub \
  --name order-kitchen-frontend \
  --image orderkitchenhubregistry.azurecr.io/frontend:latest \
  --registry-login-server orderkitchenhubregistry.azurecr.io \
  --registry-username <ACR_USERNAME> \
  --registry-password <ACR_PASSWORD> \
  --ports 8082 \
  --environment-variables \
    EXPO_PUBLIC_BACKEND_URL="https://order-kitchen-backend.azurecontainer.io:8000" \
    EXPO_TUNNEL_SUBDOMAIN="order-kitchen-hub" \
  --cpu 1 \
  --memory 1
```

## Step 8: Get Container URLs

```bash
az container show --resource-group order-kitchen-hub \
  --name order-kitchen-backend --query ipAddress.fqdn

az container show --resource-group order-kitchen-hub \
  --name order-kitchen-frontend --query ipAddress.fqdn
```

## Environment Variables Explained

| Variable | Value | Description |
|----------|-------|-------------|
| MONGO_URL | `mongodb+srv://...` | Cloud MongoDB connection string (already configured) |
| DB_NAME | `test_database` | Database name in MongoDB |
| ADMIN_PASSWORD | `MissionImpossible10*` | Admin login password |
| MASTER_PASSWORD | `Sandy0088` | Master role password |
| CHEF_PASSWORD | `Sari0808` | Chef role password |
| PUBLIC_BACKEND_URL | Azure backend URL | Backend URL for frontend to call |
| EXPO_PUBLIC_BACKEND_URL | Azure backend URL | Same as above, for frontend |
| EXPO_TUNNEL_SUBDOMAIN | `order-kitchen-hub` | Expo tunnel subdomain |

## Alternative: Deploy using Docker Compose on App Service

### Option A: Create Web App for Containers

```bash
az appservice plan create --name order-kitchen-plan \
  --resource-group order-kitchen-hub --sku B1 --is-linux

az webapp create --resource-group order-kitchen-hub \
  --plan order-kitchen-plan \
  --name order-kitchen-app \
  --deployment-container-image-name-user orderkitchenhubregistry.azurecr.io/backend:latest
```

## Testing Locally First

```bash
# Build images
docker-compose build

# Run locally
docker-compose up -d

# Access
# Frontend: http://localhost:8081
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Cleanup

```bash
# Stop and remove containers
az container delete --resource-group order-kitchen-hub --name order-kitchen-backend --yes
az container delete --resource-group order-kitchen-hub --name order-kitchen-frontend --yes

# Remove resource group
az group delete --name order-kitchen-hub --yes
```

## Troubleshooting

### Check container logs
```bash
az container logs --resource-group order-kitchen-hub --name order-kitchen-backend
az container logs --resource-group order-kitchen-hub --name order-kitchen-frontend
```

### Check container status
```bash
az container show --resource-group order-kitchen-hub --name order-kitchen-backend
```

### Common Issues

1. **MongoDB Connection Failed**: Verify connection string and IP whitelisting in MongoDB Atlas
2. **Port Issues**: Ensure ports 8000 and 8082 are accessible
3. **Environment Variables Not Set**: Double-check variable names and values
4. **Frontend Can't Reach Backend**: Update EXPO_PUBLIC_BACKEND_URL to correct Azure backend URL
