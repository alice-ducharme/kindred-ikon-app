#!/bin/bash

# Quick restart script for Kindred-Ikon project
# Usage: ./restart.sh

cd "$(dirname "$0")"

echo "🛑 Stopping all servers..."
pkill -9 -f backend_api 2>/dev/null
pkill -9 -f vite 2>/dev/null
sleep 2

echo "🚀 Starting backend..."
./start-backend.sh > /tmp/backend.log 2>&1 &
sleep 3

echo "🚀 Starting frontend..."
./start-frontend.sh > /tmp/frontend.log 2>&1 &
sleep 5

echo ""
echo "✅ Restart complete!"
echo ""
echo "📊 Servers running:"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:8080"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""

# Show process count
PROCESS_COUNT=$(ps aux | grep -E "(backend_api|vite)" | grep -v grep | wc -l | tr -d ' ')
echo "🔧 Running processes: $PROCESS_COUNT"

