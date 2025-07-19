#!/bin/bash

# Production start script for Render
# Starts only the backend which serves both API and frontend

set -e  # Exit on any error

echo "🚀 Starting SecureWatch in Production Mode..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Show system information
echo -e "${PURPLE}📋 System Information${NC}"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Environment: ${NODE_ENV:-development}"
echo ""

# Environment validation
echo -e "${PURPLE}🔧 Environment Validation${NC}"
echo "=============================================="

# Required for production
missing_vars=()
warnings=()

if [ -z "$DATABASE_URL" ]; then
    missing_vars+=("DATABASE_URL")
fi

if [ -z "$SESSION_SECRET" ]; then
    warnings+=("SESSION_SECRET not set - using default (insecure)")
fi

if [ -z "$JWT_SECRET" ]; then
    warnings+=("JWT_SECRET not set - using default (insecure)")
fi

if [ -z "$OPENAI_API_KEY" ]; then
    warnings+=("OPENAI_API_KEY not set - AI features will be disabled")
fi

# Display results
if [ ${#missing_vars[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are configured${NC}"
else
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "${RED}   • $var${NC}"
    done
    echo ""
    echo -e "${RED}❌ Cannot start in production without required variables${NC}"
    exit 1
fi

if [ ${#warnings[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings:${NC}"
    for warning in "${warnings[@]}"; do
        echo -e "${YELLOW}   • $warning${NC}"
    done
fi
echo ""

# Check if frontend build exists
echo -e "${PURPLE}🌐 Frontend Build Verification${NC}"
echo "=============================================="
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend build directory found${NC}"
    echo "Build files:"
    ls -la dist/ | head -10
else
    echo -e "${RED}❌ Frontend build directory (dist/) not found!${NC}"
    echo -e "${YELLOW}💡 Make sure you ran the build process before starting${NC}"
    exit 1
fi
echo ""

# Start the backend server
echo -e "${PURPLE}🎯 Starting Backend Server...${NC}"
echo "=============================================="

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Check port availability
PORT=${PORT:-3001}
if check_port $PORT; then
    echo -e "${RED}❌ Port $PORT is already in use!${NC}"
    echo -e "${YELLOW}💡 Please free up the port or use a different PORT environment variable${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Port $PORT is available${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Starting SecureWatch Backend + Frontend Server...${NC}"
echo -e "${CYAN}🌐 Server will be available at: http://0.0.0.0:$PORT${NC}"
echo -e "${CYAN}📊 API Documentation: http://0.0.0.0:$PORT/api-docs${NC}"
echo -e "${CYAN}🔗 Health Check: http://0.0.0.0:$PORT/health${NC}"
echo ""

# Start the server
node server.js 