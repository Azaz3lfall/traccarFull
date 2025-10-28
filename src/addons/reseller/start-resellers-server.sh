#!/bin/bash

# Resellers Server Startup Script
# This script sources environment variables and starts the reseller server with PM2

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Source environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env"
    set -a
    source .env
    set +a
fi

# Source global environment variables from common location
# You can customize these paths to match your server setup
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

# Set critical environment variables if not already set
# Customize these paths to match your server installation

# Flutter path
if [ -z "$FLUTTER_ROOT" ] && [ -d "/opt/flutter" ]; then
    export FLUTTER_ROOT="/opt/flutter"
    export PATH="$FLUTTER_ROOT/bin:$PATH"
    echo "🦋 Set FLUTTER_ROOT to /opt/flutter"
fi

# Android SDK path
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "/opt/android-sdk" ]; then
        export ANDROID_HOME="/opt/android-sdk"
    elif [ -d "/usr/local/android-sdk" ]; then
        export ANDROID_HOME="/usr/local/android-sdk"
    fi
    
    if [ -n "$ANDROID_HOME" ]; then
        export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
        echo "📱 Set ANDROID_HOME to $ANDROID_HOME"
    fi
fi

# Java path
if [ -z "$JAVA_HOME" ]; then
    if [ -d "/usr/lib/jvm/java-11-openjdk-amd64" ]; then
        export JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"
    elif [ -d "/usr/lib/jvm/java-11-openjdk" ]; then
        export JAVA_HOME="/usr/lib/jvm/java-11-openjdk"
    elif [ -d "/opt/java" ]; then
        export JAVA_HOME="/opt/java"
    fi
    
    if [ -n "$JAVA_HOME" ]; then
        export PATH="$JAVA_HOME/bin:$PATH"
        echo "☕ Set JAVA_HOME to $JAVA_HOME"
    fi
fi

# Display current environment
echo ""
echo "🌍 Current Environment:"
echo "   FLUTTER_ROOT: ${FLUTTER_ROOT:-'NOT SET'}"
echo "   ANDROID_HOME: ${ANDROID_HOME:-'NOT SET'}"
echo "   JAVA_HOME: ${JAVA_HOME:-'NOT SET'}"
echo "   PATH: $PATH"
echo ""

# Start the server with PM2
echo "🚀 Starting resellers server with PM2..."
pm2 start resellersServer.mjs --name resellersServer --log-date-format "YYYY-MM-DD HH:mm:ss Z"
pm2 save

echo "✅ Server started!"
echo "   View logs: pm2 logs resellersServer"
echo "   Check status: pm2 status"
echo ""

