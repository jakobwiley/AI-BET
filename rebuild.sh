#!/bin/bash

echo "🔄 Starting rebuild process..."

# Kill all Node and Next.js processes
echo "🔪 Killing existing Node/Next.js processes..."
pkill -f "node" || true
pkill -f "next" || true

# Wait a moment to ensure processes are killed
sleep 2

# Remove build and cache directories
echo "🧹 Cleaning build and cache directories..."
rm -rf .next || true
rm -rf node_modules || true
rm -rf .turbo || true

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Fresh install of dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "🏗️  Building project..."
npm run build

# Start the development server
echo "🚀 Starting development server on port 3000..."
PORT=3000 npm run dev 