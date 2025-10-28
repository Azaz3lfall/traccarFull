# Resellers Server Setup

## Environment Variables Required

The resellers server needs the following environment variables to build mobile apps:

- `FLUTTER_ROOT` - Path to Flutter SDK (e.g., `/opt/flutter`)
- `ANDROID_HOME` - Path to Android SDK (e.g., `/home/user/Android/Sdk`)
- `JAVA_HOME` - Path to Java installation (e.g., `/usr/lib/jvm/java-11-openjdk-amd64`)

## Starting the Server

### Option 1: Using the Startup Script (Recommended)

The startup script automatically sources environment variables and starts PM2:

```bash
cd /opt/traccar/web/addons/reseller
./start-resellers-server.sh
```

### Option 2: Manual PM2 Start with Environment Variables

If you prefer to start manually, you need to pass environment variables:

```bash
cd /opt/traccar/web/addons/reseller
pm2 start resellersServer.mjs --name resellersServer \
  --update-env \
  --env FLUTTER_ROOT=/opt/flutter \
  --env ANDROID_HOME=/home/user/Android/Sdk \
  --env JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

### Option 3: Using Environment File

Create a `.env` file in the reseller directory with your paths:

```bash
FLUTTER_ROOT=/opt/flutter
ANDROID_HOME=/home/user/Android/Sdk
JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

Then start with:

```bash
pm2 start resellersServer.mjs --name resellersServer --update-env
```

## Checking the Setup

After starting, verify the environment variables are loaded:

```bash
pm2 logs resellersServer
```

Look for the environment setup messages:
- `🦋 Set FLUTTER_ROOT to ...`
- `📱 Set ANDROID_HOME to ...`
- `☕ Set JAVA_HOME to ...`

## Finding Your Paths

### Find Flutter Installation

```bash
which flutter
# Output: /opt/flutter/bin/flutter
# So FLUTTER_ROOT=/opt/flutter
```

### Find Android SDK

```bash
locate android-sdk
# or
ls -la ~/Android/Sdk
# or check Android Studio: File > Settings > Appearance & Behavior > System Settings > Android SDK
```

### Find Java Installation

```bash
which java
# or
update-alternatives --list java
```

## Troubleshooting

### Error: "No Android SDK found"

Make sure ANDROID_HOME is set correctly. Check with:

```bash
pm2 logs resellersServer | grep ANDROID_HOME
```

If it shows "NOT SET", add it to your startup method.

### Error: "Trying to run flutter as root"

PM2 is running as root. Consider:

1. Running PM2 as a non-root user:
```bash
pm2 start resellersServer.mjs --name resellersServer --uid your-username
```

2. Or allow Flutter to run as root (not recommended):
```bash
export FLUTTER_ALLOW_ROOT=1
```

### Error: "Cannot find package 'sharp'"

Install dependencies:

```bash
cd /opt/traccar/web/addons/reseller
npm install
```

