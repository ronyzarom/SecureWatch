#!/bin/bash

# 🛑 SecureWatch - Kill All Processes Script
# This script kills all running SecureWatch processes and frees up ports

echo "🛑 Stopping SecureWatch Application..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${BLUE}🔍 Checking port $port ($service_name)...${NC}"
    
    # Find processes using the port
    PIDS=$(lsof -ti:$port 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo -e "${GREEN}✅ Port $port is already free${NC}"
    else
        echo -e "${YELLOW}⚠️  Found processes on port $port: $PIDS${NC}"
        
        # Kill the processes
        for PID in $PIDS; do
            echo -e "${YELLOW}🔫 Killing process $PID...${NC}"
            kill -9 $PID 2>/dev/null
            
            # Verify the process was killed
            if kill -0 $PID 2>/dev/null; then
                echo -e "${RED}❌ Failed to kill process $PID${NC}"
            else
                echo -e "${GREEN}✅ Successfully killed process $PID${NC}"
            fi
        done
        
        # Double-check the port is free
        sleep 1
        if lsof -ti:$port >/dev/null 2>&1; then
            echo -e "${RED}❌ Port $port is still in use${NC}"
        else
            echo -e "${GREEN}✅ Port $port is now free${NC}"
        fi
    fi
    echo ""
}

# Function to kill processes by name pattern
kill_by_pattern() {
    local pattern=$1
    local service_name=$2
    
    echo -e "${BLUE}🔍 Looking for $service_name processes...${NC}"
    
    # Find processes matching the pattern
    PIDS=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo -e "${GREEN}✅ No $service_name processes found${NC}"
    else
        echo -e "${YELLOW}⚠️  Found $service_name processes: $PIDS${NC}"
        
        # Kill the processes
        pkill -f "$pattern" 2>/dev/null
        sleep 1
        
        # Verify processes were killed
        REMAINING=$(pgrep -f "$pattern" 2>/dev/null)
        if [ -z "$REMAINING" ]; then
            echo -e "${GREEN}✅ Successfully stopped all $service_name processes${NC}"
        else
            echo -e "${RED}❌ Some $service_name processes still running: $REMAINING${NC}"
            echo -e "${YELLOW}🔫 Force killing remaining processes...${NC}"
            pkill -9 -f "$pattern" 2>/dev/null
        fi
    fi
    echo ""
}

# Kill backend processes (Node.js server)
echo -e "${BLUE}🎯 Stopping Backend Services...${NC}"
kill_port 3001 "Backend API"
kill_by_pattern "node.*server.js" "Node.js Backend"
kill_by_pattern "nodemon.*server.js" "Nodemon Backend"

# Kill frontend processes (Vite dev server)
echo -e "${BLUE}🎯 Stopping Frontend Services...${NC}"
kill_port 5173 "Frontend (Vite)"
kill_port 5174 "Frontend (Vite Alt)"
kill_by_pattern "vite.*dev" "Vite Dev Server"
kill_by_pattern "npm.*run.*dev" "NPM Dev Process"

# Kill any other SecureWatch related processes
echo -e "${BLUE}🎯 Cleaning up other SecureWatch processes...${NC}"
kill_by_pattern "SecureWatch" "SecureWatch"

# Show final port status
echo -e "${BLUE}📊 Final Port Status Check...${NC}"
echo "=================================================="

for port in 3001 5173 5174; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port: STILL IN USE${NC}"
        lsof -i:$port
    else
        echo -e "${GREEN}✅ Port $port: FREE${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 SecureWatch application cleanup complete!${NC}"
echo -e "${BLUE}💡 You can now start the application with: ./start-app.sh${NC}"
echo "==================================================" 