#!/bin/bash

# Core Fleet Wrapper Startup Script
# Starts the Core API service (fleet, clients, vehicles) with PM2

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Project root (traccar-custom) - four levels up from core
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../../.." && pwd )"
cd "$PROJECT_ROOT"

# Source environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env"
    set -a
    source .env
    set +a
fi

# Source global environment variables from common location
ENV_FILES=(
    "$HOME/.bashrc"
    "$HOME/.profile"
    "/etc/profile"
)

for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 Loading environment from: $file"
        set -a
        source "$file"
        set +a
    fi
done

echo ""
echo "🧠 Starting Core Fleet Wrapper with PM2..."
pm2 start src/addons/traccar_wrapper/core/core.js --name core --log-date-format "YYYY-MM-DD HH:mm:ss Z"
pm2 save

echo ""
echo "✅ Core server started!"
echo "   View logs:  pm2 logs core"
echo "   Check status: pm2 status"
echo "   API: http://localhost:${CORE_PORT:-4000}/api/fleet/map"
echo ""
