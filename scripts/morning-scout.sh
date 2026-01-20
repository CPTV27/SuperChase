#!/bin/bash
# SuperChase Morning Scout - Cron Wrapper
# Runs the Limitless Scout to extract insights from yesterday's Pendant lifelogs
#
# Add to crontab with: crontab -e
# 0 6 * * * /Users/chasethis/SuperChase/scripts/morning-scout.sh
#

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/limitless-scout.log"
LOCK_FILE="/tmp/superchase-scout.lock"

# Ensure log directory exists
mkdir -p "${SCRIPT_DIR}/logs"

# Prevent duplicate runs
if [ -f "$LOCK_FILE" ]; then
    echo "$(date): Scout already running, exiting" >> "$LOG_FILE"
    exit 0
fi
trap "rm -f $LOCK_FILE" EXIT
touch "$LOCK_FILE"

# Log start
echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "$(date): Morning Scout starting" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Change to project directory
cd "$SCRIPT_DIR"

# Load NVM if present (for Node version management)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Run the Limitless Scout
echo "Processing yesterday's lifelogs..." >> "$LOG_FILE"
/usr/local/bin/node "${SCRIPT_DIR}/spokes/limitless/scout.js" >> "$LOG_FILE" 2>&1
SCOUT_EXIT=$?

if [ $SCOUT_EXIT -eq 0 ]; then
    echo "$(date): Scout completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Scout failed with exit code $SCOUT_EXIT" >> "$LOG_FILE"
fi

# Optional: Also trigger the morning briefing generation
# Uncomment the following lines to auto-generate George's briefing
# echo "Generating morning briefing..." >> "$LOG_FILE"
# /usr/local/bin/node "${SCRIPT_DIR}/spokes/voice/george_bridge.js" >> "$LOG_FILE" 2>&1

echo "$(date): Morning Scout complete" >> "$LOG_FILE"
