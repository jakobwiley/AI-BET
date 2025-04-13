#!/bin/bash

# Exit on error
set -e

# Navigate to project directory
cd "$(dirname "$0")"

echo "🔄 Starting odds update and picks generation process..."

# Load API key from .env file directly
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep THE_ODDS_API_KEY | xargs)
fi

# Check if THE_ODDS_API_KEY is set
if [ -z "$THE_ODDS_API_KEY" ]; then
  echo "❌ ERROR: THE_ODDS_API_KEY environment variable is not set."
  echo "Please add it to your .env file or export it in your shell."
  exit 1
fi

# Step 1: Fetch fresh odds data
echo "📊 Fetching fresh odds data..."
./scripts/fetch-odds.js
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Failed to fetch odds data. Check your API key and network connection."
  exit 1
fi

# Give the database a moment to process the updates
sleep 2

# Step 2: Generate daily picks with the updated odds
echo "🎲 Generating daily picks with updated odds..."
./get-todays-picks.sh

echo "✅ Process completed successfully!"
echo "📝 You can find your picks in todays-picks.txt"
echo "📧 An email with your picks has been sent to the configured address." 