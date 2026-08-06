#!/bin/bash

# Non-interactive Expo startup for Railway

export EXPO_DEBUG=true
export CI=true
export NODE_ENV=production

# Start Expo web server on the specified port
exec yarn web --port ${PORT:-8082} --host 0.0.0.0
