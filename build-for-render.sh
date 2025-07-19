#!/bin/bash

# Build script for Render deployment
# This script builds the frontend and backend for production

set -e  # Exit on any error

echo "🚀 Starting SecureWatch Build for Render..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}📋 System Information${NC}"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Working directory: $(pwd)"
echo ""

# Step 1: Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# Step 2: Build frontend for production
echo -e "${BLUE}🏗️  Building frontend for production...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 3: Verify build output
echo -e "${BLUE}🔍 Verifying build output...${NC}"
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ dist/ directory exists${NC}"
    echo "Contents of dist/:"
    ls -la dist/
else
    echo -e "${RED}❌ dist/ directory not found!${NC}"
    exit 1
fi
echo ""

# Step 4: Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
cd ..
echo ""

# Step 5: Copy environment files if needed
echo -e "${BLUE}📁 Preparing backend configuration...${NC}"
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    echo -e "${YELLOW}⚠️  No .env file found, creating from .env.example${NC}"
    cp backend/.env.example backend/.env
fi
echo -e "${GREEN}✅ Backend configuration ready${NC}"
echo ""

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo "=============================================="
echo -e "${CYAN}📁 Frontend built to: ./dist/${NC}"
echo -e "${CYAN}🚀 Backend ready in: ./backend/${NC}"
echo -e "${CYAN}🌐 Ready for production deployment${NC}"
echo "" 