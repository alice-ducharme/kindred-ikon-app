#!/bin/bash

# Script to start the React frontend

echo "Starting Ski Home Finder Frontend..."
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies..."
    npm install
fi

# Start the Vite dev server
echo "Starting Vite dev server..."
npm run dev

