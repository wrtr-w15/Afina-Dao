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

# Frontend dependencies (main app - includes API routes)
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
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
echo "🎯 Starting development server..."
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down server..."
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start frontend (Next.js with API routes)
echo "🎨 Starting Next.js server (http://localhost:3000)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Development server started!"
echo ""
echo "🌐 App: http://localhost:3000"
echo "🔧 API: http://localhost:3000/api"
echo "👤 Admin: http://localhost:3000/admin"
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for process
wait $FRONTEND_PID
