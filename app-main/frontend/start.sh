#!/bin/bash

set -e

# Non-interactive Expo startup for Railway
export EXPO_DEBUG=false
export CI=true
export NODE_ENV=production
export EXPO_NO_INTERACTIVE_CLI=true

# Use Railway PORT or default to 8082
PORT=${PORT:-8082}

echo "Starting Expo web server on port $PORT"

# Start Expo with explicit port
exec npx expo start --web --port "$PORT" --host 0.0.0.0 --clear
