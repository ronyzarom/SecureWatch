#!/bin/bash

# SecureWatch Database Duplicator Shell Wrapper
# Duplicates the current production database and cleans it for a new client

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo "🏗️  SecureWatch Database Duplicator"
    echo "====================================="
    echo ""
    echo "Usage: $0 --config <config-file> [--force-new-db]"
    echo ""
    echo "Options:"
    echo "  --config <file>     Path to client configuration JSON file"
    echo "  --force-new-db      Drop and recreate target database if it exists"
    echo "  --help              Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --config config/acme-example-client.json"
    echo "  $0 --config config/test-local-client.json --force-new-db"
    echo ""
    echo "The script will:"
    echo "  1. Duplicate the current SecureWatch database schema"
    echo "  2. Copy essential reference data (policies, training, etc.)"
    echo "  3. Clean up all customer-specific operational data"
    echo "  4. Create a new admin user for the client"
    echo "  5. Reset integration settings"
    echo "  6. Generate a summary report"
    echo ""
}

# Parse command line arguments
CONFIG_FILE=""
FORCE_NEW_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --force-new-db)
            FORCE_NEW_DB=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$CONFIG_FILE" ]]; then
    echo -e "${RED}❌ Error: --config is required${NC}"
    show_help
    exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}❌ Error: Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}🏗️  SecureWatch Database Duplicator${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump (PostgreSQL client) is required but not installed${NC}"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql (PostgreSQL client) is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies checked${NC}"
echo ""

# Update configuration file to include force flag if specified
if [[ "$FORCE_NEW_DB" == true ]]; then
    # Create a temporary config file with the force flag
    TEMP_CONFIG=$(mktemp)
    jq '. + {"forceNewDb": true}' "$CONFIG_FILE" > "$TEMP_CONFIG"
    CONFIG_FILE="$TEMP_CONFIG"
    
    # Cleanup function
    cleanup() {
        if [[ -f "$TEMP_CONFIG" ]]; then
            rm -f "$TEMP_CONFIG"
        fi
    }
    trap cleanup EXIT
fi

echo -e "${YELLOW}🚀 Starting database duplication...${NC}"
echo ""

# Change to backend directory and run the script
cd "$SCRIPT_DIR/backend" || {
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
}

# Copy the script to backend for module resolution
cp "../scripts/duplicate-and-clean-db.js" "./temp-duplicate-and-clean-db.js"

# Run the Node.js script
if node "./temp-duplicate-and-clean-db.js" "$CONFIG_FILE"; then
    echo ""
    echo -e "${GREEN}🎉 Database duplication completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "  ${GREEN}1.${NC} Test admin login with the provided credentials"
    echo -e "  ${GREEN}2.${NC} Configure integrations (Office 365, Google Workspace, etc.)"
    echo -e "  ${GREEN}3.${NC} Import or create employee records"
    echo -e "  ${GREEN}4.${NC} Set up compliance profiles for your industry"
    echo -e "  ${GREEN}5.${NC} Review the generated summary file"
    echo ""
else
    echo -e "${RED}❌ Database duplication failed${NC}"
    exit 1
fi

# Cleanup temporary files
rm -f "./temp-duplicate-and-clean-db.js"

echo -e "${GREEN}🎉 Database duplication completed successfully!${NC}" 