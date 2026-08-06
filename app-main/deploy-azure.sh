#!/bin/bash

# Azure Deployment Script for Order Kitchen Hub

set -e

echo "=== Order Kitchen Hub - Azure Deployment ==="

# Variables
RESOURCE_GROUP="order-kitchen-hub"
REGISTRY_NAME="orderkitchenhubregistry"
LOCATION="eastus"
BACKEND_CONTAINER="order-kitchen-backend"
FRONTEND_CONTAINER="order-kitchen-frontend"

# MongoDB connection string (UPDATE THIS)
MONGO_URL="${MONGO_URL:-mongodb+srv://karthikdonthula111_db_user:pYDtxLXofefSmd1l@cluster0.ydr9kad.mongodb.net/?appName=Cluster0}"

echo "Step 1: Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "Step 2: Creating Container Registry..."
az acr create --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic

echo "Step 3: Logging into ACR..."
az acr login --name $REGISTRY_NAME

echo "Step 4: Building and Pushing Backend Image..."
az acr build --registry $REGISTRY_NAME \
  --image backend:latest \
  ./backend

echo "Step 5: Building and Pushing Frontend Image..."
az acr build --registry $REGISTRY_NAME \
  --image frontend:latest \
  ./frontend

echo "Step 6: Getting ACR Credentials..."
REGISTRY_URL="${REGISTRY_NAME}.azurecr.io"
USERNAME=$(az acr credential show --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME --query username -o tsv)
PASSWORD=$(az acr credential show --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME --query "passwords[0].value" -o tsv)

echo "Step 7: Deploying Backend Container..."
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_CONTAINER \
  --image ${REGISTRY_URL}/backend:latest \
  --registry-login-server $REGISTRY_URL \
  --registry-username $USERNAME \
  --registry-password $PASSWORD \
  --ports 8000 \
  --environment-variables \
    MONGO_URL="$MONGO_URL" \
    DB_NAME="test_database" \
    ADMIN_PASSWORD="MissionImpossible10*" \
    MASTER_PASSWORD="Sandy0088" \
    CHEF_PASSWORD="Sari0808" \
  --cpu 1 \
  --memory 1 \
  --restart-policy OnFailure

echo "Step 8: Deploying Frontend Container..."
BACKEND_URL=$(az container show --resource-group $RESOURCE_GROUP \
  --name $BACKEND_CONTAINER --query ipAddress.fqdn -o tsv)

az container create \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_CONTAINER \
  --image ${REGISTRY_URL}/frontend:latest \
  --registry-login-server $REGISTRY_URL \
  --registry-username $USERNAME \
  --registry-password $PASSWORD \
  --ports 8082 \
  --environment-variables \
    EXPO_PUBLIC_BACKEND_URL="http://${BACKEND_URL}:8000" \
    EXPO_TUNNEL_SUBDOMAIN="order-kitchen-hub" \
  --cpu 1 \
  --memory 1 \
  --restart-policy OnFailure

echo ""
echo "=== Deployment Complete ==="
echo "Backend URL: http://${BACKEND_URL}:8000"
echo "Frontend URL: http://$(az container show --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_CONTAINER --query ipAddress.fqdn -o tsv):8082"
echo ""
echo "Monitor logs:"
echo "  az container logs --resource-group $RESOURCE_GROUP --name $BACKEND_CONTAINER"
echo "  az container logs --resource-group $RESOURCE_GROUP --name $FRONTEND_CONTAINER"
