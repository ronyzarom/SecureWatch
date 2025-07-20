#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Tag-Based Deployment Manager
# =============================================================================
# This script manages tag-based deployments for SecureWatch customers
# with support for different deployment policies and version strategies.
#
# Usage: ./tag-based-deploy.sh [command] [options]
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
COMMAND=""
TARGET_VERSION=""
CUSTOMER_NAME=""
DEPLOYMENT_POLICY=""
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    list-versions)
      COMMAND="list-versions"
      shift
      ;;
    check-policy)
      COMMAND="check-policy"
      shift
      ;;
    deploy)
      COMMAND="deploy"
      shift
      ;;
    validate)
      COMMAND="validate"
      shift
      ;;
    create-tag)
      COMMAND="create-tag"
      shift
      ;;
    --version)
      TARGET_VERSION="$2"
      shift 2
      ;;
    --customer)
      CUSTOMER_NAME="$2"
      shift 2
      ;;
    --policy)
      DEPLOYMENT_POLICY="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option $1"
      exit 1
      ;;
  esac
done

show_help() {
  cat << EOF
SecureWatch Tag-Based Deployment Manager

USAGE:
  $0 <command> [options]

COMMANDS:
  list-versions     List all available versions and their status
  check-policy      Check deployment policy for a customer
  deploy            Deploy a specific version to a customer
  validate          Validate version compatibility
  create-tag        Create a new version tag

OPTIONS:
  --version <ver>   Target version (e.g., v1.0.0, v1.1.0, latest)
  --customer <name> Customer name or slug
  --policy <policy> Deployment policy (enterprise, standard, startup, demo)
  --dry-run         Show what would be done without executing
  --help            Show this help message

EXAMPLES:
  # List all available versions
  $0 list-versions

  # Check deployment policy for a customer
  $0 check-policy --customer acme-corp

  # Deploy specific version to customer (respecting their policy)
  $0 deploy --customer acme-corp --version v1.0.0

  # Validate version compatibility for deployment policy
  $0 validate --version v1.1.0 --policy enterprise

  # Create new version tag
  $0 create-tag --version v1.1.0

DEPLOYMENT POLICIES:
  enterprise - Maximum stability, manual updates only
  standard   - Balanced stability and features  
  startup    - Latest features, faster updates
  demo       - Development versions allowed

EOF
}

# List available versions and their status
list_versions() {
  log_info "Available SecureWatch versions:"
  echo ""
  
  # Get all version tags
  local versions=$(git tag -l | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V)
  local latest_stable=$(echo "$versions" | tail -1)
  
  echo "📋 GIT TAGS:"
  echo "┌─────────────┬─────────────┬─────────────────┬─────────────────┐"
  echo "│ Version     │ Status      │ Support Level   │ Deployment Use  │"
  echo "├─────────────┼─────────────┼─────────────────┼─────────────────┤"
  
  for version in $versions; do
    local status="stable"
    local support="full"
    local use_case="production"
    
    if [[ "$version" == "$latest_stable" ]]; then
      status="latest"
    fi
    
    printf "│ %-11s │ %-11s │ %-15s │ %-15s │\n" "$version" "$status" "$support" "$use_case"
  done
  
  echo "├─────────────┼─────────────┼─────────────────┼─────────────────┤"
  printf "│ %-11s │ %-11s │ %-15s │ %-15s │\n" "main" "development" "experimental" "demo only"
  echo "└─────────────┴─────────────┴─────────────────┴─────────────────┘"
  
  echo ""
  echo "🎯 DEPLOYMENT RECOMMENDATIONS:"
  echo "├── Enterprise customers: $latest_stable (stable)"
  echo "├── Standard customers: $latest_stable (stable)"
  echo "├── Startup customers: $latest_stable or latest"
  echo "└── Demo environments: main branch"
  
  echo ""
  echo "📊 VERSION LIFECYCLE:"
  if [[ -f "$PROJECT_ROOT/config/deployment-policies.json" ]]; then
    jq -r '.version_lifecycle | to_entries[] | "├── \(.key): \(.value.status) (\(.value.support_level) support)"' "$PROJECT_ROOT/config/deployment-policies.json"
  fi
}

# Check deployment policy for a customer
check_policy() {
  if [[ -z "$CUSTOMER_NAME" ]]; then
    log_error "Customer name required. Use --customer <name>"
    exit 1
  fi
  
  log_info "Checking deployment policy for: $CUSTOMER_NAME"
  
  # Find customer in registry
  local customer_data=$(jq -r --arg name "$CUSTOMER_NAME" '.customers[] | select(.name == $name or .slug == $name)' "$PROJECT_ROOT/config/customers.json")
  
  if [[ -z "$customer_data" || "$customer_data" == "null" ]]; then
    log_error "Customer not found: $CUSTOMER_NAME"
    exit 1
  fi
  
  local policy=$(echo "$customer_data" | jq -r '.deployment_policy')
  local current_version=$(echo "$customer_data" | jq -r '.current_version')
  local target_version=$(echo "$customer_data" | jq -r '.target_version')
  local deployment_source=$(echo "$customer_data" | jq -r '.deployment_source')
  local auto_update=$(echo "$customer_data" | jq -r '.auto_update')
  
  echo ""
  echo "📋 CUSTOMER DEPLOYMENT CONFIGURATION:"
  echo "├── Customer: $(echo "$customer_data" | jq -r '.name')"
  echo "├── Policy: $policy"
  echo "├── Current Version: $current_version"
  echo "├── Target Version: $target_version"
  echo "├── Deployment Source: $deployment_source"
  echo "├── Auto Update: $auto_update"
  echo "└── Industry: $(echo "$customer_data" | jq -r '.industry')"
  
  # Get policy details
  local policy_details=$(jq -r --arg policy "$policy" '.deployment_policies[$policy]' "$PROJECT_ROOT/config/deployment-policies.json")
  
  if [[ "$policy_details" != "null" ]]; then
    echo ""
    echo "🛡️ POLICY DETAILS:"
    echo "├── Description: $(echo "$policy_details" | jq -r '.description')"
    echo "├── Deployment Source: $(echo "$policy_details" | jq -r '.deployment_source')"
    echo "├── Auto Update: $(echo "$policy_details" | jq -r '.auto_update')"
    echo "├── Min Testing Period: $(echo "$policy_details" | jq -r '.minimum_testing_period')"
    echo "├── Rollback Window: $(echo "$policy_details" | jq -r '.rollback_window')"
    echo "└── Supported Versions: $(echo "$policy_details" | jq -r '.supported_versions | join(", ")')"
  fi
  
  # Check for available updates
  local latest_version=$(jq -r '.metadata.latest_version' "$PROJECT_ROOT/config/customers.json")
  if [[ "$current_version" != "$latest_version" ]]; then
    echo ""
    echo "🔄 UPDATE AVAILABLE:"
    echo "├── Current: $current_version"
    echo "├── Latest: $latest_version"
    echo "└── Update Command: ./scripts/update-customer.sh --version $latest_version --customer $CUSTOMER_NAME"
  fi
}

# Deploy specific version to customer
deploy_version() {
  if [[ -z "$CUSTOMER_NAME" || -z "$TARGET_VERSION" ]]; then
    log_error "Customer name and version required. Use --customer <name> --version <version>"
    exit 1
  fi
  
  log_info "Deploying version $TARGET_VERSION to customer: $CUSTOMER_NAME"
  
  # Validate customer exists
  local customer_data=$(jq -r --arg name "$CUSTOMER_NAME" '.customers[] | select(.name == $name or .slug == $name)' "$PROJECT_ROOT/config/customers.json")
  
  if [[ -z "$customer_data" || "$customer_data" == "null" ]]; then
    log_error "Customer not found: $CUSTOMER_NAME"
    exit 1
  fi
  
  # Get customer policy
  local policy=$(echo "$customer_data" | jq -r '.deployment_policy')
  
  # Validate version against policy
  if ! validate_version_for_policy "$TARGET_VERSION" "$policy"; then
    log_error "Version $TARGET_VERSION not allowed for policy $policy"
    exit 1
  fi
  
  # Execute deployment
  if $DRY_RUN; then
    log_info "[DRY RUN] Would deploy version $TARGET_VERSION to $CUSTOMER_NAME"
    log_info "[DRY RUN] Command: ./scripts/update-customer.sh --version $TARGET_VERSION --customer $CUSTOMER_NAME"
  else
    log_info "Executing deployment..."
    "$PROJECT_ROOT/scripts/update-customer.sh" --version "$TARGET_VERSION" --customer "$CUSTOMER_NAME"
  fi
}

# Validate version compatibility with deployment policy
validate_version_for_policy() {
  local version="$1"
  local policy="$2"
  
  if [[ -z "$policy" ]]; then
    policy="$DEPLOYMENT_POLICY"
  fi
  
  if [[ -z "$policy" ]]; then
    log_error "Deployment policy required. Use --policy <policy>"
    return 1
  fi
  
  log_info "Validating version $version for policy $policy"
  
  # Get policy configuration
  local policy_config=$(jq -r --arg policy "$policy" '.deployment_policies[$policy]' "$PROJECT_ROOT/config/deployment-policies.json")
  
  if [[ "$policy_config" == "null" ]]; then
    log_error "Unknown deployment policy: $policy"
    return 1
  fi
  
  local supported_versions=$(echo "$policy_config" | jq -r '.supported_versions[]')
  local deployment_source=$(echo "$policy_config" | jq -r '.deployment_source')
  
  # Check if version is supported
  local version_supported=false
  for supported in $supported_versions; do
    case "$supported" in
      "$version"|"latest"|"main")
        version_supported=true
        break
        ;;
    esac
  done
  
  # Additional validation based on deployment source
  case "$deployment_source" in
    "stable_tags_only")
      if [[ "$version" != v*.*.* ]]; then
        log_error "Policy $policy requires stable tag versions (v*.*.*)'"
        return 1
      fi
      ;;
    "latest_stable_tag")
      if [[ "$version" == "main" ]]; then
        log_error "Policy $policy does not allow main branch deployment"
        return 1
      fi
      ;;
  esac
  
  if $version_supported; then
    log_success "Version $version is compatible with policy $policy"
    return 0
  else
    log_error "Version $version not supported by policy $policy"
    log_info "Supported versions: $(echo "$supported_versions" | tr '\n' ', ')"
    return 1
  fi
}

# Validate version for deployment
validate_version() {
  if [[ -z "$TARGET_VERSION" ]]; then
    log_error "Version required. Use --version <version>"
    exit 1
  fi
  
  validate_version_for_policy "$TARGET_VERSION" "$DEPLOYMENT_POLICY"
}

# Create new version tag
create_version_tag() {
  if [[ -z "$TARGET_VERSION" ]]; then
    log_error "Version required. Use --version <version>"
    exit 1
  fi
  
  log_info "Creating new version tag: $TARGET_VERSION"
  
  # Validate version format
  if [[ ! "$TARGET_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_error "Invalid version format. Use format: v1.0.0"
    exit 1
  fi
  
  # Check if tag already exists
  if git tag -l | grep -q "^$TARGET_VERSION$"; then
    log_error "Tag $TARGET_VERSION already exists"
    exit 1
  fi
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would create tag: $TARGET_VERSION"
    return 0
  fi
  
  # Create tag
  read -p "Enter release notes for $TARGET_VERSION: " -r release_notes
  
  git tag -a "$TARGET_VERSION" -m "Release $TARGET_VERSION: $release_notes"
  
  log_success "Tag $TARGET_VERSION created"
  log_info "Push with: git push origin $TARGET_VERSION"
}

# Main execution
main() {
  if [[ -z "$COMMAND" ]]; then
    log_error "Command required. Use --help for usage information"
    exit 1
  fi
  
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           SecureWatch - Tag-Based Deployment            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  case "$COMMAND" in
    "list-versions")
      list_versions
      ;;
    "check-policy")
      check_policy
      ;;
    "deploy")
      deploy_version
      ;;
    "validate")
      validate_version
      ;;
    "create-tag")
      create_version_tag
      ;;
    *)
      log_error "Unknown command: $COMMAND"
      show_help
      exit 1
      ;;
  esac
}

# Run main function
main "$@" 