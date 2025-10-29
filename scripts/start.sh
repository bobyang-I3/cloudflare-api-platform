#!/bin/bash

echo "🚀 Starting Cloudflare API Billing Platform..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    echo "${YELLOW}Port $1 is already in use. Killing process...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null
    sleep 2
}

# Check and kill if ports are in use
if check_port 8000; then
    kill_port 8000
fi

if check_port 5173; then
    kill_port 5173
fi

echo "${BLUE}═══════════════════════════════════════════${NC}"
echo "${BLUE}  Starting Backend Server (Port 8000)${NC}"
echo "${BLUE}═══════════════════════════════════════════${NC}"

# Start backend
cd "$SCRIPT_DIR/server"
if [ ! -d "venv" ]; then
    echo "${YELLOW}Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend in background
python main.py > /dev/null 2>&1 &
BACKEND_PID=$!
echo "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

echo "${BLUE}═══════════════════════════════════════════${NC}"
echo "${BLUE}  Starting Frontend Dev Server (Port 5173)${NC}"
echo "${BLUE}═══════════════════════════════════════════${NC}"

# Start frontend
cd "$SCRIPT_DIR/client"
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}Node modules not found. Installing...${NC}"
    npm install
fi

# Start frontend in background
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
sleep 3

echo "${GREEN}═══════════════════════════════════════════${NC}"
echo "${GREEN}  🎉 Platform is ready!${NC}"
echo "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "  ${BLUE}Frontend:${NC}  http://localhost:5173"
echo "  ${BLUE}Backend:${NC}   http://localhost:8000"
echo "  ${BLUE}API Docs:${NC}  http://localhost:8000/docs"
echo ""
echo "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Open browser (optional, comment out if not desired)
sleep 2
if command -v open &> /dev/null; then
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
fi

# Keep script running
wait

