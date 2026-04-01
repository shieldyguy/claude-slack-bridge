#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# Check required env vars
for var in SLACK_BOT_TOKEN SLACK_APP_TOKEN SLACK_CHANNEL_ID; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set. Copy .env.example to .env and fill in your tokens."
    exit 1
  fi
done

# Check if already running
if [ -f "$SCRIPT_DIR/bridge.pid" ]; then
  OLD_PID=$(cat "$SCRIPT_DIR/bridge.pid")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Bridge already running (PID $OLD_PID). Kill with: kill $OLD_PID"
    exit 0
  fi
fi

echo "Starting claude-slack-bridge daemon..."
echo "  Channel: $SLACK_CHANNEL_ID"
echo "  tmux session: ${TMUX_SESSION:-claude}"
echo "  HTTP API port: ${BRIDGE_PORT:-3271}"

# Run daemon in background, log to file
nohup node "$SCRIPT_DIR/src/daemon.js" > "$SCRIPT_DIR/bridge.log" 2>&1 &
BRIDGE_PID=$!
echo "$BRIDGE_PID" > "$SCRIPT_DIR/bridge.pid"
echo "  PID: $BRIDGE_PID (saved to bridge.pid)"
echo "  Log: $SCRIPT_DIR/bridge.log"
echo "Done. Kill with: kill \$(cat $SCRIPT_DIR/bridge.pid)"
