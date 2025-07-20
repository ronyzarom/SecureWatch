#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Unified Deployment Script
# =============================================================================
# Single entry point for all SecureWatch deployment operations
# Usage: ./deploy.sh [operation] [options]
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Main help function
show_help() {
  cat << EOF
${BOLD}SecureWatch Unified Deployment Interface${NC}

${BOLD}USAGE:${NC}
  $0 <operation> [options]

${BOLD}CUSTOMER OPERATIONS:${NC}
  ${GREEN}customer-new${NC}        Deploy new customer
  ${GREEN}customer-list${NC}       List all customers  
  ${GREEN}customer-health${NC}     Check customer health
  ${GREEN}customer-update${NC}     Update customer version

${BOLD}PATCH OPERATIONS:${NC}
  ${CYAN}patch-plan${NC}          Plan patch release
  ${CYAN}patch-deploy${NC}        Deploy patch to customers
  ${RED}patch-emergency${NC}      Emergency patch deployment
  ${CYAN}patch-status${NC}        Check patch status

${BOLD}RELEASE OPERATIONS:${NC}
  ${BLUE}release-plan${NC}        Plan minor release
  ${BLUE}release-deploy${NC}      Deploy release phase
  ${BLUE}release-status${NC}      Check release status

${BOLD}VERSION OPERATIONS:${NC}
  ${PURPLE}version-list${NC}        List available versions
  ${PURPLE}version-deploy${NC}      Deploy specific version
  ${PURPLE}version-create${NC}      Create new version tag

${BOLD}RENDER OPERATIONS:${NC}
  ${YELLOW}render-deploy${NC}       Deploy to Render
  ${YELLOW}render-health${NC}       Check Render health
  ${YELLOW}render-logs${NC}         Get service logs
  ${YELLOW}render-rollback${NC}     Rollback deployment

${BOLD}WORKFLOW OPERATIONS:${NC}
  ${BOLD}workflow-new-customer${NC}    Complete customer setup
  ${BOLD}workflow-emergency${NC}       Emergency patch workflow
  ${BOLD}workflow-update${NC}          Customer update workflow

${BOLD}SYSTEM OPERATIONS:${NC}
  ${BOLD}status${NC}              Show system status
  ${BOLD}help${NC}                Show this help

${BOLD}EXAMPLES:${NC}
  # Deploy new customer
  $0 customer-new --config config/my-customer.json --version v1.0.0

  # Emergency security patch
  $0 patch-emergency --version v1.0.1 --type security

  # Check system status
  $0 status

  # Complete customer deployment workflow
  $0 workflow-new-customer --config config/customer.json

EOF
}

# System status
show_status() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║              SecureWatch System Status                  ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  echo -e "${BLUE}[INFO]${NC} Checking deployment scripts..."
  echo ""
  
  # Check scripts
  echo "📋 DEPLOYMENT SCRIPTS:"
  local scripts=(
    "new-customer.sh"
    "patch-release-manager.sh" 
    "minor-release-manager.sh"
    "tag-based-deploy.sh"
    "render-deploy.sh"
  )
  
  for script in "${scripts[@]}"; do
    if [[ -f "$SCRIPT_DIR/$script" && -x "$SCRIPT_DIR/$script" ]]; then
      echo "├── ✅ $script"
    else
      echo "├── ❌ $script - Missing or not executable"
    fi
  done
  
  echo ""
  echo "⚙️ CONFIGURATION FILES:"
  local configs=(
    "customers.json"
    "deployment-policies.json"
    "patch-release-policies.json"
    "render-deployment.json"
  )
  
  for config in "${configs[@]}"; do
    if [[ -f "$PROJECT_ROOT/config/$config" ]]; then
      echo "├── ✅ $config"
    else
      echo "├── ❌ $config - Missing"
    fi
  done
  
  echo ""
  echo "🔑 API CONFIGURATION:"
  if [[ -f "$PROJECT_ROOT/backend/.env" ]] && grep -q "RENDER_API_KEY" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo "└── ✅ Render API key configured"
  else
    echo "└── ⚠️ Render API key not found"
  fi
  
  echo ""
}

# Route operations to appropriate scripts
case "$1" in
  # Customer operations
  customer-new|new-customer)
    shift
    echo -e "${GREEN}[DEPLOY]${NC} Deploying new customer..."
    exec "$SCRIPT_DIR/new-customer.sh" "$@"
    ;;
  customer-list|list-customers)
    echo -e "${GREEN}[DEPLOY]${NC} Listing customers..."
    if [[ -f "$PROJECT_ROOT/config/customers.json" ]]; then
      jq -r '.customers[] | "- \(.name) (\(.slug)) - \(.deployment_policy) - \(.current_version)"' "$PROJECT_ROOT/config/customers.json"
    else
      echo -e "${RED}[ERROR]${NC} customers.json not found"
    fi
    ;;
  customer-health|customer-status)
    shift
    echo -e "${GREEN}[DEPLOY]${NC} Checking customer health..."
    exec "$SCRIPT_DIR/render-deploy.sh" check-health "$@"
    ;;
    
  # Patch operations
  patch-plan)
    shift
    echo -e "${CYAN}[DEPLOY]${NC} Planning patch release..."
    exec "$SCRIPT_DIR/patch-release-manager.sh" plan-patch "$@"
    ;;
  patch-deploy)
    shift
    echo -e "${CYAN}[DEPLOY]${NC} Deploying patch..."
    exec "$SCRIPT_DIR/patch-release-manager.sh" deploy-patch "$@"
    ;;
  patch-emergency|emergency-patch)
    shift
    echo -e "${RED}[DEPLOY]${NC} Emergency patch deployment..."
    exec "$SCRIPT_DIR/patch-release-manager.sh" emergency-patch "$@"
    ;;
  patch-status)
    shift
    echo -e "${CYAN}[DEPLOY]${NC} Checking patch status..."
    exec "$SCRIPT_DIR/patch-release-manager.sh" check-patch-status "$@"
    ;;
    
  # Release operations
  release-plan)
    shift
    echo -e "${BLUE}[DEPLOY]${NC} Planning minor release..."
    exec "$SCRIPT_DIR/minor-release-manager.sh" plan-release "$@"
    ;;
  release-deploy)
    shift
    echo -e "${BLUE}[DEPLOY]${NC} Deploying release phase..."
    exec "$SCRIPT_DIR/minor-release-manager.sh" deploy-phase "$@"
    ;;
  release-status)
    shift
    echo -e "${BLUE}[DEPLOY]${NC} Checking release status..."
    exec "$SCRIPT_DIR/minor-release-manager.sh" check-release-status "$@"
    ;;
    
  # Version operations
  version-list)
    shift
    echo -e "${PURPLE}[DEPLOY]${NC} Listing versions..."
    exec "$SCRIPT_DIR/tag-based-deploy.sh" list-versions "$@"
    ;;
  version-deploy)
    shift
    echo -e "${PURPLE}[DEPLOY]${NC} Deploying version..."
    exec "$SCRIPT_DIR/tag-based-deploy.sh" deploy-version "$@"
    ;;
  version-create)
    shift
    echo -e "${PURPLE}[DEPLOY]${NC} Creating version tag..."
    exec "$SCRIPT_DIR/tag-based-deploy.sh" create-tag "$@"
    ;;
    
  # Render operations
  render-deploy)
    shift
    echo -e "${YELLOW}[DEPLOY]${NC} Deploying to Render..."
    exec "$SCRIPT_DIR/render-deploy.sh" deploy-customer "$@"
    ;;
  render-health)
    shift
    echo -e "${YELLOW}[DEPLOY]${NC} Checking Render health..."
    exec "$SCRIPT_DIR/render-deploy.sh" check-health "$@"
    ;;
  render-logs)
    shift
    echo -e "${YELLOW}[DEPLOY]${NC} Fetching Render logs..."
    exec "$SCRIPT_DIR/render-deploy.sh" logs "$@"
    ;;
  render-rollback)
    shift
    echo -e "${YELLOW}[DEPLOY]${NC} Rolling back Render deployment..."
    exec "$SCRIPT_DIR/render-deploy.sh" rollback-customer "$@"
    ;;
    
  # Workflow operations
  workflow-new-customer)
    shift
    echo -e "${BOLD}[WORKFLOW]${NC} Starting new customer deployment workflow..."
    
    # Step 1: Validate
    echo -e "${CYAN}[WORKFLOW]${NC} Step 1/4: Validating configuration..."
    if ! "$SCRIPT_DIR/new-customer.sh" "$@" --dry-run; then
      echo -e "${RED}[ERROR]${NC} Configuration validation failed"
      exit 1
    fi
    
    # Step 2: Deploy
    echo -e "${CYAN}[WORKFLOW]${NC} Step 2/4: Deploying customer..."
    if ! "$SCRIPT_DIR/new-customer.sh" "$@"; then
      echo -e "${RED}[ERROR]${NC} Customer deployment failed"
      exit 1
    fi
    
    # Step 3: Extract customer slug for health check
    local config_file=""
    for arg in "$@"; do
      if [[ "$arg" == "--config" ]]; then
        shift
        config_file="$1"
        break
      fi
      shift
    done
    
    if [[ -n "$config_file" && -f "$config_file" ]]; then
      local customer_slug=$(jq -r '.customer.slug' "$config_file" 2>/dev/null || echo "")
      if [[ -n "$customer_slug" && "$customer_slug" != "null" ]]; then
        echo -e "${CYAN}[WORKFLOW]${NC} Step 3/4: Waiting for services to start..."
        sleep 30
        
        echo -e "${CYAN}[WORKFLOW]${NC} Step 4/4: Verifying deployment..."
        "$SCRIPT_DIR/render-deploy.sh" check-health --customer "$customer_slug" || echo -e "${YELLOW}[WARNING]${NC} Health check failed - services may still be starting"
      fi
    fi
    
    echo -e "${GREEN}[SUCCESS]${NC} New customer deployment workflow completed!"
    ;;
    
  workflow-emergency)
    shift
    echo -e "${RED}[WORKFLOW]${NC} Starting emergency patch workflow..."
    
    local version=""
    local patch_type="security"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
      case $1 in
        --version)
          version="$2"
          shift 2
          ;;
        --type)
          patch_type="$2"
          shift 2
          ;;
        *)
          shift
          ;;
      esac
    done
    
    if [[ -z "$version" ]]; then
      echo -e "${RED}[ERROR]${NC} Version required. Use --version v1.0.1"
      exit 1
    fi
    
    echo -e "${CYAN}[WORKFLOW]${NC} Step 1/3: Planning emergency patch..."
    "$SCRIPT_DIR/patch-release-manager.sh" plan-patch --version "$version" --type "$patch_type" --urgency critical
    
    echo -e "${CYAN}[WORKFLOW]${NC} Step 2/3: Deploying emergency patch..."
    "$SCRIPT_DIR/patch-release-manager.sh" emergency-patch --version "$version" --type "$patch_type"
    
    echo -e "${CYAN}[WORKFLOW]${NC} Step 3/3: Monitoring deployment..."
    "$SCRIPT_DIR/patch-release-manager.sh" check-patch-status --version "$version"
    
    echo -e "${GREEN}[SUCCESS]${NC} Emergency patch workflow completed!"
    ;;
    
  # System operations
  status)
    show_status
    ;;
  help|--help|-h)
    show_help
    ;;
  --version)
    echo "SecureWatch Unified Deployment Interface v1.0.0"
    ;;
    
  # No operation provided
  "")
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           SecureWatch Unified Deployment                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${YELLOW}[INFO]${NC} Operation required. Use 'help' for available operations."
    echo ""
    echo "Quick commands:"
    echo "  $0 help              Show all operations"
    echo "  $0 status            Check system status"
    echo "  $0 customer-new      Deploy new customer"
    echo "  $0 patch-emergency   Emergency patch"
    echo ""
    ;;
    
  # Unknown operation
  *)
    echo -e "${RED}[ERROR]${NC} Unknown operation: $1"
    echo "Use '$0 help' to see available operations"
    exit 1
    ;;
esac 