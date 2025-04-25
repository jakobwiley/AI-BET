#!/bin/bash

# Set up environment
export NODE_ENV=production
source .env

# Log file setup
LOG_DIR="logs"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/daily-predictions-$(date +%Y-%m-%d).log"

# Function to run predictions
run_predictions() {
    echo "Starting daily predictions at $(date)" >> "$LOG_FILE"
    
    # Update team stats first
    npx ts-node scripts/populate-team-stats.ts >> "$LOG_FILE" 2>&1
    
    # Generate and send predictions
    npx ts-node scripts/generate-daily-predictions.ts >> "$LOG_FILE" 2>&1
    
    echo "Completed daily predictions at $(date)" >> "$LOG_FILE"
}

# Run predictions
run_predictions

# Add to crontab if not already added
CRON_CMD="0 9 * * * cd $(pwd) && ./scripts/schedule-daily-predictions.sh"
(crontab -l 2>/dev/null | grep -q "$CRON_CMD") || (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "Daily predictions script has been scheduled to run at 9:00 AM daily"
echo "Logs will be written to $LOG_FILE" 