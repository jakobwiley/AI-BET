#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting rebuild process..."

# Clean up
echo "🧹 Cleaning up..."
rm -rf .next
rm -rf node_modules
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
sleep 5  # Wait for the server to start
node scripts/fetch-initial-data.js &

echo "✅ Rebuild complete! The application is now running."
echo "📝 Note: The development server is running in the background."
echo "🛑 To stop the server, use Ctrl+C" 