#!/bin/bash

# Script to set up cron jobs for odds updates every 4 hours from 11 AM to 8 PM CT
# This will run at 11 AM, 3 PM, and 7 PM CT (these are 12 PM, 4 PM, and 8 PM ET)

# Exit on error
set -e

# Navigate to project directory
PROJECT_DIR="$(dirname "$(realpath "$0")")"
cd "$PROJECT_DIR"

# Make sure our update script is executable
chmod +x "$PROJECT_DIR/update-odds-and-picks.sh"

# Convert times to the machine's local timezone
# CT times (11 AM, 3 PM, 7 PM) need to be adjusted based on the local machine timezone
# For a machine in ET, these would be 12, 16, and 20 (hour of day)

# Determine what timezone the machine is in
TZ_OFFSET=$(date +%z)
echo "System timezone offset: $TZ_OFFSET"

# For Central Time (-0500 or -0600 depending on daylight savings)
# We'll use simple logic - if TZ_OFFSET starts with -05, we're in ET
# Adjust hours accordingly
if [[ "$TZ_OFFSET" == "-05"* ]]; then
    # ET is 1 hour ahead of CT
    HOURS="12,16,20"
    echo "System is in Eastern Time. Will schedule for 12 PM, 4 PM, and 8 PM ET."
elif [[ "$TZ_OFFSET" == "-06"* ]]; then
    # CT is the same
    HOURS="11,15,19"
    echo "System is in Central Time. Will schedule for 11 AM, 3 PM, and 7 PM CT."
elif [[ "$TZ_OFFSET" == "-07"* ]]; then
    # MT is 1 hour behind CT
    HOURS="10,14,18"
    echo "System is in Mountain Time. Will schedule for 10 AM, 2 PM, and 6 PM MT."
elif [[ "$TZ_OFFSET" == "-08"* ]]; then
    # PT is 2 hours behind CT
    HOURS="9,13,17"
    echo "System is in Pacific Time. Will schedule for 9 AM, 1 PM, and 5 PM PT."
else
    # Default to CT times
    HOURS="11,15,19"
    echo "Could not determine timezone. Defaulting to CT hours (11 AM, 3 PM, 7 PM)."
fi

# Create a temporary file for the crontab
TEMP_CRON=$(mktemp)

# Get existing crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# New crontab" > "$TEMP_CRON"

# Remove any existing odds update jobs
grep -v "update-odds-and-picks.sh" "$TEMP_CRON" > "${TEMP_CRON}.new"
mv "${TEMP_CRON}.new" "$TEMP_CRON"

# Add our new scheduled jobs
for HOUR in ${HOURS//,/ }; do
    echo "0 $HOUR * * * cd $PROJECT_DIR && ./update-odds-and-picks.sh > $PROJECT_DIR/logs/odds-update-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1" >> "$TEMP_CRON"
done

# Make sure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Install the new crontab
echo "Installing cron jobs to run at hours: $HOURS"
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# Display confirmation
echo "✅ Scheduled odds update jobs have been installed."
echo "Jobs will run at the following hours each day:"
for HOUR in ${HOURS//,/ }; do
    # Format the hour for display
    if (( HOUR < 12 )); then
        DISPLAY_HOUR="${HOUR} AM"
    elif (( HOUR == 12 )); then
        DISPLAY_HOUR="12 PM" 
    else
        DISPLAY_HOUR="$((HOUR - 12)) PM"
    fi
    echo "  - $DISPLAY_HOUR"
done

echo ""
echo "Log files will be saved to: $PROJECT_DIR/logs/"
echo "To view scheduled jobs, run: crontab -l"
echo "To remove all jobs, run: crontab -r" 