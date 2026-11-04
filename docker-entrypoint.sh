#!/bin/sh
set -e

# Detect active container mounts from host via /proc/mounts
IS_APP_DATA_MOUNT=false
IS_DATA_MOUNT=false

if [ -f /proc/mounts ]; then
  if grep -qs " /app/data " /proc/mounts; then
    IS_APP_DATA_MOUNT=true
  fi
  if grep -qs " /data " /proc/mounts; then
    IS_DATA_MOUNT=true
  fi
fi

# Determine optimal data directory:
# Priority 1: User host mount to /app/data
# Priority 2: User host mount to /data
# Priority 3: Explicit non-default DATA_DIR environment variable
# Priority 4: Existing database file in /app/data
# Priority 5: Existing database file in /data
# Priority 6: Default to /app/data (canonical working directory path)
if [ "$IS_APP_DATA_MOUNT" = "true" ]; then
  TARGET_DIR="/app/data"
elif [ "$IS_DATA_MOUNT" = "true" ]; then
  TARGET_DIR="/data"
elif [ -n "$DATA_DIR" ] && [ "$DATA_DIR" != "/data" ] && [ "$DATA_DIR" != "/app/data" ]; then
  TARGET_DIR="$DATA_DIR"
elif [ -f "/app/data/database.json" ]; then
  TARGET_DIR="/app/data"
elif [ -f "/data/database.json" ]; then
  TARGET_DIR="/data"
else
  TARGET_DIR="/app/data"
fi

export DATA_DIR="$TARGET_DIR"
echo "[Cadence Entrypoint] Active persistent storage directory: $DATA_DIR (app_mount: $IS_APP_DATA_MOUNT, data_mount: $IS_DATA_MOUNT)"

# Ensure storage directories exist
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/backups"
mkdir -p /app/data
mkdir -p /app/data/backups

# Safe bidirectional migration and symlink bridging:
# NEVER run rm -rf on any mounted directories!
if [ "$DATA_DIR" = "/app/data" ]; then
  # If /data has a database and /app/data is empty, migrate from /data to /app/data
  if [ -f "/data/database.json" ] && [ ! -f "/app/data/database.json" ]; then
    echo "[Cadence Entrypoint] Preserving existing database from /data into /app/data..."
    cp -r /data/* /app/data/ 2>/dev/null || true
  fi
  # If /data is not a separate host mount and not a symlink, link /data -> /app/data
  if [ "$IS_DATA_MOUNT" != "true" ] && [ ! -L "/data" ]; then
    rm -rf /data 2>/dev/null || true
    ln -s /app/data /data 2>/dev/null || true
  fi
elif [ "$DATA_DIR" = "/data" ]; then
  # If /app/data has a database and /data is empty, migrate from /app/data to /data
  if [ -f "/app/data/database.json" ] && [ ! -f "/data/database.json" ]; then
    echo "[Cadence Entrypoint] Preserving existing database from /app/data into /data..."
    cp -r /app/data/* /data/ 2>/dev/null || true
  fi
  # If /app/data is not a separate host mount and not a symlink, link /app/data -> /data
  if [ "$IS_APP_DATA_MOUNT" != "true" ] && [ ! -L "/app/data" ]; then
    rm -rf /app/data 2>/dev/null || true
    ln -s /data /app/data 2>/dev/null || true
  fi
fi

# Ensure permissive read/write permissions for host volume UID/GID mapping
# Compatible with Unraid (nobody:users UID 99/GID 100), Docker root (UID 0), or non-root (node UID 1000)
chmod -R 777 "$DATA_DIR" 2>/dev/null || true
chmod -R 777 /app/data 2>/dev/null || true
chmod -R 777 /data 2>/dev/null || true

# Forward signals and execute node application
exec "$@"
