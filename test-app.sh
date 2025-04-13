#!/bin/bash

# Exit on error
set -e

echo "🔍 Starting application test..."

# Kill any existing Node.js processes
echo "📌 Cleaning up existing processes..."
killall node 2>/dev/null || true
pkill -f "next" || true
pkill -f "node" || true
sleep 2

# Apply database fixes
echo "🛠️ Running database fix script..."
npx ts-node scripts/fix-confidence-values.ts

# Build and run the application
echo "🏗️ Starting the Next.js development server..."
npm run dev &
sleep 5  # Give the server time to start

# Print some logs to confirm everything is working
echo "📊 Testing API endpoints..."
echo "Testing games endpoint:"
curl -s "http://localhost:3000/api/games?sport=MLB" | grep -o '"id":"[^"]*"' | head -3
echo ""
echo "Testing a specific game endpoint:"
GAME_ID=$(curl -s "http://localhost:3000/api/games?sport=MLB" | grep -o '"id":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
echo "Game ID: $GAME_ID"
if [ -n "$GAME_ID" ]; then
  curl -s "http://localhost:3000/api/games/$GAME_ID" | grep -o '"confidence":[^,]*' | head -3
fi

echo "✅ Test complete! The application is running at http://localhost:3000"
echo "📝 The development server is running in the background."
echo "🛑 To stop the server, run: pkill -f 'next' || pkill -f 'node'" 