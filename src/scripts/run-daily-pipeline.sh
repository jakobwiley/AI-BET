#!/bin/bash

# Exit on error
set -e

echo "Starting daily sports data pipeline..."

# Step 1: Fetch today's games
echo "\n=== Fetching today's games ==="
node dist/scripts/fetch-todays-games.js

# Step 2: Fetch odds and lines
echo "\n=== Fetching odds and lines ==="
node dist/scripts/fetch-odds.js

# Step 3: Update team stats
echo "\n=== Updating team stats ==="
node dist/scripts/update-team-stats.js

# Step 4: Generate predictions
echo "\n=== Generating predictions ==="
node dist/scripts/calculate-todays-predictions.js

# Step 5: Send email report
echo "\n=== Sending daily report ==="
node dist/scripts/send-daily-report.js

echo "\nPipeline completed successfully!" 