#!/bin/bash

# Afina DAO Wiki - Production Startup Script
# This script installs dependencies, builds the project, and starts it with PM2

# Exit on error (but allow some commands to fail)
set -e

echo "🚀 Starting Afina DAO Wiki Production Deployment"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 22+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d'.' -f1)
REQUIRED_VERSION=22
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $REQUIRED_VERSION+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"
print_success "npm version: $(npm -v)"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing PM2 globally..."
    if npm install -g pm2; then
        print_success "PM2 installed successfully"
        # Verify installation
        if ! command -v pm2 &> /dev/null; then
            print_error "PM2 installation failed. Please install it manually: npm install -g pm2"
            print_info "You may need to run: npm install -g pm2 --unsafe-perm"
            exit 1
        fi
    else
        print_error "Failed to install PM2. Please install it manually: npm install -g pm2"
        print_info "You may need to run: npm install -g pm2 --unsafe-perm"
        exit 1
    fi
else
    PM2_VERSION=$(pm2 -v 2>/dev/null || echo "unknown")
    print_success "PM2 is installed: $PM2_VERSION"
fi

# Check if .env.local exists, create from .env.example if not
if [ ! -f "frontend/.env.local" ]; then
    print_warning ".env.local file not found in frontend directory"
    
    if [ -f "frontend/.env.example" ]; then
        print_info "Creating .env.local from .env.example template..."
        cp frontend/.env.example frontend/.env.local
        print_success ".env.local created from template"
        print_warning "IMPORTANT: Please edit frontend/.env.local and fill in all required values!"
        echo ""
        print_info "Required variables to configure:"
        echo "  - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
        echo "  - ADMIN_PASSWORD"
        echo "  - ADMIN_SESSION_SECRET (min 32 characters)"
        echo "  - TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID"
        echo "  - PORT (optional, default: 3000)"
        echo ""
        read -p "Press Enter after you've configured frontend/.env.local, or Ctrl+C to cancel..." -r
        echo
    else
        print_error ".env.example file not found. Cannot create .env.local automatically."
        print_info "Please create frontend/.env.local manually with required environment variables"
        exit 1
    fi
else
    print_success ".env.local file found"
fi

# Step 1: Clean previous builds
echo ""
print_info "Step 1: Cleaning previous builds..."
if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next
fi
if [ -d "frontend/node_modules/.cache" ]; then
    rm -rf frontend/node_modules/.cache
fi
print_success "Cleaned previous builds"

# Step 2: Install dependencies
echo ""
print_info "Step 2: Installing dependencies..."

# Root dependencies
print_info "Installing root dependencies..."
if ! npm install; then
    print_error "Failed to install root dependencies"
    exit 1
fi

# Frontend dependencies
print_info "Installing frontend dependencies..."
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found!"
    exit 1
fi

cd frontend || exit 1
if ! npm install --production=false; then
    print_error "Failed to install frontend dependencies"
    cd ..
    exit 1
fi
cd .. || exit 1

print_success "Dependencies installed"

# Step 3: Build the project
echo ""
print_info "Step 3: Building the project..."

cd frontend || exit 1
print_info "Building Next.js application..."
if ! npm run build; then
    print_error "Build failed. Please check the errors above."
    cd ..
    exit 1
fi
cd .. || exit 1
print_success "Project built successfully"

# Step 4: Create logs directory
echo ""
print_info "Step 4: Creating logs directory..."
mkdir -p logs
print_success "Logs directory created"

# Step 5: Stop existing application process (if exists)
echo ""
print_info "Step 5: Checking for existing application process..."
if pm2 list 2>/dev/null | grep -q "afina-dao-frontend"; then
    print_info "Stopping existing afina-dao-frontend process..."
    pm2 stop afina-dao-frontend 2>/dev/null || true
    pm2 delete afina-dao-frontend 2>/dev/null || true
    sleep 1  # Wait a moment for process to fully stop
    print_success "Existing process stopped"
else
    print_info "No existing afina-dao-frontend process found"
fi

# Step 6: Start with PM2
echo ""
print_info "Step 6: Starting application with PM2..."
if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found!"
    exit 1
fi

if ! pm2 start ecosystem.config.js; then
    print_error "Failed to start application with PM2"
    print_info "Check PM2 logs: pm2 logs"
    exit 1
fi

print_success "Application started with PM2"

# Step 7: Save PM2 configuration
echo ""
print_info "Step 7: Saving PM2 configuration..."
if pm2 save; then
    print_success "PM2 configuration saved"
else
    print_warning "Failed to save PM2 configuration (may require setup)"
    print_info "You can save it later manually with: pm2 save"
fi

# Step 8: Setup PM2 startup script (optional)
echo ""
read -p "Setup PM2 to start on system boot? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setting up PM2 startup script..."
    pm2 startup
    print_info "Please run the command shown above as root/sudo"
fi

# Final status
echo ""
echo "================================================="
print_success "Deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status 2>/dev/null || print_warning "Could not get PM2 status (PM2 daemon may not be running)"
echo ""
echo "📝 Useful PM2 commands:"
echo "   pm2 logs afina-dao-frontend    - View logs"
echo "   pm2 monit                      - Monitor application"
echo "   pm2 restart afina-dao-frontend - Restart application"
echo "   pm2 stop afina-dao-frontend    - Stop application"
echo "   pm2 delete afina-dao-frontend  - Delete application from PM2"
echo ""
# Получаем порт из .env.local
PORT=$(grep "^PORT=" frontend/.env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ' || echo "3000")
if [ -z "$PORT" ]; then
    PORT=3000
fi

print_info "Application is running on http://localhost:${PORT}"
echo ""

# Wait a moment and verify the process is running
sleep 2
if pm2 list 2>/dev/null | grep -q "afina-dao-frontend.*online"; then
    print_success "✓ Application is running successfully"
elif pm2 list 2>/dev/null | grep -q "afina-dao-frontend"; then
    print_warning "⚠ Application process exists but may not be online. Check logs: pm2 logs afina-dao-frontend"
else
    print_warning "⚠ Could not verify application status. Check manually: pm2 list"
fi

# Step 9: Setup Telegram Webhook
echo ""
print_info "Step 9: Setting up Telegram Webhook..."
# Wait a moment for server to be ready
sleep 3

# Function to read value from .env.local
read_env_value() {
    local key="$1"
    local file="frontend/.env.local"
    if [ -f "$file" ]; then
        # Get the line, remove key and =, trim quotes and spaces
        grep "^${key}=" "$file" 2>/dev/null | sed "s/^${key}=//" | sed 's/^["'\'']*//' | sed 's/["'\'']*$//' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' || echo ""
    fi
}

# Get values from .env.local
BOT_TOKEN=$(read_env_value "TELEGRAM_BOT_TOKEN")
SERVER_URL=$(read_env_value "NEXT_PUBLIC_API_URL")

# Check if required values are set
if [ -z "$BOT_TOKEN" ]; then
    print_warning "TELEGRAM_BOT_TOKEN not found in frontend/.env.local - skipping webhook setup"
elif [ -z "$SERVER_URL" ]; then
    print_warning "NEXT_PUBLIC_API_URL not found in frontend/.env.local - skipping webhook setup"
    print_info "Set NEXT_PUBLIC_API_URL to your public server URL (e.g., https://yourdomain.com)"
else
    # Remove trailing slash if present
    SERVER_URL="${SERVER_URL%/}"
    WEBHOOK_URL="${SERVER_URL}/api/telegram/webhook"
    
    print_info "Configuring webhook..."
    print_info "  Bot Token: ${BOT_TOKEN:0:20}..."
    print_info "  Server URL: ${SERVER_URL}"
    print_info "  Webhook URL: ${WEBHOOK_URL}"
    
    # Check if server is accessible
    print_info "Checking server accessibility..."
    if curl -s -f --max-time 5 "${SERVER_URL}" > /dev/null 2>&1; then
        print_success "Server is accessible"
    else
        print_warning "Server may not be accessible yet (this is OK if it's starting up)"
    fi
    
    # Delete old webhook
    print_info "Removing old webhook (if exists)..."
    DELETE_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" --max-time 10)
    DELETE_OK=$(echo "$DELETE_RESPONSE" | grep -o '"ok":true' || echo "")
    if [ -n "$DELETE_OK" ]; then
        print_success "Old webhook removed"
    else
        print_info "No old webhook to remove (or already removed)"
    fi
    
    # Set new webhook
    print_info "Setting new webhook..."
    SET_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"${WEBHOOK_URL}\",\"allowed_updates\":[\"callback_query\"]}" \
        --max-time 10)
    
    SET_OK=$(echo "$SET_RESPONSE" | grep -o '"ok":true' || echo "")
    SET_ERROR=$(echo "$SET_RESPONSE" | grep -o '"description":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$SET_OK" ]; then
        print_success "✅ Telegram webhook configured successfully!"
        
        # Get webhook info
        print_info "Verifying webhook configuration..."
        INFO_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" --max-time 10)
        INFO_OK=$(echo "$INFO_RESPONSE" | grep -o '"ok":true' || echo "")
        
        if [ -n "$INFO_OK" ]; then
            WEBHOOK_URL_SET=$(echo "$INFO_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")
            PENDING_COUNT=$(echo "$INFO_RESPONSE" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2 || echo "0")
            LAST_ERROR=$(echo "$INFO_RESPONSE" | grep -o '"last_error_message":"[^"]*"' | cut -d'"' -f4 || echo "none")
            
            print_success "Webhook URL: ${WEBHOOK_URL_SET}"
            if [ "$PENDING_COUNT" -gt 0 ]; then
                print_warning "Pending updates: ${PENDING_COUNT}"
            fi
            if [ "$LAST_ERROR" != "none" ] && [ -n "$LAST_ERROR" ]; then
                print_warning "Last error: ${LAST_ERROR}"
            fi
        fi
    else
        print_error "Failed to set webhook"
        if [ -n "$SET_ERROR" ]; then
            print_error "Error: ${SET_ERROR}"
        else
            print_error "Response: ${SET_RESPONSE}"
        fi
        print_info "You can set it manually later using: ./setup-telegram-webhook.sh ${SERVER_URL}"
    fi
fi

echo ""
