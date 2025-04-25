#!/bin/bash

# Exit on error
set -e

# Default email recipient
DEFAULT_EMAIL="jakobwiley@gmail.com"

echo "🔍 Starting daily picks generation..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Start the development server if it's not already running
if ! curl -s http://localhost:3000/api/games > /dev/null; then
  echo "🏗️ Starting the Next.js development server..."
  npm run dev &
  sleep 10  # Give the server time to start
else
  echo "✅ Server is already running"
fi

# Generate today's picks
echo "🎮 Generating today's game predictions..."
node scripts/get-todays-picks.js

# Display the results
echo "📊 Today's picks:"
echo "===================="
cat todays-picks.txt

echo ""
echo "✅ Done! You can find the picks in todays-picks.txt"
echo "🛑 The development server is running in the background. To stop it, run: pkill -f next" 