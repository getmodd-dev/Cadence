#!/bin/sh
set -e

# Target data directory (default /data)
DATA_DIR="${DATA_DIR:-/data}"

# Ensure data and backup directories exist
mkdir -p "$DATA_DIR"
mkdir -p "$DATA_DIR/backups"

# Bridge /app/data and /data so mappings to either container path work seamlessly
if [ -d "/app" ] && [ "$DATA_DIR" != "/app/data" ]; then
  # If legacy data exists in /app/data, migrate it into $DATA_DIR
  if [ -d "/app/data" ] && [ ! -L "/app/data" ]; then
    if [ -f "/app/data/database.json" ] && [ ! -f "$DATA_DIR/database.json" ]; then
      echo "[Cadence Entrypoint] Migrating legacy database from /app/data to $DATA_DIR..."
      cp -r /app/data/* "$DATA_DIR/" 2>/dev/null || true
    fi
    rm -rf /app/data 2>/dev/null || true
  fi
  # Create symlink so both /data and /app/data resolve to the persistent host array
  if [ ! -e "/app/data" ]; then
    ln -s "$DATA_DIR" /app/data 2>/dev/null || true
  fi
fi

# Ensure permissive read/write permissions on the volume for Unraid (nobody:users UID 99/GID 100),
# standard Docker (root UID 0), or non-root user (node UID 1000)
chmod -R 777 "$DATA_DIR" 2>/dev/null || true

# Forward signals and execute node application
exec "$@"
