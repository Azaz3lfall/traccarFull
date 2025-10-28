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
# Default paths based on standard setup

# Flutter path - check common locations
if [ -z "$FLUTTER_ROOT" ]; then
    if [ -d "$HOME/flutter" ]; then
        export FLUTTER_ROOT="$HOME/flutter"
    elif [ -d "/opt/flutter" ]; then
        export FLUTTER_ROOT="/opt/flutter"
    elif [ -d "/root/flutter" ]; then
        export FLUTTER_ROOT="/root/flutter"
    fi
    
    if [ -n "$FLUTTER_ROOT" ]; then
        export PATH="$FLUTTER_ROOT/bin:$PATH"
        echo "🦋 Set FLUTTER_ROOT to $FLUTTER_ROOT"
    fi
fi

# Android SDK path
if [ -z "$ANDROID_HOME" ]; then
    # Try $HOME/Android first (standard setup)
    if [ -d "$HOME/Android" ]; then
        export ANDROID_HOME="$HOME/Android"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "/opt/android-sdk" ]; then
        export ANDROID_HOME="/opt/android-sdk"
    elif [ -d "/usr/local/android-sdk" ]; then
        export ANDROID_HOME="/usr/local/android-sdk"
    fi
    
    if [ -n "$ANDROID_HOME" ]; then
        # Add Android tools to PATH
        export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
        echo "📱 Set ANDROID_HOME to $ANDROID_HOME"
    fi
fi

# Java path - find openjdk installations
if [ -z "$JAVA_HOME" ]; then
    # Try to find java-17 first, then java-11, then any java
    JAVA_17=$(ls -d /usr/lib/jvm/java-17-openjdk-* 2>/dev/null | head -n 1)
    JAVA_11=$(ls -d /usr/lib/jvm/java-11-openjdk-* 2>/dev/null | head -n 1)
    ANY_JAVA=$(ls -d /usr/lib/jvm/java-*-openjdk-* 2>/dev/null | head -n 1)
    
    if [ -n "$JAVA_17" ] && [ -d "$JAVA_17" ]; then
        export JAVA_HOME="$JAVA_17"
    elif [ -n "$JAVA_11" ] && [ -d "$JAVA_11" ]; then
        export JAVA_HOME="$JAVA_11"
    elif [ -n "$ANY_JAVA" ] && [ -d "$ANY_JAVA" ]; then
        export JAVA_HOME="$ANY_JAVA"
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

