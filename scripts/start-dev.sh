#!/bin/bash
# Development startup script

echo "🚀 Starting Cloudflare API Billing Platform..."
echo ""

# Check if server venv exists
if [ ! -d "server/venv" ]; then
    echo "❌ Backend virtual environment not found. Run setup first:"
    echo "   cd server && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "client/node_modules" ]; then
    echo "❌ Frontend dependencies not installed. Run setup first:"
    echo "   cd client && npm install"
    exit 1
fi

# Start backend
echo "📦 Starting backend server..."
cd server
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend development server..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Services started!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Trap to kill both processes on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Wait for processes
wait

