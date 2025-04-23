#!/bin/bash

# Script to set up cron jobs for daily predictions at 8 AM

# Exit on error
set -e

# Navigate to project directory
PROJECT_DIR="$(dirname "$(realpath "$0")")"
cd "$PROJECT_DIR/.."

# Create a temporary file for the crontab
TEMP_CRON=$(mktemp)

# Get existing crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# New crontab" > "$TEMP_CRON"

# Remove any existing prediction jobs
grep -v "generate-predictions.ts\|send-predictions-email.ts" "$TEMP_CRON" > "${TEMP_CRON}.new"
mv "${TEMP_CRON}.new" "$TEMP_CRON"

# Add our new scheduled jobs
# First fetch odds and generate predictions
echo "0 8 * * * cd $PWD && NODE_OPTIONS='--loader ts-node/esm' npx ts-node scripts/fetch-odds.ts > logs/fetch-odds-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1" >> "$TEMP_CRON"
echo "5 8 * * * cd $PWD && NODE_OPTIONS='--loader ts-node/esm' npx ts-node scripts/generate-predictions.ts > logs/generate-predictions-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1" >> "$TEMP_CRON"
echo "10 8 * * * cd $PWD && NODE_OPTIONS='--loader ts-node/esm' npx ts-node scripts/send-predictions-email.ts > logs/send-predictions-email-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1" >> "$TEMP_CRON"

# Make sure logs directory exists
mkdir -p logs

# Install the new crontab
echo "Installing cron jobs..."
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# Display confirmation
echo "✅ Scheduled prediction jobs have been installed."
echo "Jobs will run at the following times each day:"
echo "  - 8:00 AM: Fetch odds"
echo "  - 8:05 AM: Generate predictions"
echo "  - 8:10 AM: Send email"
echo ""
echo "Log files will be saved to: $PWD/logs/"
echo "To view scheduled jobs, run: crontab -l"
echo "To remove all jobs, run: crontab -r" 