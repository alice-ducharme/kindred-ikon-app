#!/bin/bash

# Script to start the Flask backend

echo "Starting Kindred-Ikon Backend..."
cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "ikon_kindred_env" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv ikon_kindred_env
fi

# Activate virtual environment
source ikon_kindred_env/bin/activate

# Check if dependencies are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found!"
    echo "Please create a .env file based on .env.example"
    echo "You can run the app without all keys, but some features may not work."
fi

# Start the Flask server
echo "Starting Flask API on http://localhost:5000"
python backend_api.py

