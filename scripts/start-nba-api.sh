#!/bin/bash

# Shell script to start the nba_api service

# Ensure we're in the right directory
cd "$(dirname "$0")/nba_api"

# Check if we're using Docker
if command -v docker &> /dev/null; then
    echo "Building and starting nba_api service with Docker..."
    docker build -t nba-api-service .
    docker run -d -p 5000:5000 --name nba-api-service nba-api-service
    echo "NBA API service is running on http://localhost:5000"
    exit 0
fi

# If Docker isn't available, try to run directly
echo "Docker not found, attempting to run Python service directly..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt

# Start the service
echo "Starting NBA API service..."
python server.py &

echo "NBA API service is running on http://localhost:5000" 