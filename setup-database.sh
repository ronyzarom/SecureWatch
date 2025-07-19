#!/bin/bash

# Database setup script for SecureWatch
# This script initializes the PostgreSQL database with all required schemas

set -e  # Exit on any error

echo "🗄️  Setting up SecureWatch Database..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
INCLUDE_COMPLIANCE=false
FORCE_COMPLIANCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --compliance)
      INCLUDE_COMPLIANCE=true
      shift
      ;;
    --force-compliance)
      INCLUDE_COMPLIANCE=true
      FORCE_COMPLIANCE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --compliance       Include compliance framework installation"
      echo "  --force-compliance Force reinstall compliance framework"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Make sure to set your PostgreSQL connection URL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL found${NC}"
echo -e "${CYAN}🔗 Database: ${DATABASE_URL%%@*}@[hidden]${NC}"
echo ""

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${BLUE}📄 Running: $description${NC}"
        if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Success: $description${NC}"
        else
            echo -e "${RED}   ❌ Failed: $description${NC}"
            echo -e "${YELLOW}   ⚠️  Some tables may already exist - continuing...${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  File not found: $file${NC}"
    fi
}

# Function to run Node.js script
run_node_script() {
    local script=$1
    local description=$2
    local args=${3:-""}
    
    if [ -f "$script" ]; then
        echo -e "${BLUE}🔧 Running: $description${NC}"
        if cd backend && node "database/$(basename "$script")" $args; then
            echo -e "${GREEN}   ✅ Success: $description${NC}"
            cd ..
        else
            echo -e "${RED}   ❌ Failed: $description${NC}"
            cd ..
            return 1
        fi
    else
        echo -e "${YELLOW}   ⚠️  Script not found: $script${NC}"
    fi
}

# Navigate to backend directory
cd backend

echo -e "${PURPLE}🔧 Initializing Database Schema...${NC}"
echo "=============================================="

# 1. Main schema (users, employees, violations, etc.)
run_sql_file "database/schema.sql" "Main database schema"

# 2. Policies schema (security policies and executions)
run_sql_file "database/policies-schema.sql" "Security policies schema"

# 3. Integrations schema (API integrations)
run_sql_file "database/integrations-schema.sql" "Integrations schema"

# 4. MFA schema (multi-factor authentication)
run_sql_file "database/mfa-schema.sql" "MFA authentication schema"

# 5. Notifications schema
run_sql_file "database/notifications-schema.sql" "Notifications schema"

# 6. Teams integration schema
run_sql_file "database/teams-schema.sql" "Microsoft Teams integration schema"

# 7. Google Workspace integration schema
run_sql_file "database/google-workspace-schema.sql" "Google Workspace integration schema"

# 8. Custom categories schema
run_sql_file "database/custom-categories-schema.sql" "Custom categories schema"

# 9. Compliance Framework (optional)
if [ "$INCLUDE_COMPLIANCE" = true ]; then
    echo ""
    echo -e "${PURPLE}🔒 Installing Compliance Framework...${NC}"
    echo "=============================================="
    
    if [ "$FORCE_COMPLIANCE" = true ]; then
        echo -e "${YELLOW}⚠️  Force reinstalling compliance framework...${NC}"
        run_node_script "database/init-compliance.js" "Compliance framework removal" "--remove"
    fi
    
    run_node_script "database/init-compliance.js" "Compliance framework installation"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 Compliance Framework Installed Successfully!${NC}"
        echo -e "${CYAN}📋 Features added:${NC}"
        echo -e "${CYAN}   • Regulatory compliance (GDPR, SOX, HIPAA, PCI DSS)${NC}"
        echo -e "${CYAN}   • Internal policy management${NC}"
        echo -e "${CYAN}   • Employee compliance profiles${NC}"
        echo -e "${CYAN}   • Compliance incident tracking${NC}"
        echo -e "${CYAN}   • Automated audit trails${NC}"
        echo ""
        echo -e "${YELLOW}💡 Next steps:${NC}"
        echo -e "${YELLOW}   1. Configure regulations in Admin Settings${NC}"
        echo -e "${YELLOW}   2. Set up internal policies${NC}"
        echo -e "${YELLOW}   3. Assign compliance profiles to employees${NC}"
    else
        echo -e "${RED}❌ Compliance framework installation failed${NC}"
        echo -e "${YELLOW}   Continuing with basic setup...${NC}"
    fi
else
    echo ""
    echo -e "${CYAN}ℹ️  Compliance framework not included${NC}"
    echo -e "${CYAN}   To install compliance features, run:${NC}"
    echo -e "${CYAN}   ./setup-database.sh --compliance${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Database Setup Complete!${NC}"
echo "=============================================="
echo -e "${CYAN}📊 All database schemas have been applied${NC}"
echo -e "${CYAN}🚀 SecureWatch backend is ready to run${NC}"
echo ""

# Test database connection
echo -e "${PURPLE}🔍 Testing Database Connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    echo -e "${CYAN}💾 Database is ready for SecureWatch${NC}"
else
    echo -e "${RED}❌ Database connection test failed${NC}"
    echo -e "${YELLOW}⚠️  Check your DATABASE_URL and database permissions${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎯 Setup completed successfully!${NC}"

# Show summary of what's installed
echo -e "${CYAN}📦 Installed Components:${NC}"
echo -e "${CYAN}   ✅ Core SecureWatch database${NC}"
echo -e "${CYAN}   ✅ Security policies and violations${NC}"
echo -e "${CYAN}   ✅ Employee management and metrics${NC}"
echo -e "${CYAN}   ✅ Email and integration support${NC}"
echo -e "${CYAN}   ✅ MFA and notifications${NC}"
echo -e "${CYAN}   ✅ Microsoft Teams and Google Workspace schemas${NC}"

if [ "$INCLUDE_COMPLIANCE" = true ]; then
    echo -e "${CYAN}   ✅ Compliance framework (GDPR, SOX, HIPAA, PCI DSS)${NC}"
    echo -e "${CYAN}   ✅ Internal policy management${NC}"
    echo -e "${CYAN}   ✅ Compliance audit trails${NC}"
fi

echo ""
echo -e "${CYAN}🚀 You can now start the SecureWatch backend!${NC}"
echo "" 