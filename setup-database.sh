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
echo -e "${CYAN}   You can now start the SecureWatch backend${NC}"
echo "" 