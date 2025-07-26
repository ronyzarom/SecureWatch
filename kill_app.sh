#!/bin/bash

##############################################################################
# SecureWatch Application Kill Script
# 
# This script kills processes running on the backend and frontend ports:
# - Backend: Port 3001 (Express.js server)
# - Frontend: Port 5173 (Vite dev server)
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ports used by SecureWatch
BACKEND_PORT=3001
FRONTEND_PORT=5173

echo -e "${BLUE}🔪 SecureWatch Application Kill Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${YELLOW}🔍 Checking for processes on port ${port} (${service_name})...${NC}"
    
    # Find processes using the port
    local pids=$(lsof -ti:${port} 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ No processes found on port ${port}${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}📋 Found processes on port ${port}:${NC}"
    
    # Show process details before killing
    for pid in $pids; do
        local process_info=$(ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null)
        if [ -n "$process_info" ]; then
            echo -e "   PID: $pid - $process_info"
        fi
    done
    
    echo -e "${RED}🔪 Killing processes on port ${port}...${NC}"
    
    # Try graceful termination first (SIGTERM)
    for pid in $pids; do
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "   Sending SIGTERM to PID: $pid"
            kill $pid 2>/dev/null
        fi
    done
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Check if any processes are still running and force kill them (SIGKILL)
    local remaining_pids=$(lsof -ti:${port} 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
        echo -e "${RED}⚡ Force killing remaining processes...${NC}"
        for pid in $remaining_pids; do
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "   Sending SIGKILL to PID: $pid"
                kill -9 $pid 2>/dev/null
            fi
        done
        sleep 1
    fi
    
    # Final verification
    local final_check=$(lsof -ti:${port} 2>/dev/null)
    if [ -z "$final_check" ]; then
        echo -e "${GREEN}✅ Successfully killed all processes on port ${port}${NC}"
    else
        echo -e "${RED}❌ Some processes may still be running on port ${port}${NC}"
        return 1
    fi
    
    echo ""
}

# Function to kill processes by name pattern
kill_by_name() {
    local pattern=$1
    local service_name=$2
    
    echo -e "${YELLOW}🔍 Checking for ${service_name} processes...${NC}"
    
    # Find processes matching the pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ No ${service_name} processes found${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}📋 Found ${service_name} processes:${NC}"
    for pid in $pids; do
        local process_info=$(ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null)
        if [ -n "$process_info" ]; then
            echo -e "   PID: $pid - $process_info"
        fi
    done
    
    echo -e "${RED}🔪 Killing ${service_name} processes...${NC}"
    for pid in $pids; do
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "   Killing PID: $pid"
            kill $pid 2>/dev/null
        fi
    done
    
    sleep 2
    
    # Force kill if necessary
    local remaining_pids=$(pgrep -f "$pattern" 2>/dev/null)
    if [ -n "$remaining_pids" ]; then
        echo -e "${RED}⚡ Force killing remaining ${service_name} processes...${NC}"
        for pid in $remaining_pids; do
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
        done
    fi
    
    echo ""
}

# Main execution
main() {
    # Check if lsof is available
    if ! command -v lsof &> /dev/null; then
        echo -e "${RED}❌ Error: 'lsof' command not found. Please install it first.${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🎯 Target Services:${NC}"
    echo -e "   📡 Backend (Express.js): Port ${BACKEND_PORT}"
    echo -e "   🌐 Frontend (Vite): Port ${FRONTEND_PORT}"
    echo ""
    
    # Kill backend processes
    kill_port $BACKEND_PORT "Backend (Express.js)"
    
    # Kill frontend processes  
    kill_port $FRONTEND_PORT "Frontend (Vite)"
    
    # Also kill processes by name patterns (backup method)
    echo -e "${YELLOW}🔍 Checking for processes by name patterns...${NC}"
    kill_by_name "node.*server.js" "Node.js Backend"
    kill_by_name "vite.*dev" "Vite Dev Server"
    kill_by_name "npm.*dev" "NPM Dev Processes"
    kill_by_name "yarn.*dev" "Yarn Dev Processes"
    
    # Final summary
    echo -e "${BLUE}📊 Final Status Check:${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    local backend_check=$(lsof -ti:${BACKEND_PORT} 2>/dev/null)
    local frontend_check=$(lsof -ti:${FRONTEND_PORT} 2>/dev/null)
    
    if [ -z "$backend_check" ]; then
        echo -e "${GREEN}✅ Backend port ${BACKEND_PORT}: Clear${NC}"
    else
        echo -e "${RED}❌ Backend port ${BACKEND_PORT}: Still occupied${NC}"
    fi
    
    if [ -z "$frontend_check" ]; then
        echo -e "${GREEN}✅ Frontend port ${FRONTEND_PORT}: Clear${NC}"
    else
        echo -e "${RED}❌ Frontend port ${FRONTEND_PORT}: Still occupied${NC}"
    fi
    
    if [ -z "$backend_check" ] && [ -z "$frontend_check" ]; then
        echo ""
        echo -e "${GREEN}🎉 SUCCESS: All SecureWatch processes have been terminated!${NC}"
        echo -e "${GREEN}🚀 Ports ${BACKEND_PORT} and ${FRONTEND_PORT} are now available.${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Some processes may still be running. You may need to:${NC}"
        echo -e "   1. Wait a few more seconds for processes to fully terminate"
        echo -e "   2. Check manually with: lsof -i:${BACKEND_PORT} -i:${FRONTEND_PORT}"
        echo -e "   3. Restart your terminal/shell if processes persist"
    fi
}

# Handle command line arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo -e "${BLUE}SecureWatch Application Kill Script${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h      Show this help message"
    echo "  --confirm, -c   Prompt for confirmation before killing processes"
    echo "  --verbose, -v   Enable verbose output (reserved for future use)"
    echo ""
    echo "This script kills processes running on:"
    echo "  • Port 3001 (Backend - Express.js)"
    echo "  • Port 5173 (Frontend - Vite)"
    echo ""
    echo "By default, the script runs immediately without confirmation."
    echo "Use --confirm to enable the confirmation prompt."
    echo ""
    echo "The script will:"
    echo "  1. Find all processes using the target ports"
    echo "  2. Show process details before termination"
    echo "  3. Attempt graceful termination (SIGTERM)"
    echo "  4. Force kill if necessary (SIGKILL)"
    echo "  5. Verify all processes are terminated"
    echo ""
    exit 0
fi

# Confirmation prompt only if --confirm is used
if [[ "$1" == "--confirm" || "$1" == "-c" ]]; then
    echo -e "${YELLOW}⚠️  This will kill all processes running on ports ${BACKEND_PORT} and ${FRONTEND_PORT}.${NC}"
    echo -e "${YELLOW}   This includes the SecureWatch backend and frontend servers.${NC}"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled.${NC}"
        exit 0
    fi
    echo ""
fi

# Run the main function
main 