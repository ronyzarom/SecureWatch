#!/bin/bash

##############################################################################
# SecureWatch Client Database Creation Script
# 
# This script creates a new database for a client with:
# - Complete SecureWatch schema (60+ tables)
# - Default admin user
# - Essential system settings
# - No customer-specific data (clean slate)
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Function to show help
show_help() {
    echo -e "${BLUE}SecureWatch Client Database Creation Script${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo "Creates a clean database for a new client with complete schema and default admin user."
    echo ""
    echo "Usage:"
    echo "  $0 [options]"
    echo ""
    echo "Options:"
    echo "  --config <file>          Load configuration from JSON file"
    echo "  --client-name <name>     Client/company name (e.g., \"ACME Corporation\")"
    echo "  --admin-email <email>    Admin user email address"
    echo "  --admin-name <name>      Admin user full name"
    echo "  --admin-password <pass>  Admin user password (auto-generated if not provided)"
    echo "  --database-url <url>     PostgreSQL connection URL"
    echo "  --industry <type>        Industry type (technology, finance, healthcare, etc.)"
    echo "  --force-new-db           Drop and recreate database (WARNING: destroys all data)"
    echo "  --help                   Show this help message"
    echo ""
    echo "Examples:"
    echo ""
    echo -e "${YELLOW}  # Using configuration file${NC}"
    echo "  $0 --config config/acme-client.json"
    echo ""
    echo -e "${YELLOW}  # Using command line options${NC}"
    echo "  $0 --client-name \"ACME Corporation\" \\"
    echo "     --admin-email \"admin@acme.com\" \\"
    echo "     --database-url \"postgresql://user:pass@host:port/db\""
    echo ""
    echo -e "${YELLOW}  # Quick setup with environment variable${NC}"
    echo "  export DATABASE_URL=\"postgresql://user:pass@host:port/db\""
    echo "  $0 --client-name \"ACME Corporation\" --admin-email \"admin@acme.com\""
    echo ""
    echo -e "${YELLOW}  # Force new database creation (drops existing)${NC}"
    echo "  $0 --client-name \"ACME Corporation\" \\"
    echo "     --admin-email \"admin@acme.com\" \\"
    echo "     --database-url \"postgresql://user:pass@host:port/newclient_db\" \\"
    echo "     --force-new-db"
    echo ""
    echo "Configuration File Format:"
    echo "  See config/client-database-template.json for a complete example."
    echo ""
    echo "What this script creates:"
    echo "  ✓ Complete SecureWatch database schema (60+ tables)"
    echo "  ✓ Default admin user with full system access"
    echo "  ✓ Essential system settings and configurations"
    echo "  ✓ Compliance framework templates (SOC2, ISO27001)"
    echo "  ✓ Default training courses"
    echo "  ✓ Clean slate (no sample/customer data)"
    echo ""
}

# Function to check if Node.js is available
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js is not installed or not in PATH${NC}"
        echo "Please install Node.js (version 16 or higher) to continue."
        exit 1
    fi
    
    # Check Node.js version
    local node_version=$(node -v | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$major_version" -lt 16 ]; then
        echo -e "${YELLOW}⚠️  Warning: Node.js version $node_version detected${NC}"
        echo "   Recommended: Node.js version 16 or higher"
        echo ""
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    # Check Node.js
    check_nodejs
    
    # Check if we're in the right directory
    if [ ! -f "$SCRIPT_DIR/scripts/create-client-database.js" ]; then
        echo -e "${RED}❌ Error: create-client-database.js not found${NC}"
        echo "Please run this script from the SecureWatch project root directory."
        exit 1
    fi
    
    # Check if package.json exists in backend
    if [ ! -f "$SCRIPT_DIR/backend/package.json" ]; then
        echo -e "${RED}❌ Error: Backend package.json not found${NC}"
        echo "Please ensure you're in the SecureWatch project root directory."
        exit 1
    fi
    
    # Install Node.js dependencies if node_modules doesn't exist
    if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
        cd "$SCRIPT_DIR/backend"
        npm install --silent
        cd "$SCRIPT_DIR"
    fi
    
    echo -e "${GREEN}✅ Dependencies checked${NC}"
}

# Main execution
main() {
    # Show header
    echo -e "${BLUE}🏗️  SecureWatch Client Database Creator${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    # Handle help option first
    for arg in "$@"; do
        if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
            show_help
            exit 0
        fi
    done
    
    # Check dependencies
    check_dependencies
    
    echo ""
    echo -e "${BLUE}🚀 Starting client database creation...${NC}"
    echo ""
    
    # Change to backend directory to ensure proper module resolution
    cd "$SCRIPT_DIR/backend"
    
    # Copy the script to backend directory temporarily to resolve modules
    cp "../scripts/create-client-database.js" "./temp-create-client-database.js"
    
    # Execute the Node.js script with all passed arguments
    node "./temp-create-client-database.js" "$@"
    
    # Clean up temporary file
    rm -f "./temp-create-client-database.js"
    
    local exit_code=$?
    
    # Return to original directory
    cd "$SCRIPT_DIR"
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 Client database creation completed successfully!${NC}"
        echo ""
        echo -e "${BLUE}📋 Next Steps:${NC}"
        echo "  1. Test admin login with the provided credentials"
        echo "  2. Configure integrations (Office 365, Google Workspace, etc.)"
        echo "  3. Import or create employee records"
        echo "  4. Set up compliance profiles for your industry"
        echo "  5. Review the generated summary file"
        echo ""
    else
        echo -e "${RED}❌ Client database creation failed!${NC}"
        echo "Please check the error messages above and try again."
        echo ""
        echo "For support:"
        echo "  - Check the configuration file format"
        echo "  - Verify database connection details"
        echo "  - Ensure database user has CREATE permissions"
        echo ""
    fi
    
    exit $exit_code
}

# Run main function with all arguments
main "$@" 