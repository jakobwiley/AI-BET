#!/bin/bash

# Exit on error
set -e

# Default email recipient
DEFAULT_EMAIL="jakobwiley@gmail.com"

echo "🔍 Starting daily picks generation..."

# Kill any existing Node.js processes (optional, uncomment if needed)
# echo "📌 Cleaning up existing processes..."
# pkill -f "next" || true
# pkill -f "node" || true
# sleep 2

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
node daily-picks.js

# Convert to PDF
echo "📄 Creating PDF version of picks..."
node convert-picks-to-pdf.js

# Display the results
echo "📊 Today's picks:"
echo "===================="
cat todays-picks.txt

# Get email recipient - use command line argument, or default to jakobwiley@gmail.com
EMAIL_RECIPIENT="${1:-$DEFAULT_EMAIL}"

# Send email
echo "📧 Sending email to $EMAIL_RECIPIENT..."
node send-picks-email.js "$EMAIL_RECIPIENT"
echo "📧 Email sent!"

echo ""
echo "✅ Done! You can find the picks in:"
echo "  - Text file: todays-picks.txt"
echo "  - PDF file: todays-picks.pdf"
echo "🛑 The development server is running in the background. To stop it, run: pkill -f next" 