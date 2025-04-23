#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting rebuild process..."

# Kill any existing Node.js processes that might be using the ports
echo "📌 Killing any existing Node.js processes..."
killall node 2>/dev/null || true

# Kill any existing Next.js processes
echo "🔪 Killing existing Next.js processes..."
pkill -f "next" || true
pkill -f "node" || true
sleep 2  # Give processes time to die

# Clean up
echo "🧹 Cleaning up..."
rm -rf .next
rm -rf node_modules
rm -rf .turbo
rm -rf .cache
rm -rf dist
rm -rf .swc
rm -rf tsconfig.tsbuildinfo

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Install and initialize Tailwind CSS
echo "📦 Installing and initializing Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer --legacy-peer-deps
npx tailwindcss init -p

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build CSS
echo "🎨 Building CSS..."
npm run build:css

# Build the application
echo "🏗️ Building the application..."
npm run build

# Start the development server and fetch initial data
echo "🚀 Starting development server and fetching initial data..."
npm run dev &
npx ts-node scripts/fetch-initial-data.ts

echo "✅ Rebuild complete! The application is now running."
echo "📝 Note: The development server is running in the background."
echo "🛑 To stop the server, use Ctrl+C" 