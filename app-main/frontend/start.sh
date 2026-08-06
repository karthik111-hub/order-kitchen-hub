#!/bin/bash

# Suppress all interactive prompts
export EXPO_DEBUG=false
export CI=true
export NODE_ENV=production  
export EXPO_NO_INTERACTIVE_CLI=true
export FORCE_COLOR=true

PORT=${PORT:-8080}

echo "[$(date)] Starting Expo web on port $PORT"

# Use expect to auto-answer prompts if needed
cat > /tmp/run_expo.sh << 'EOF'
#!/bin/bash
npx expo start --web --clear
EOF

chmod +x /tmp/run_expo.sh

# Run Expo directly
npx expo start --web --clear 2>&1 &
EXPO_PID=$!

# Wait a bit for Expo to start
sleep 5

# Check if it's running
if kill -0 $EXPO_PID 2>/dev/null; then
    echo "[$(date)] Expo started successfully on PID $EXPO_PID"
    wait $EXPO_PID
else
    echo "[$(date)] Expo failed to start"
    exit 1
fi
