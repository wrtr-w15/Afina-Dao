#!/bin/bash

# Afina DAO Wiki - Development Startup Script

echo "🚀 Starting Afina DAO Wiki Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install dependencies if node_modules doesn't exist
echo ""
echo "📦 Installing dependencies..."

# Backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "✅ Dependencies installed"

# Check if MySQL is running (optional)
echo ""
echo "🔍 Checking MySQL connection..."
if command -v mysql &> /dev/null; then
    if mysql -u afina_user -pafina_password -e "SELECT 1;" 2>/dev/null; then
        echo "✅ MySQL is running and accessible"
    else
        echo "⚠️  MySQL is not accessible. Please start MySQL and create the database:"
        echo "   CREATE DATABASE afina_dao_wiki;"
        echo "   CREATE USER 'afina_user'@'localhost' IDENTIFIED BY 'afina_password';"
        echo "   GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'afina_user'@'localhost';"
        echo "   FLUSH PRIVILEGES;"
    fi
else
    echo "⚠️  MySQL client not found. Please install MySQL and create the database."
fi

echo ""
echo "🎯 Starting development servers..."
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server (http://localhost:3001)..."
cd backend && npm run start:dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server (http://localhost:3000)..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development servers started!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "📚 API Documentation: http://localhost:3001/api/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
