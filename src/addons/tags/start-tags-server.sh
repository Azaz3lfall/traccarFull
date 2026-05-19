#!/bin/bash

# Tags Services Startup Script
# Starts COINTAG webhook server and K-Tag polling service with PM2

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Project root (traccar-custom) - three levels up from tags
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"
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
echo "🏷️  Starting Tags services with PM2..."
echo ""

# COINTAG - Webhook server (receives POST from COINTAG, forwards to Traccar OsmAnd)
echo "🚀 Starting COINTAG webhook server..."
pm2 start src/addons/tags/cointag.mjs --name cointag --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# K-Tag - Polling service (fetches from K-Tag API, reports to Traccar)
echo "🚀 Starting K-Tag polling service..."
pm2 start src/addons/tags/tags.mjs --name ktag --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# nanoTAG - Polling service (fetches from nanoTAG API, reports to Traccar)
echo "🚀 Starting nanoTAG polling service..."
pm2 start src/addons/tags/nanotag.mjs --name nanotag --log-date-format "YYYY-MM-DD HH:mm:ss Z"

pm2 save

echo ""
echo "✅ Tags services started!"
echo "   COINTAG: pm2 logs cointag"
echo "   K-Tag:   pm2 logs ktag"
echo "   nanoTAG: pm2 logs nanotag"
echo "   Status:  pm2 status"
echo ""
