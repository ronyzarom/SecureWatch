#!/bin/bash
set -e

# =============================================================================
# SecureWatch - New Customer Setup Script (Tag-Based Production)
# =============================================================================
# This script sets up a complete SecureWatch instance for a new customer
# using tag-based deployment for production stability.
#
# Usage: ./new-customer.sh --config customer-config.json [--version v1.0.0]
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE=""
DRY_RUN=false
DEPLOYMENT_VERSION=""
DEPLOYMENT_SOURCE=""
ENVIRONMENT="production"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --version)
      DEPLOYMENT_VERSION="$2"
      shift 2
      ;;
    --source)
      DEPLOYMENT_SOURCE="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 --config <config-file> [options]"
      echo ""
      echo "Options:"
      echo "  --config       Customer configuration JSON file"
      echo "  --version      Specific version/tag to deploy (e.g., v1.0.0, latest)"
      echo "  --source       Deployment source (stable_tags_only, latest_stable_tag, main_branch)"
      echo "  --environment  Target environment (production, staging, demo)"
      echo "  --dry-run      Show what would be done without executing"
      echo "  --help         Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --config config/acme.json --version v1.0.0"
      echo "  $0 --config config/startup.json --source latest_stable_tag"
      echo "  $0 --config config/demo.json --environment demo --source main_branch"
      exit 0
      ;;
    *)
      log_error "Unknown option $1"
      exit 1
      ;;
  esac
done

# Validate inputs
if [[ -z "$CONFIG_FILE" ]]; then
  log_error "Configuration file is required. Use --config <file>"
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  log_error "Configuration file not found: $CONFIG_FILE"
  exit 1
fi

# Load deployment policies
POLICIES_FILE="$PROJECT_ROOT/config/deployment-policies.json"
if [[ ! -f "$POLICIES_FILE" ]]; then
  log_error "Deployment policies file not found: $POLICIES_FILE"
  exit 1
fi

# Check dependencies
check_dependencies() {
  log_info "Checking dependencies..."
  
  local missing_deps=()
  
  command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
  command -v psql >/dev/null 2>&1 || missing_deps+=("postgresql-client")
  command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
  command -v python3 >/dev/null 2>&1 || missing_deps+=("python3")
  command -v git >/dev/null 2>&1 || missing_deps+=("git")
  
  if [[ ${#missing_deps[@]} -ne 0 ]]; then
    log_error "Missing dependencies: ${missing_deps[*]}"
    log_info "Install with: brew install ${missing_deps[*]} (macOS) or apt-get install ${missing_deps[*]} (Ubuntu)"
    exit 1
  fi
  
  log_success "All dependencies satisfied"
}

# Parse configuration and determine deployment strategy
parse_config() {
  log_info "Parsing customer configuration..."
  
  # Extract customer details
  CUSTOMER_NAME=$(jq -r '.customer.name' "$CONFIG_FILE")
  CUSTOMER_SLUG=$(echo "$CUSTOMER_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  INDUSTRY=$(jq -r '.customer.industry' "$CONFIG_FILE")
  COMPANY_SIZE=$(jq -r '.customer.size' "$CONFIG_FILE")
  DEPLOYMENT_POLICY=$(jq -r '.deployment.policy // empty' "$CONFIG_FILE")
  
  # Database configuration
  DB_HOST=$(jq -r '.database.host' "$CONFIG_FILE")
  DB_NAME=$(jq -r '.database.name' "$CONFIG_FILE")
  DB_USER=$(jq -r '.database.user' "$CONFIG_FILE")
  DB_PASS=$(jq -r '.database.password' "$CONFIG_FILE")
  DB_PORT=$(jq -r '.database.port // 5432' "$CONFIG_FILE")
  
  # Render configuration
  RENDER_API_KEY=$(jq -r '.render.api_key // empty' "$CONFIG_FILE")
  BACKEND_SERVICE_NAME="securewatch-${CUSTOMER_SLUG}-backend"
  FRONTEND_SERVICE_NAME="securewatch-${CUSTOMER_SLUG}-frontend"
  
  # Admin user configuration
  ADMIN_EMAIL=$(jq -r '.admin.email' "$CONFIG_FILE")
  ADMIN_NAME=$(jq -r '.admin.name' "$CONFIG_FILE")
  ADMIN_PASSWORD=$(jq -r '.admin.password // empty' "$CONFIG_FILE")
  
  # Generate admin password if not provided
  if [[ -z "$ADMIN_PASSWORD" || "$ADMIN_PASSWORD" == "null" ]]; then
    ADMIN_PASSWORD=$(openssl rand -base64 12)
    log_warning "Generated admin password: $ADMIN_PASSWORD"
  fi
  
  # Construct database URL
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  
  log_success "Configuration parsed successfully"
  log_info "Customer: $CUSTOMER_NAME ($INDUSTRY, $COMPANY_SIZE)"
  log_info "Database: $DB_HOST:$DB_PORT/$DB_NAME"
}

# Determine deployment version and source
determine_deployment_strategy() {
  log_info "Determining deployment strategy..."
  
  # Use deployment policy from config or infer from company size
  if [[ -z "$DEPLOYMENT_POLICY" || "$DEPLOYMENT_POLICY" == "null" ]]; then
    case "$COMPANY_SIZE" in
      "startup")
        DEPLOYMENT_POLICY="startup"
        ;;
      "enterprise")
        DEPLOYMENT_POLICY="enterprise"
        ;;
      *)
        DEPLOYMENT_POLICY="standard"
        ;;
    esac
  fi
  
  # Get policy configuration
  POLICY_CONFIG=$(jq -r ".deployment_policies.$DEPLOYMENT_POLICY" "$POLICIES_FILE")
  if [[ "$POLICY_CONFIG" == "null" ]]; then
    log_error "Unknown deployment policy: $DEPLOYMENT_POLICY"
    exit 1
  fi
  
  # Override with command line arguments
  if [[ -z "$DEPLOYMENT_SOURCE" ]]; then
    DEPLOYMENT_SOURCE=$(echo "$POLICY_CONFIG" | jq -r '.deployment_source')
  fi
  
  # Determine version to deploy
  if [[ -z "$DEPLOYMENT_VERSION" ]]; then
    case "$DEPLOYMENT_SOURCE" in
      "stable_tags_only")
        DEPLOYMENT_VERSION=$(jq -r '.metadata.latest_version' "$PROJECT_ROOT/config/customers.json")
        ;;
      "latest_stable_tag")
        DEPLOYMENT_VERSION=$(git tag -l | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1)
        ;;
      "main_branch")
        DEPLOYMENT_VERSION="main"
        ;;
      *)
        log_error "Unknown deployment source: $DEPLOYMENT_SOURCE"
        exit 1
        ;;
    esac
  fi
  
  # Validate deployment strategy for environment
  if [[ "$ENVIRONMENT" == "production" ]]; then
    ALLOWED_SOURCES=$(jq -r '.deployment_rules.production.allowed_sources[]' "$POLICIES_FILE")
    if ! echo "$ALLOWED_SOURCES" | grep -q "$DEPLOYMENT_SOURCE"; then
      log_error "Deployment source '$DEPLOYMENT_SOURCE' not allowed for production environment"
      log_info "Allowed sources for production: $(echo "$ALLOWED_SOURCES" | tr '\n' ', ')"
      exit 1
    fi
  fi
  
  log_success "Deployment strategy determined"
  log_info "Policy: $DEPLOYMENT_POLICY"
  log_info "Source: $DEPLOYMENT_SOURCE"
  log_info "Version: $DEPLOYMENT_VERSION"
  log_info "Environment: $ENVIRONMENT"
}

# Checkout specific version/tag
checkout_deployment_version() {
  log_info "Preparing deployment version: $DEPLOYMENT_VERSION"
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would checkout version: $DEPLOYMENT_VERSION"
    return 0
  fi
  
  # Store current branch
  ORIGINAL_BRANCH=$(git branch --show-current)
  
  case "$DEPLOYMENT_VERSION" in
    "main")
      log_info "Using main branch (latest development)"
      git checkout main
      git pull origin main
      ;;
    v*)
      log_info "Checking out tag: $DEPLOYMENT_VERSION"
      if ! git tag -l | grep -q "^$DEPLOYMENT_VERSION$"; then
        log_error "Tag $DEPLOYMENT_VERSION not found"
        git tag -l | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -5
        exit 1
      fi
      git checkout "tags/$DEPLOYMENT_VERSION"
      ;;
    *)
      log_error "Invalid deployment version: $DEPLOYMENT_VERSION"
      exit 1
      ;;
  esac
  
  log_success "Deployment version ready: $DEPLOYMENT_VERSION"
}

# Test database connectivity
test_database() {
  log_info "Testing database connectivity..."
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would test connection to $DATABASE_URL"
    return 0
  fi
  
  # Test connection
  if ! psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
    log_error "Cannot connect to database. Check your configuration."
    log_info "Database URL: $DATABASE_URL"
    exit 1
  fi
  
  log_success "Database connection successful"
}

# Create Render services
create_render_services() {
  log_info "Creating Render services..."
  
  if [[ -z "$RENDER_API_KEY" || "$RENDER_API_KEY" == "null" ]]; then
    log_warning "No Render API key provided, skipping service creation"
    log_info "Please create services manually in Render dashboard"
    return 0
  fi
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would create Render services:"
    log_info "  - Backend: $BACKEND_SERVICE_NAME"
    log_info "  - Frontend: $FRONTEND_SERVICE_NAME"
    return 0
  fi
  
  # Create backend service
  log_info "Creating backend service: $BACKEND_SERVICE_NAME"
  curl -s -X POST "https://api.render.com/v1/services" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"web_service\",
      \"name\": \"$BACKEND_SERVICE_NAME\",
      \"repo\": \"https://github.com/your-org/SecureWatch\",
      \"branch\": \"main\",
      \"buildCommand\": \"cd backend && npm install\",
      \"startCommand\": \"cd backend && npm start\",
      \"envVars\": [
        {\"key\": \"DATABASE_URL\", \"value\": \"$DATABASE_URL\"},
        {\"key\": \"NODE_ENV\", \"value\": \"production\"},
        {\"key\": \"SESSION_SECRET\", \"value\": \"$(openssl rand -base64 32)\"}
      ]
    }" || log_warning "Backend service creation may have failed"
  
  # Create frontend service
  log_info "Creating frontend service: $FRONTEND_SERVICE_NAME"
  curl -s -X POST "https://api.render.com/v1/services" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"static_site\",
      \"name\": \"$FRONTEND_SERVICE_NAME\",
      \"repo\": \"https://github.com/your-org/SecureWatch\",
      \"branch\": \"main\",
      \"buildCommand\": \"npm install && npm run build\",
      \"publishPath\": \"dist\"
    }" || log_warning "Frontend service creation may have failed"
  
  log_success "Render services creation initiated"
}

# Initialize database schema
init_database() {
  log_info "Initializing database schema for version $DEPLOYMENT_VERSION..."
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would initialize database with:"
    log_info "  - Core schema"
    log_info "  - Training management schema"
    return 0
  fi
  
  # Apply core schema
  log_info "Applying core schema..."
  if ! psql "$DATABASE_URL" < "$PROJECT_ROOT/backend/database/schema.sql"; then
    log_error "Failed to apply core schema"
    exit 1
  fi
  
  # Apply training management schema
  log_info "Applying training management schema..."
  if ! psql "$DATABASE_URL" < "$PROJECT_ROOT/backend/database/training-management-schema.sql"; then
    log_error "Failed to apply training management schema"
    exit 1
  fi
  
  # Record deployment version in database
  psql "$DATABASE_URL" << EOF >/dev/null
CREATE TABLE IF NOT EXISTS deployment_info (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  deployment_source VARCHAR(50) NOT NULL,
  deployment_policy VARCHAR(50) NOT NULL,
  deployed_at TIMESTAMP DEFAULT NOW(),
  deployed_by VARCHAR(100)
);

INSERT INTO deployment_info (version, deployment_source, deployment_policy, deployed_by)
VALUES ('$DEPLOYMENT_VERSION', '$DEPLOYMENT_SOURCE', '$DEPLOYMENT_POLICY', 'deployment-script');
EOF
  
  log_success "Database schema initialized for version $DEPLOYMENT_VERSION"
}

# Seed initial data
seed_data() {
  log_info "Seeding initial data..."
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would seed data:"
    log_info "  - Core training content"
    log_info "  - Industry-specific content ($INDUSTRY)"
    log_info "  - Size-appropriate templates ($COMPANY_SIZE)"
    if [[ "$INCLUDE_SAMPLE_DATA" == "true" ]]; then
      log_info "  - Sample employees ($SAMPLE_EMPLOYEE_COUNT)"
      log_info "  - Sample violations"
    fi
    return 0
  fi
  
  # Core training content
  log_info "Installing core training content..."
  psql "$DATABASE_URL" < "$PROJECT_ROOT/seed-data/core/training-library.sql"
  psql "$DATABASE_URL" < "$PROJECT_ROOT/seed-data/core/compliance-frameworks.sql"
  psql "$DATABASE_URL" < "$PROJECT_ROOT/seed-data/core/system-settings.sql"
  
  # Industry-specific content
  if [[ -f "$PROJECT_ROOT/seed-data/industry/$INDUSTRY.sql" ]]; then
    log_info "Adding $INDUSTRY industry content..."
    psql "$DATABASE_URL" < "$PROJECT_ROOT/seed-data/industry/$INDUSTRY.sql"
  else
    log_warning "No industry-specific content found for: $INDUSTRY"
  fi
  
  # Size-appropriate content
  if [[ -f "$PROJECT_ROOT/seed-data/size/$COMPANY_SIZE.sql" ]]; then
    log_info "Adding $COMPANY_SIZE company templates..."
    psql "$DATABASE_URL" < "$PROJECT_ROOT/seed-data/size/$COMPANY_SIZE.sql"
  else
    log_warning "No size-specific content found for: $COMPANY_SIZE"
  fi
  
  # Sample data generation
  if [[ "$INCLUDE_SAMPLE_DATA" == "true" ]]; then
    log_info "Generating sample employees and violations..."
    python3 "$PROJECT_ROOT/scripts/generate-sample-data.py" \
      --database-url "$DATABASE_URL" \
      --customer-name "$CUSTOMER_NAME" \
      --industry "$INDUSTRY" \
      --company-size "$COMPANY_SIZE" \
      --employee-count "$SAMPLE_EMPLOYEE_COUNT"
  fi
  
  log_success "Data seeding completed"
}

# Create admin user
create_admin() {
  log_info "Creating admin user..."
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would create admin user:"
    log_info "  - Email: $ADMIN_EMAIL"
    log_info "  - Name: $ADMIN_NAME"
    return 0
  fi
  
  python3 "$PROJECT_ROOT/scripts/create-admin-user.py" \
    --database-url "$DATABASE_URL" \
    --email "$ADMIN_EMAIL" \
    --name "$ADMIN_NAME" \
    --password "$ADMIN_PASSWORD"
  
  log_success "Admin user created"
}

# Generate enhanced customer summary
generate_summary() {
  local summary_file="customer-${CUSTOMER_SLUG}-summary.txt"
  
  log_info "Generating customer summary..."
  
  cat > "$summary_file" << EOF
SecureWatch Customer Setup Summary
=================================

Customer: $CUSTOMER_NAME
Industry: $INDUSTRY
Company Size: $COMPANY_SIZE
Setup Date: $(date)

Deployment Configuration:
- Version: $DEPLOYMENT_VERSION
- Source: $DEPLOYMENT_SOURCE
- Policy: $DEPLOYMENT_POLICY
- Environment: $ENVIRONMENT

Database Configuration:
- Host: $DB_HOST
- Database: $DB_NAME
- User: $DB_USER

Admin User:
- Email: $ADMIN_EMAIL
- Name: $ADMIN_NAME
- Password: $ADMIN_PASSWORD

Render Services:
- Backend: $BACKEND_SERVICE_NAME
- Frontend: $FRONTEND_SERVICE_NAME

Deployment Strategy:
- Policy: $DEPLOYMENT_POLICY
- Auto-update: $(echo "$POLICY_CONFIG" | jq -r '.auto_update')
- Rollback window: $(echo "$POLICY_CONFIG" | jq -r '.rollback_window')

Next Steps:
1. Verify Render deployment status
2. Configure custom domain (if applicable)
3. Test admin login with version $DEPLOYMENT_VERSION
4. Review deployment policy settings
5. Schedule maintenance windows
6. Configure monitoring and alerts

Support:
- Documentation: https://docs.securewatch.com
- Support Email: support@securewatch.com
- Version Documentation: https://docs.securewatch.com/versions/$DEPLOYMENT_VERSION
EOF

  log_success "Summary saved to: $summary_file"
}

# Cleanup function to return to original branch
cleanup() {
  if [[ -n "$ORIGINAL_BRANCH" && "$DEPLOYMENT_VERSION" != "main" ]]; then
    log_info "Returning to original branch: $ORIGINAL_BRANCH"
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
  fi
  
  if [[ $? -ne 0 ]]; then
    log_error "Setup failed. Check the logs above for details."
    log_info "For support, contact: support@securewatch.com"
  fi
}

# Main execution
main() {
  trap cleanup EXIT
  
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           SecureWatch - Tag-Based Customer Setup        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  if $DRY_RUN; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
  fi
  
  # Execute setup steps
  check_dependencies
  parse_config
  determine_deployment_strategy
  test_database
  checkout_deployment_version
  init_database
  seed_data
  create_admin
  generate_summary
  
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║                    Setup Complete! 🎉                   ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  log_success "Customer $CUSTOMER_NAME deployed with version $DEPLOYMENT_VERSION"
  log_info "Deployment Policy: $DEPLOYMENT_POLICY"
  log_info "Admin login: $ADMIN_EMAIL / $ADMIN_PASSWORD"
  log_info "Summary: customer-${CUSTOMER_SLUG}-summary.txt"
  
  if [[ ! $DRY_RUN ]]; then
    log_info "Please allow 5-10 minutes for Render services to deploy"
  fi
}

# Run main function
main "$@" 