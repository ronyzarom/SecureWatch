#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Master Deployment Script
# =============================================================================
# Unified interface for all SecureWatch deployment operations.
# This script orchestrates all deployment scripts from a single entry point.
#
# Usage: ./securewatch-deploy.sh [category] [command] [options]
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_master() { echo -e "${PURPLE}[DEPLOY]${NC} $1"; }
log_workflow() { echo -e "${CYAN}[WORKFLOW]${NC} $1"; }

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
CATEGORY=""
COMMAND=""
REMAINING_ARGS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    # Main categories
    customer|customers)
      CATEGORY="customer"
      shift
      ;;
    patch|patches)
      CATEGORY="patch"
      shift
      ;;
    release|releases|minor)
      CATEGORY="release"
      shift
      ;;
    version|versions|tag)
      CATEGORY="version"
      shift
      ;;
    render)
      CATEGORY="render"
      shift
      ;;
    workflow|workflows)
      CATEGORY="workflow"
      shift
      ;;
    # Collect remaining arguments
    *)
      if [[ -z "$COMMAND" && -n "$CATEGORY" ]]; then
        COMMAND="$1"
      else
        REMAINING_ARGS+=("$1")
      fi
      shift
      ;;
  esac
done

# Function definitions
show_version() {
  echo "SecureWatch Deployment Manager v1.0.0"
  echo "Unified interface for all deployment operations"
}

show_help() {
  cat << EOF
${BOLD}SecureWatch Deployment Manager${NC}

${BOLD}USAGE:${NC}
  $0 <category> <command> [options]

${BOLD}CATEGORIES:${NC}
  ${GREEN}customer${NC}     Customer management and deployment
  ${CYAN}patch${NC}        Patch release management (v1.0.1, v1.0.2, etc.)
  ${BLUE}release${NC}      Minor release management (v1.1.0, v1.2.0, etc.)
  ${PURPLE}version${NC}      Version and tag-based deployment
  ${YELLOW}render${NC}       Render platform operations
  ${BOLD}workflow${NC}     Pre-built deployment workflows

${BOLD}QUICK COMMANDS:${NC}
  $0 status                    Show system status and health
  $0 customer new              Deploy new customer
  $0 patch emergency           Deploy emergency security patch
  $0 release plan              Plan new minor release
  $0 workflow full-deploy      Complete customer deployment workflow

${BOLD}EXAMPLES:${NC}
  # Deploy new customer
  $0 customer new --config config/my-customer.json --version v1.0.0

  # Emergency security patch
  $0 patch emergency --version v1.0.1 --type security

  # Plan minor release
  $0 release plan --version v1.1.0 --customers startup,standard

  # Check system status
  $0 status

  # Show help for specific category
  $0 customer --help
  $0 patch --help

${BOLD}WORKFLOW SHORTCUTS:${NC}
  $0 workflow new-customer     Complete new customer setup
  $0 workflow emergency-patch  Emergency patch deployment
  $0 workflow release-cycle    Full release cycle management

For detailed help on any category, use: $0 <category> --help

EOF
}

show_status() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║              SecureWatch System Status                  ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  log_info "Checking system components..."
  echo ""
  
  # Check script availability
  echo "📋 DEPLOYMENT SCRIPTS:"
  local scripts=(
    "new-customer.sh:Customer deployment"
    "patch-release-manager.sh:Patch management"
    "minor-release-manager.sh:Release management"
    "tag-based-deploy.sh:Version deployment"
    "render-deploy.sh:Render integration"
  )
  
  for script_info in "${scripts[@]}"; do
    local script_name="${script_info%%:*}"
    local script_desc="${script_info##*:}"
    if [[ -f "$SCRIPT_DIR/$script_name" && -x "$SCRIPT_DIR/$script_name" ]]; then
      echo "├── ✅ $script_name ($script_desc)"
    else
      echo "├── ❌ $script_name ($script_desc) - Missing or not executable"
    fi
  done
  
  echo ""
  
  # Check configuration files
  echo "⚙️ CONFIGURATION FILES:"
  local configs=(
    "customers.json:Customer database"
    "deployment-policies.json:Deployment policies"
    "patch-release-policies.json:Patch policies"
    "minor-release-policies.json:Release policies"
    "render-deployment.json:Render configuration"
  )
  
  for config_info in "${configs[@]}"; do
    local config_name="${config_info%%:*}"
    local config_desc="${config_info##*:}"
    if [[ -f "$PROJECT_ROOT/config/$config_name" ]]; then
      echo "├── ✅ $config_name ($config_desc)"
    else
      echo "├── ❌ $config_name ($config_desc) - Missing"
    fi
  done
  
  echo ""
  
  # Check API key
  echo "🔑 API CONFIGURATION:"
  if [[ -f "$PROJECT_ROOT/backend/.env" ]] && grep -q "RENDER_API_KEY" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo "├── ✅ Render API key configured"
  else
    echo "├── ⚠️ Render API key not found in backend/.env"
  fi
  
  echo ""
  
  # Check Git status
  echo "📦 VERSION CONTROL:"
  if git rev-parse --git-dir > /dev/null 2>&1; then
    local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    local latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "no tags")
    echo "├── ✅ Git repository initialized"
    echo "├── 🌿 Current branch: $current_branch"
    echo "└── 🏷️ Latest tag: $latest_tag"
  else
    echo "└── ❌ Not a Git repository"
  fi
  
  echo ""
  
  # Overall status
  local issues=0
  echo "🎯 SYSTEM HEALTH:"
  if [[ ! -f "$SCRIPT_DIR/new-customer.sh" ]]; then ((issues++)); fi
  if [[ ! -f "$PROJECT_ROOT/config/customers.json" ]]; then ((issues++)); fi
  if [[ ! -f "$PROJECT_ROOT/backend/.env" ]] || ! grep -q "RENDER_API_KEY" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo "├── ⚠️ API key configuration recommended for full automation"
  fi
  
  if [[ $issues -eq 0 ]]; then
    echo "└── ✅ System ready for deployment operations"
  else
    echo "└── ❌ $issues issue(s) found - check components above"
  fi
  
  echo ""
}

# Route to customer operations
handle_customer() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    new|create|deploy)
      log_master "Deploying new customer..."
      exec "$SCRIPT_DIR/new-customer.sh" "$@"
      ;;
    update)
      log_master "Updating customer..."
      exec "$SCRIPT_DIR/update-customer.sh" "$@"
      ;;
    list)
      log_master "Listing customers..."
      if [[ -f "$PROJECT_ROOT/config/customers.json" ]]; then
        jq -r '.customers[] | "- \(.name) (\(.slug)) - \(.deployment_policy) - \(.current_version)"' "$PROJECT_ROOT/config/customers.json"
      else
        log_error "customers.json not found"
        exit 1
      fi
      ;;
    health|status)
      log_master "Checking customer health..."
      exec "$SCRIPT_DIR/render-deploy.sh" check-health "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Customer Management Commands:${NC}"
      echo ""
      echo "  ${GREEN}new${NC}        Deploy new customer"
      echo "  ${GREEN}update${NC}     Update existing customer"
      echo "  ${GREEN}list${NC}       List all customers"
      echo "  ${GREEN}health${NC}     Check customer health"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 customer new --config config/my-customer.json --version v1.0.0"
      echo "  $0 customer update --customer acme-corp --version v1.0.1"
      echo "  $0 customer list"
      echo "  $0 customer health --customer acme-corp"
      echo ""
      ;;
    *)
      log_error "Unknown customer command: $cmd"
      echo "Use: $0 customer --help"
      exit 1
      ;;
  esac
}

# Route to patch operations
handle_patch() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    plan)
      log_master "Planning patch release..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" plan-patch "$@"
      ;;
    deploy)
      log_master "Deploying patch..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" deploy-patch "$@"
      ;;
    emergency)
      log_master "Emergency patch deployment..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" emergency-patch "$@"
      ;;
    status|check)
      log_master "Checking patch status..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" check-patch-status "$@"
      ;;
    validate)
      log_master "Validating patch..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" validate-patch "$@"
      ;;
    rollback)
      log_master "Rolling back patch..."
      exec "$SCRIPT_DIR/patch-release-manager.sh" rollback-patch "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Patch Management Commands:${NC}"
      echo ""
      echo "  ${CYAN}plan${NC}       Create patch release plan"
      echo "  ${CYAN}deploy${NC}     Deploy patch to customers"
      echo "  ${RED}emergency${NC}  Emergency patch deployment"
      echo "  ${CYAN}status${NC}     Check patch deployment status"
      echo "  ${CYAN}validate${NC}   Validate patch version"
      echo "  ${CYAN}rollback${NC}   Rollback patch deployment"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 patch plan --version v1.0.1 --type security"
      echo "  $0 patch deploy --version v1.0.1 --customers startup"
      echo "  $0 patch emergency --version v1.0.1 --type security"
      echo "  $0 patch status --version v1.0.1"
      echo ""
      ;;
    *)
      log_error "Unknown patch command: $cmd"
      echo "Use: $0 patch --help"
      exit 1
      ;;
  esac
}

# Route to release operations
handle_release() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    plan)
      log_master "Planning minor release..."
      exec "$SCRIPT_DIR/minor-release-manager.sh" plan-release "$@"
      ;;
    deploy)
      log_master "Deploying minor release..."
      exec "$SCRIPT_DIR/minor-release-manager.sh" deploy-phase "$@"
      ;;
    status|check)
      log_master "Checking release status..."
      exec "$SCRIPT_DIR/minor-release-manager.sh" check-release-status "$@"
      ;;
    rollback)
      log_master "Rolling back release..."
      exec "$SCRIPT_DIR/minor-release-manager.sh" rollback-phase "$@"
      ;;
    validate)
      log_master "Validating release..."
      exec "$SCRIPT_DIR/minor-release-manager.sh" validate-release "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Release Management Commands:${NC}"
      echo ""
      echo "  ${BLUE}plan${NC}       Create minor release plan"
      echo "  ${BLUE}deploy${NC}     Deploy release phase"
      echo "  ${BLUE}status${NC}     Check release status"
      echo "  ${BLUE}rollback${NC}   Rollback release phase"
      echo "  ${BLUE}validate${NC}   Validate release version"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 release plan --version v1.1.0"
      echo "  $0 release deploy --version v1.1.0 --phase demo"
      echo "  $0 release status --version v1.1.0"
      echo ""
      ;;
    *)
      log_error "Unknown release command: $cmd"
      echo "Use: $0 release --help"
      exit 1
      ;;
  esac
}

# Route to version operations
handle_version() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    list)
      log_master "Listing versions..."
      exec "$SCRIPT_DIR/tag-based-deploy.sh" list-versions "$@"
      ;;
    deploy)
      log_master "Deploying version..."
      exec "$SCRIPT_DIR/tag-based-deploy.sh" deploy-version "$@"
      ;;
    validate)
      log_master "Validating version..."
      exec "$SCRIPT_DIR/tag-based-deploy.sh" validate-version "$@"
      ;;
    create)
      log_master "Creating version tag..."
      exec "$SCRIPT_DIR/tag-based-deploy.sh" create-tag "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Version Management Commands:${NC}"
      echo ""
      echo "  ${PURPLE}list${NC}       List available versions"
      echo "  ${PURPLE}deploy${NC}     Deploy specific version"
      echo "  ${PURPLE}validate${NC}   Validate version compatibility"
      echo "  ${PURPLE}create${NC}     Create new version tag"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 version list"
      echo "  $0 version deploy --version v1.0.0 --customers acme-corp"
      echo "  $0 version validate --version v1.1.0 --policy enterprise"
      echo ""
      ;;
    *)
      log_error "Unknown version command: $cmd"
      echo "Use: $0 version --help"
      exit 1
      ;;
  esac
}

# Route to render operations
handle_render() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    deploy)
      log_master "Deploying to Render..."
      exec "$SCRIPT_DIR/render-deploy.sh" deploy-customer "$@"
      ;;
    health)
      log_master "Checking Render health..."
      exec "$SCRIPT_DIR/render-deploy.sh" check-health "$@"
      ;;
    rollback)
      log_master "Rolling back Render deployment..."
      exec "$SCRIPT_DIR/render-deploy.sh" rollback-customer "$@"
      ;;
    logs)
      log_master "Fetching Render logs..."
      exec "$SCRIPT_DIR/render-deploy.sh" logs "$@"
      ;;
    env)
      log_master "Updating environment variables..."
      exec "$SCRIPT_DIR/render-deploy.sh" update-env-vars "$@"
      ;;
    list)
      log_master "Listing deployments..."
      exec "$SCRIPT_DIR/render-deploy.sh" list-deployments "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Render Platform Commands:${NC}"
      echo ""
      echo "  ${YELLOW}deploy${NC}     Deploy to Render services"
      echo "  ${YELLOW}health${NC}     Check service health"
      echo "  ${YELLOW}rollback${NC}   Rollback deployment"
      echo "  ${YELLOW}logs${NC}       Fetch service logs"
      echo "  ${YELLOW}env${NC}        Update environment variables"
      echo "  ${YELLOW}list${NC}       List recent deployments"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 render deploy --version v1.0.0 --customer acme-corp"
      echo "  $0 render health --customer acme-corp"
      echo "  $0 render logs --customer acme-corp --service backend"
      echo ""
      ;;
    *)
      log_error "Unknown render command: $cmd"
      echo "Use: $0 render --help"
      exit 1
      ;;
  esac
}

# Handle workflow operations (multi-step processes)
handle_workflow() {
  local cmd="$1"
  shift
  
  case "$cmd" in
    new-customer|full-deploy)
      workflow_new_customer "$@"
      ;;
    emergency-patch)
      workflow_emergency_patch "$@"
      ;;
    release-cycle)
      workflow_release_cycle "$@"
      ;;
    customer-update)
      workflow_customer_update "$@"
      ;;
    --help|help)
      echo ""
      echo "${BOLD}Workflow Commands (Multi-step processes):${NC}"
      echo ""
      echo "  ${BOLD}new-customer${NC}    Complete new customer deployment workflow"
      echo "  ${BOLD}emergency-patch${NC} Emergency patch deployment workflow"
      echo "  ${BOLD}release-cycle${NC}   Full minor release cycle workflow"
      echo "  ${BOLD}customer-update${NC} Customer version update workflow"
      echo ""
      echo "${BOLD}Examples:${NC}"
      echo "  $0 workflow new-customer --config config/customer.json"
      echo "  $0 workflow emergency-patch --version v1.0.1 --type security"
      echo "  $0 workflow release-cycle --version v1.1.0"
      echo ""
      ;;
    *)
      log_error "Unknown workflow command: $cmd"
      echo "Use: $0 workflow --help"
      exit 1
      ;;
  esac
}

# Workflow: Complete new customer deployment
workflow_new_customer() {
  log_workflow "Starting complete new customer deployment workflow..."
  echo ""
  
  local config_file=""
  local version="v1.0.0"
  local dry_run=false
  
  # Parse workflow arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --config)
        config_file="$2"
        shift 2
        ;;
      --version)
        version="$2"
        shift 2
        ;;
      --dry-run)
        dry_run=true
        shift
        ;;
      *)
        shift
        ;;
    esac
  done
  
  if [[ -z "$config_file" ]]; then
    log_error "Configuration file required. Use --config <file>"
    exit 1
  fi
  
  echo "🚀 NEW CUSTOMER DEPLOYMENT WORKFLOW"
  echo "==================================="
  echo "Configuration: $config_file"
  echo "Version: $version"
  echo "Dry Run: $dry_run"
  echo ""
  
  # Step 1: Validate configuration
  log_workflow "Step 1/5: Validating configuration..."
  if [[ ! -f "$config_file" ]]; then
    log_error "Configuration file not found: $config_file"
    exit 1
  fi
  log_success "Configuration file validated"
  
  # Step 2: Test deployment (dry run)
  log_workflow "Step 2/5: Testing deployment (dry run)..."
  if ! "$SCRIPT_DIR/new-customer.sh" --config "$config_file" --version "$version" --dry-run; then
    log_error "Dry run failed - check configuration"
    exit 1
  fi
  log_success "Dry run completed successfully"
  
  if $dry_run; then
    log_info "Dry run mode - stopping here"
    exit 0
  fi
  
  # Step 3: Deploy customer
  log_workflow "Step 3/5: Deploying customer..."
  if ! "$SCRIPT_DIR/new-customer.sh" --config "$config_file" --version "$version"; then
    log_error "Customer deployment failed"
    exit 1
  fi
  log_success "Customer deployed successfully"
  
  # Step 4: Verify health
  log_workflow "Step 4/5: Verifying deployment health..."
  local customer_slug=$(jq -r '.customer.slug' "$config_file")
  sleep 30  # Wait for services to start
  if ! "$SCRIPT_DIR/render-deploy.sh" check-health --customer "$customer_slug"; then
    log_warning "Health check failed - services may still be starting"
  else
    log_success "Health check passed"
  fi
  
  # Step 5: Summary
  log_workflow "Step 5/5: Deployment summary..."
  echo ""
  echo "✅ CUSTOMER DEPLOYMENT COMPLETE!"
  echo "================================"
  echo "Customer: $(jq -r '.customer.name' "$config_file")"
  echo "Slug: $customer_slug"
  echo "Version: $version"
  echo "Portal URL: https://securewatch-$customer_slug-frontend.onrender.com"
  echo "Admin: $(jq -r '.admin.email' "$config_file")"
  echo ""
  log_success "New customer deployment workflow completed successfully!"
}

# Workflow: Emergency patch deployment
workflow_emergency_patch() {
  log_workflow "Starting emergency patch deployment workflow..."
  echo ""
  
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
    log_error "Patch version required. Use --version v1.0.1"
    exit 1
  fi
  
  echo "🚨 EMERGENCY PATCH DEPLOYMENT WORKFLOW"
  echo "======================================"
  echo "Version: $version"
  echo "Type: $patch_type"
  echo ""
  
  # Step 1: Validate patch
  log_workflow "Step 1/4: Validating patch..."
  if ! "$SCRIPT_DIR/patch-release-manager.sh" validate-patch --version "$version" --type "$patch_type"; then
    log_error "Patch validation failed"
    exit 1
  fi
  
  # Step 2: Plan patch
  log_workflow "Step 2/4: Planning emergency patch..."
  "$SCRIPT_DIR/patch-release-manager.sh" plan-patch --version "$version" --type "$patch_type" --urgency critical
  
  # Step 3: Deploy patch
  log_workflow "Step 3/4: Deploying emergency patch to all customers..."
  "$SCRIPT_DIR/patch-release-manager.sh" emergency-patch --version "$version" --type "$patch_type"
  
  # Step 4: Monitor
  log_workflow "Step 4/4: Monitoring deployment..."
  "$SCRIPT_DIR/patch-release-manager.sh" check-patch-status --version "$version"
  
  log_success "Emergency patch deployment workflow completed!"
}

# Workflow: Customer version update
workflow_customer_update() {
  log_workflow "Starting customer update workflow..."
  
  local customer=""
  local version=""
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --customer)
        customer="$2"
        shift 2
        ;;
      --version)
        version="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  
  if [[ -z "$customer" || -z "$version" ]]; then
    log_error "Customer and version required. Use --customer <slug> --version <version>"
    exit 1
  fi
  
  echo "🔄 CUSTOMER UPDATE WORKFLOW"
  echo "=========================="
  echo "Customer: $customer"
  echo "Version: $version"
  echo ""
  
  # Step 1: Check current version
  log_workflow "Step 1/4: Checking current version..."
  "$SCRIPT_DIR/render-deploy.sh" list-deployments --customer "$customer" | head -n 5
  
  # Step 2: Validate new version
  log_workflow "Step 2/4: Validating new version..."
  "$SCRIPT_DIR/tag-based-deploy.sh" validate-version --version "$version" --customer "$customer"
  
  # Step 3: Deploy update
  log_workflow "Step 3/4: Deploying update..."
  "$SCRIPT_DIR/render-deploy.sh" deploy-customer --version "$version" --customer "$customer"
  
  # Step 4: Verify health
  log_workflow "Step 4/4: Verifying deployment..."
  sleep 30
  "$SCRIPT_DIR/render-deploy.sh" check-health --customer "$customer"
  
  log_success "Customer update workflow completed!"
}

# Main execution
main() {
  # Handle special commands first
  for arg in "$@"; do
    case "$arg" in
      -h|--help|help)
        show_help
        exit 0
        ;;
      --version)
        show_version
        exit 0
        ;;
      status)
        show_status
        exit 0
        ;;
    esac
  done

  if [[ -z "$CATEGORY" ]]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║              SecureWatch Deployment Manager             ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    log_error "Category required. Use --help for usage information"
    echo ""
    echo "Available categories: customer, patch, release, version, render, workflow"
    echo "Quick help: $0 --help"
    echo "System status: $0 status"
    echo ""
    exit 1
  fi
  
  # Route to appropriate handler
  case "$CATEGORY" in
    "customer")
      handle_customer "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    "patch")
      handle_patch "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    "release")
      handle_release "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    "version")
      handle_version "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    "render")
      handle_render "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    "workflow")
      handle_workflow "$COMMAND" "${REMAINING_ARGS[@]}"
      ;;
    *)
      log_error "Unknown category: $CATEGORY"
      show_help
      exit 1
      ;;
  esac
}

# Run main function
main "$@" 