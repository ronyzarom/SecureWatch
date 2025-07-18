#!/bin/bash

# 🚀 SecureWatch - Start Application Script
# This script starts both backend and frontend with comprehensive status information

echo "🚀 Starting SecureWatch Application..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for a service to start
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to start on port $port...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo ""
    echo -e "${RED}❌ $service_name failed to start within 30 seconds${NC}"
    return 1
}

# Function to show system information
show_system_info() {
    echo -e "${PURPLE}📋 System Information${NC}"
    echo "=================================================="
    echo -e "${CYAN}🖥️  OS:${NC} $(uname -s) $(uname -r)"
    echo -e "${CYAN}📦 Node.js:${NC} $(node --version 2>/dev/null || echo 'Not found')"
    echo -e "${CYAN}📦 npm:${NC} $(npm --version 2>/dev/null || echo 'Not found')"
    echo -e "${CYAN}🐘 PostgreSQL:${NC} $(psql --version 2>/dev/null | head -1 || echo 'Not found/not in PATH')"
    echo ""
}

# Function to show database connection info
show_db_info() {
    echo -e "${PURPLE}🗄️  Database Configuration${NC}"
    echo "=================================================="
    
    # Check if DATABASE_URL is set (common in Render/Heroku)
    if [ -n "$DATABASE_URL" ]; then
        echo -e "${GREEN}✅ Using DATABASE_URL from environment${NC}"
        echo -e "${CYAN}🔗 Connection:${NC} ${DATABASE_URL:0:30}..." # Show first 30 chars
        
        # Test database connection using DATABASE_URL
        echo -e "${YELLOW}🔍 Testing database connection...${NC}"
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            echo -e "${YELLOW}⚠️  Check DATABASE_URL and ensure database is accessible${NC}"
        fi
        
    elif [ -f "backend/.env" ]; then
        echo -e "${CYAN}📁 Configuration file:${NC} backend/.env"
        
        # Read database configuration from .env file
        DB_HOST=$(grep "^DB_HOST=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo "localhost")
        DB_PORT=$(grep "^DB_PORT=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo "5432")
        DB_NAME=$(grep "^DB_NAME=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo "securewatch")
        DB_USER=$(grep "^DB_USER=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo "postgres")
        
        echo -e "${CYAN}🌐 Host:${NC} $DB_HOST"
        echo -e "${CYAN}🔌 Port:${NC} $DB_PORT"
        echo -e "${CYAN}📊 Database:${NC} $DB_NAME"
        echo -e "${CYAN}👤 User:${NC} $DB_USER"
        
        # Test database connection
        echo -e "${YELLOW}🔍 Testing database connection...${NC}"
        if PGPASSWORD="$(grep "^DB_PASSWORD=" backend/.env 2>/dev/null | cut -d '=' -f2 | tr -d '"')" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            echo -e "${YELLOW}⚠️  Make sure PostgreSQL is running and credentials are correct${NC}"
        fi
        
    elif [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        echo -e "${GREEN}✅ Using individual DB environment variables${NC}"
        echo -e "${CYAN}🌐 Host:${NC} ${DB_HOST:-localhost}"
        echo -e "${CYAN}🔌 Port:${NC} ${DB_PORT:-5432}"
        echo -e "${CYAN}📊 Database:${NC} ${DB_NAME:-securewatch}"
        echo -e "${CYAN}👤 User:${NC} ${DB_USER:-postgres}"
        
        # Test database connection
        echo -e "${YELLOW}🔍 Testing database connection...${NC}"
        if PGPASSWORD="$DB_PASSWORD" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-securewatch}" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            echo -e "${YELLOW}⚠️  Check database environment variables and ensure database is accessible${NC}"
        fi
        
    else
        echo -e "${RED}❌ No database configuration found${NC}"
        echo -e "${YELLOW}💡 Options:${NC}"
        echo -e "${YELLOW}   1. Set DATABASE_URL environment variable (Render/Heroku)${NC}"
        echo -e "${YELLOW}   2. Set individual DB_* environment variables${NC}"
        echo -e "${YELLOW}   3. Create backend/.env file from backend/.env.example${NC}"
    fi
    echo ""
}

# Function to validate environment variables
validate_environment() {
    echo -e "${PURPLE}🔧 Environment Validation${NC}"
    echo "=================================================="
    
    local missing_vars=()
    local warnings=()
    
    # Check database configuration
    if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ] && [ ! -f "backend/.env" ]; then
        missing_vars+=("Database configuration (DATABASE_URL or DB_* vars or backend/.env)")
    fi
    
    # Check security variables
    if [ -z "$SESSION_SECRET" ]; then
        warnings+=("SESSION_SECRET not set - using default (insecure)")
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        warnings+=("JWT_SECRET not set - using default (insecure)")
    fi
    
    # Check AI configuration
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        warnings+=("OPENAI_API_KEY not set - AI features will be disabled")
    fi
    
    # Check production settings
    if [ "$NODE_ENV" = "production" ]; then
        if [ -z "$FRONTEND_URL" ]; then
            warnings+=("FRONTEND_URL not set for production - CORS may fail")
        fi
    fi
    
    # Display results
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All required environment variables are configured${NC}"
    else
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}   • $var${NC}"
        done
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Warnings:${NC}"
        for warning in "${warnings[@]}"; do
            echo -e "${YELLOW}   • $warning${NC}"
        done
    fi
    
    echo ""
    return ${#missing_vars[@]}
}

# Function to show port status
show_port_status() {
    echo -e "${PURPLE}🔌 Port Status Check${NC}"
    echo "=================================================="
    
    # Check backend port
    if check_port 3001; then
        echo -e "${RED}❌ Port 3001 (Backend): IN USE${NC}"
        echo -e "${YELLOW}🔍 Process details:${NC}"
        lsof -i:3001 | head -2
    else
        echo -e "${GREEN}✅ Port 3001 (Backend): FREE${NC}"
    fi
    
    # Check frontend ports
    if check_port 5173; then
        echo -e "${RED}❌ Port 5173 (Frontend): IN USE${NC}"
        echo -e "${YELLOW}🔍 Process details:${NC}"
        lsof -i:5173 | head -2
    else
        echo -e "${GREEN}✅ Port 5173 (Frontend): FREE${NC}"
    fi
    
    if check_port 5174; then
        echo -e "${RED}❌ Port 5174 (Frontend Alt): IN USE${NC}"
        echo -e "${YELLOW}🔍 Process details:${NC}"
        lsof -i:5174 | head -2
    else
        echo -e "${GREEN}✅ Port 5174 (Frontend Alt): FREE${NC}"
    fi
    echo ""
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}🎯 Starting Backend Services...${NC}"
    echo "=================================================="
    
    if [ ! -d "backend" ]; then
        echo -e "${RED}❌ Backend directory not found${NC}"
        return 1
    fi
    
    if [ ! -f "backend/package.json" ]; then
        echo -e "${RED}❌ Backend package.json not found${NC}"
        return 1
    fi
    
    if [ ! -f "backend/server.js" ]; then
        echo -e "${RED}❌ Backend server.js not found${NC}"
        return 1
    fi
    
    # Check if backend dependencies are installed
    if [ ! -d "backend/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        cd backend && npm install && cd ..
    fi
    
    echo -e "${CYAN}🚀 Starting backend server...${NC}"
    cd backend && npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    echo -e "${GREEN}✅ Backend started with PID: $BACKEND_PID${NC}"
    
    # Wait for backend to start
    if wait_for_service 3001 "Backend API"; then
        echo -e "${GREEN}🌐 Backend API URL: http://localhost:3001${NC}"
        echo -e "${GREEN}🏥 Health Check: http://localhost:3001/health${NC}"
        echo -e "${GREEN}📚 API Docs: http://localhost:3001/api-docs${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo -e "${YELLOW}📋 Checking backend logs...${NC}"
        tail -10 backend.log
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo ""
    echo -e "${BLUE}🎯 Starting Frontend Services...${NC}"
    echo "=================================================="
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Frontend package.json not found${NC}"
        return 1
    fi
    
    # Check if frontend dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm install
    fi
    
    echo -e "${CYAN}🚀 Starting frontend development server...${NC}"
    npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo -e "${GREEN}✅ Frontend started with PID: $FRONTEND_PID${NC}"
    
    # Wait for frontend to start (check both possible ports)
    sleep 3
    
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend is running on port 5173${NC}"
        echo -e "${GREEN}🌐 Frontend URL: http://localhost:5173${NC}"
    elif check_port 5174; then
        echo -e "${GREEN}✅ Frontend is running on port 5174${NC}"
        echo -e "${GREEN}🌐 Frontend URL: http://localhost:5174${NC}"
    else
        echo -e "${YELLOW}⏳ Frontend is still starting... Check logs:${NC}"
        tail -5 frontend.log
    fi
}

# Function to show final status
show_final_status() {
    echo ""
    echo -e "${PURPLE}🎉 SecureWatch Application Status${NC}"
    echo "=================================================="
    
    # Check services
    if check_port 3001; then
        echo -e "${GREEN}✅ Backend API: Running on http://localhost:3001${NC}"
    else
        echo -e "${RED}❌ Backend API: Not running${NC}"
    fi
    
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend: Running on http://localhost:5173${NC}"
    elif check_port 5174; then
        echo -e "${GREEN}✅ Frontend: Running on http://localhost:5174${NC}"
    else
        echo -e "${RED}❌ Frontend: Not running${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}📖 Useful URLs:${NC}"
    echo -e "${CYAN}   • Frontend App: ${NC}http://localhost:5173 (or 5174)"
    echo -e "${CYAN}   • Backend API: ${NC}http://localhost:3001"
    echo -e "${CYAN}   • Health Check: ${NC}http://localhost:3001/health"
    echo -e "${CYAN}   • API Documentation: ${NC}http://localhost:3001/api-docs"
    
    echo ""
    echo -e "${CYAN}🧪 Test Accounts:${NC}"
    echo -e "${CYAN}   • Admin: ${NC}admin@company.com / admin123"
    echo -e "${CYAN}   • Analyst: ${NC}analyst@company.com / analyst123"
    echo -e "${CYAN}   • Viewer: ${NC}viewer@company.com / viewer123"
    
    echo ""
    echo -e "${CYAN}📜 Log Files:${NC}"
    echo -e "${CYAN}   • Backend: ${NC}tail -f backend.log"
    echo -e "${CYAN}   • Frontend: ${NC}tail -f frontend.log"
    
    echo ""
    echo -e "${YELLOW}🛑 To stop the application: ${NC}./kill-app.sh"
    echo "=================================================="
}

# Main execution
show_system_info
validate_environment
show_db_info
show_port_status

# Exit if critical environment variables are missing
if ! validate_environment >/dev/null 2>&1; then
    echo -e "${RED}❌ Critical environment variables missing. Please configure them before starting.${NC}"
    exit 1
fi

# Check if ports are already in use
if check_port 3001; then
    echo -e "${RED}⚠️  Backend port 3001 is already in use!${NC}"
    echo -e "${YELLOW}💡 Run ./kill-app.sh first to clean up${NC}"
    exit 1
fi

# Start services
if start_backend; then
    start_frontend
else
    echo -e "${RED}❌ Failed to start backend. Aborting.${NC}"
    exit 1
fi

# Show final status
show_final_status 