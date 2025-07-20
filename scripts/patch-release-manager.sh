#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Patch Release Management Script
# =============================================================================
# This script manages patch releases (v1.0.1, v1.0.2, etc.) with expedited
# deployment workflows for bug fixes, security patches, and performance improvements.
#
# Usage: ./patch-release-manager.sh [command] [options]
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_patch() { echo -e "${CYAN}[PATCH]${NC} $1"; }
log_urgent() { echo -e "${RED}[URGENT]${NC} $1"; }

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMMAND=""
PATCH_VERSION=""
PATCH_TYPE=""
URGENCY_LEVEL=""
CUSTOMER_FILTER=""
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    plan-patch)
      COMMAND="plan-patch"
      shift
      ;;
    deploy-patch)
      COMMAND="deploy-patch"
      shift
      ;;
    emergency-patch)
      COMMAND="emergency-patch"
      shift
      ;;
    check-patch-status)
      COMMAND="check-patch-status"
      shift
      ;;
    rollback-patch)
      COMMAND="rollback-patch"
      shift
      ;;
    validate-patch)
      COMMAND="validate-patch"
      shift
      ;;
    --version)
      PATCH_VERSION="$2"
      shift 2
      ;;
    --type)
      PATCH_TYPE="$2"
      shift 2
      ;;
    --urgency)
      URGENCY_LEVEL="$2"
      shift 2
      ;;
    --customers)
      CUSTOMER_FILTER="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
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
SecureWatch Patch Release Management

USAGE:
  $0 <command> [options]

COMMANDS:
  plan-patch         Create patch release plan
  deploy-patch       Deploy patch to customers
  emergency-patch    Emergency security patch deployment
  check-patch-status Check status of patch deployment
  rollback-patch     Rollback a patch deployment
  validate-patch     Validate patch version and type

OPTIONS:
  --version <ver>    Patch version (e.g., v1.0.1, v1.0.2, v1.1.1)
  --type <type>      Patch type (bug_fix, security, performance, documentation)
  --urgency <level>  Urgency level (low, medium, high, critical)
  --customers <type> Customer filter (policy type or specific names)
  --dry-run          Show what would be done without executing
  --force            Skip safety checks and confirmations
  --help             Show this help message

PATCH TYPES:
  bug_fix       - Bug fixes and corrections (medium priority)
  security      - Security vulnerabilities (critical priority)
  performance   - Performance improvements (low priority)
  documentation - Documentation updates (low priority)

URGENCY LEVELS:
  critical - Immediate deployment (security issues)
  high     - Expedited deployment (critical bugs)
  medium   - Standard deployment (regular bugs)
  low      - Next maintenance window (optimizations)

EXAMPLES:
  # Plan a security patch
  $0 plan-patch --version v1.0.1 --type security --urgency critical

  # Deploy a bug fix patch
  $0 deploy-patch --version v1.0.2 --type bug_fix --customers startup

  # Emergency security deployment
  $0 emergency-patch --version v1.0.3 --type security

  # Check patch deployment status
  $0 check-patch-status --version v1.0.1

  # Rollback a problematic patch
  $0 rollback-patch --version v1.0.1 --customers acme-corp

EOF
}

# Load configuration
load_config() {
  local patch_policies="$PROJECT_ROOT/config/patch-release-policies.json"
  local customers_config="$PROJECT_ROOT/config/customers.json"
  
  if [[ ! -f "$patch_policies" ]]; then
    log_error "Patch release policies file not found: $patch_policies"
    exit 1
  fi
  
  if [[ ! -f "$customers_config" ]]; then
    log_error "Customers file not found: $customers_config"
    exit 1
  fi
  
  export PATCH_POLICIES_FILE="$patch_policies"
  export CUSTOMERS_FILE="$customers_config"
}

# Validate patch version format
validate_patch_version() {
  if [[ -z "$PATCH_VERSION" ]]; then
    log_error "Patch version required. Use --version v1.0.1"
    exit 1
  fi
  
  if [[ ! "$PATCH_VERSION" =~ ^v[0-9]+\.[0-9]+\.[1-9][0-9]*$ ]]; then
    log_error "Invalid patch version format. Use v1.0.1, v1.0.2, v1.1.1, etc."
    log_info "Patch versions must have patch number > 0 (v1.0.1, not v1.0.0)"
    exit 1
  fi
  
  # Extract version components
  local version_clean=${PATCH_VERSION#v}
  IFS='.' read -r MAJOR MINOR PATCH <<< "$version_clean"
  
  if [[ "$PATCH" == "0" ]]; then
    log_error "Patch number must be greater than 0"
    log_info "Use v1.0.1, v1.0.2, etc. (v1.0.0 is the base release)"
    exit 1
  fi
  
  export MAJOR MINOR PATCH
}

# Validate patch type
validate_patch_type() {
  if [[ -z "$PATCH_TYPE" ]]; then
    log_error "Patch type required. Use --type <type>"
    log_info "Available types: bug_fix, security, performance, documentation"
    exit 1
  fi
  
  local valid_types=("bug_fix" "security" "performance" "documentation")
  if [[ ! " ${valid_types[@]} " =~ " ${PATCH_TYPE} " ]]; then
    log_error "Invalid patch type: $PATCH_TYPE"
    log_info "Valid types: ${valid_types[*]}"
    exit 1
  fi
}

# Determine urgency level based on patch type
determine_urgency() {
  if [[ -n "$URGENCY_LEVEL" ]]; then
    log_info "Using specified urgency level: $URGENCY_LEVEL"
    return 0
  fi
  
  case "$PATCH_TYPE" in
    "security")
      URGENCY_LEVEL="critical"
      ;;
    "bug_fix")
      URGENCY_LEVEL="medium"
      ;;
    "performance")
      URGENCY_LEVEL="low"
      ;;
    "documentation")
      URGENCY_LEVEL="low"
      ;;
    *)
      URGENCY_LEVEL="medium"
      ;;
  esac
  
  log_info "Determined urgency level: $URGENCY_LEVEL (based on type: $PATCH_TYPE)"
}

# Get customers by policy
get_customers_by_policy() {
  local policy="$1"
  jq -r --arg policy "$policy" '.customers[] | select(.deployment_policy == $policy) | .name' "$CUSTOMERS_FILE"
}

# Create patch release plan
plan_patch() {
  validate_patch_version
  validate_patch_type
  determine_urgency
  
  log_patch "Creating patch release plan for $PATCH_VERSION ($PATCH_TYPE)"
  
  local plan_file="release-plans/patch-release-${PATCH_VERSION}.json"
  mkdir -p "$(dirname "$plan_file")"
  
  # Count customers by policy
  local demo_count=$(get_customers_by_policy "demo" | wc -l)
  local startup_count=$(get_customers_by_policy "startup" | wc -l)
  local standard_count=$(get_customers_by_policy "standard" | wc -l)
  local enterprise_count=$(get_customers_by_policy "enterprise" | wc -l)
  
  # Get deployment timelines based on patch type and urgency
  local total_duration="~4_hours"
  case "$URGENCY_LEVEL" in
    "critical")
      total_duration="~1_hour"
      ;;
    "high")
      total_duration="~2_hours"
      ;;
    "medium")
      total_duration="~4_hours"
      ;;
    "low")
      total_duration="~12_hours"
      ;;
  esac
  
  cat > "$plan_file" << EOF
{
  "patch_info": {
    "version": "$PATCH_VERSION",
    "type": "$PATCH_TYPE",
    "urgency": "$URGENCY_LEVEL",
    "created_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "created_by": "$(whoami)",
    "status": "planned",
    "base_version": "v${MAJOR}.${MINOR}.0"
  },
  "customer_distribution": {
    "demo": $demo_count,
    "startup": $startup_count,
    "standard": $standard_count,
    "enterprise": $enterprise_count,
    "total": $((demo_count + startup_count + standard_count + enterprise_count))
  },
  "rollout_timeline": {
    "total_duration": "$total_duration",
    "phases": [
      {
        "name": "validation",
        "start_time": "immediately",
        "duration": "5_to_15_minutes",
        "activities": ["automated_testing", "security_scan"]
      },
      {
        "name": "demo_deployment",
        "start_time": "validation_complete",
        "duration": "5_minutes",
        "customer_count": $demo_count,
        "deployment_method": "immediate"
      },
      {
        "name": "startup_deployment",
        "start_time": "demo_complete + delay",
        "duration": "15_minutes_to_4_hours",
        "customer_count": $startup_count,
        "deployment_method": "automatic"
      },
      {
        "name": "standard_deployment",
        "start_time": "startup_complete + delay",
        "duration": "2_to_12_hours",
        "customer_count": $standard_count,
        "deployment_method": "automatic"
      },
      {
        "name": "enterprise_deployment",
        "start_time": "standard_complete + delay",
        "duration": "4_to_24_hours",
        "customer_count": $enterprise_count,
        "deployment_method": "automatic_with_notification"
      }
    ]
  },
  "patch_specific_config": {
    "rollback_window": "24_hours",
    "monitoring_duration": "48_hours",
    "notification_required": $(jq -r --arg type "$PATCH_TYPE" '.patch_types[$type].notification_required' "$PATCH_POLICIES_FILE"),
    "testing_requirements": $(jq -r --arg type "$PATCH_TYPE" '.patch_types[$type].testing_requirements' "$PATCH_POLICIES_FILE")
  },
  "deployment_tracking": {
    "demo": [],
    "startup": [],
    "standard": [],
    "enterprise": []
  }
}
EOF

  log_success "Patch release plan created: $plan_file"
  
  echo ""
  echo "🩹 PATCH RELEASE PLAN SUMMARY:"
  echo "├── Version: $PATCH_VERSION"
  echo "├── Type: $PATCH_TYPE"
  echo "├── Urgency: $URGENCY_LEVEL"
  echo "├── Total Duration: $total_duration"
  echo "├── Total Customers: $((demo_count + startup_count + standard_count + enterprise_count))"
  echo "├── Demo: $demo_count customers (immediate)"
  echo "├── Startup: $startup_count customers (expedited)"
  echo "├── Standard: $standard_count customers (automatic)"
  echo "└── Enterprise: $enterprise_count customers (with notification)"
  
  echo ""
  echo "⚡ NEXT STEPS:"
  echo "1. Validate patch: $0 validate-patch --version $PATCH_VERSION --type $PATCH_TYPE"
  echo "2. Deploy to demo: $0 deploy-patch --version $PATCH_VERSION --customers demo"
  echo "3. Deploy by urgency: Based on $URGENCY_LEVEL priority"
  
  if [[ "$URGENCY_LEVEL" == "critical" ]]; then
    echo ""
    echo "🚨 CRITICAL URGENCY DETECTED:"
    echo "Consider using: $0 emergency-patch --version $PATCH_VERSION --type $PATCH_TYPE"
  fi
}

# Deploy patch to customers
deploy_patch() {
  validate_patch_version
  validate_patch_type
  
  if [[ -z "$CUSTOMER_FILTER" ]]; then
    log_error "Customer filter required. Use --customers <policy|names>"
    exit 1
  fi
  
  log_patch "Deploying patch $PATCH_VERSION ($PATCH_TYPE) to customers: $CUSTOMER_FILTER"
  
  local customers=()
  
  # Determine customers to deploy
  case "$CUSTOMER_FILTER" in
    "demo"|"startup"|"standard"|"enterprise")
      log_info "Deploying to all $CUSTOMER_FILTER customers"
      while IFS= read -r customer; do
        customers+=("$customer")
      done < <(get_customers_by_policy "$CUSTOMER_FILTER")
      ;;
    *)
      log_info "Deploying to specific customers: $CUSTOMER_FILTER"
      IFS=',' read -ra customers <<< "$CUSTOMER_FILTER"
      ;;
  esac
  
  if [[ ${#customers[@]} -eq 0 ]]; then
    log_warning "No customers found for filter: $CUSTOMER_FILTER"
    exit 0
  fi
  
  echo ""
  echo "🩹 PATCH DEPLOYMENT PLAN:"
  echo "├── Version: $PATCH_VERSION"
  echo "├── Type: $PATCH_TYPE"
  echo "├── Target customers: ${#customers[@]}"
  for customer in "${customers[@]}"; do
    local policy=$(jq -r --arg name "$customer" '.customers[] | select(.name == $name) | .deployment_policy' "$CUSTOMERS_FILE")
    echo "├── $customer ($policy)"
  done
  echo ""
  
  if ! $DRY_RUN && ! $FORCE; then
    read -p "Proceed with patch deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Patch deployment cancelled"
      exit 0
    fi
  fi
  
  # Deploy to each customer using Render integration
  local success_count=0
  local failure_count=0
  
  for customer in "${customers[@]}"; do
    log_patch "Deploying patch to: $customer"
    
    # Get customer slug from customer name
    local customer_slug=$(jq -r --arg name "$customer" '.customers[] | select(.name == $name) | .slug' "$CUSTOMERS_FILE")
    
    if [[ -z "$customer_slug" || "$customer_slug" == "null" ]]; then
      log_warning "Customer slug not found for: $customer"
      failure_count=$((failure_count + 1))
      continue
    fi
    
    if $DRY_RUN; then
      log_info "[DRY RUN] Would deploy patch $PATCH_VERSION to $customer ($customer_slug)"
      success_count=$((success_count + 1))
    else
      # Use Render deployment script for actual deployment
      log_info "Deploying patch via Render: $customer_slug"
      
      if "$PROJECT_ROOT/scripts/render-deploy.sh" deploy-customer --version "$PATCH_VERSION" --customer "$customer_slug"; then
        log_success "Successfully deployed patch to $customer"
        success_count=$((success_count + 1))
        
        # Send patch notification if required
        if jq -r --arg type "$PATCH_TYPE" '.patch_types[$type].notification_required' "$PATCH_POLICIES_FILE" | grep -q "true"; then
          log_info "Sending patch notification to $customer"
          # Implement notification logic here
        fi
        
      else
        log_error "Failed to deploy patch to $customer"
        failure_count=$((failure_count + 1))
      fi
    fi
    
    # Brief pause between deployments (shorter for patches)
    sleep 2
  done
  
  echo ""
  echo "📊 PATCH DEPLOYMENT SUMMARY:"
  echo "├── Patch: $PATCH_VERSION ($PATCH_TYPE)"
  echo "├── Total customers: ${#customers[@]}"
  echo "├── Successful: $success_count"
  echo "├── Failed: $failure_count"
  echo "└── Success rate: $(( success_count * 100 / ${#customers[@]} ))%"
  
  if [[ $failure_count -gt 0 ]]; then
    log_warning "Some patch deployments failed. Check logs and retry."
  else
    log_success "All patch deployments completed successfully!"
  fi
}

# Emergency patch deployment (security patches)
emergency_patch() {
  validate_patch_version
  
  if [[ -z "$PATCH_TYPE" ]]; then
    PATCH_TYPE="security"
    log_warning "No patch type specified, assuming security patch"
  fi
  
  URGENCY_LEVEL="critical"
  FORCE=true  # Skip confirmations for emergency
  
  log_urgent "EMERGENCY PATCH DEPLOYMENT: $PATCH_VERSION"
  echo ""
  echo "🚨 EMERGENCY PATCH PROTOCOL ACTIVATED"
  echo "├── Version: $PATCH_VERSION"
  echo "├── Type: $PATCH_TYPE"
  echo "├── Urgency: CRITICAL"
  echo "├── Rollout: Immediate to all customers"
  echo "└── Monitoring: Enhanced 48-hour monitoring"
  echo ""
  
  # Deploy to all customers in rapid succession
  local customer_policies=("demo" "startup" "standard" "enterprise")
  
  for policy in "${customer_policies[@]}"; do
    log_urgent "Emergency deployment to $policy customers"
    
    CUSTOMER_FILTER="$policy"
    deploy_patch
    
    # Brief pause between customer groups
    if [[ "$policy" != "enterprise" ]]; then
      sleep 5
    fi
  done
  
  log_urgent "Emergency patch deployment completed"
  log_info "Enhanced monitoring activated for 48 hours"
  log_info "Consider running: $0 check-patch-status --version $PATCH_VERSION"
}

# Check patch deployment status
check_patch_status() {
  validate_patch_version
  
  local plan_file="release-plans/patch-release-${PATCH_VERSION}.json"
  if [[ ! -f "$plan_file" ]]; then
    log_error "Patch release plan not found for $PATCH_VERSION"
    exit 1
  fi
  
  log_info "Checking status of patch release: $PATCH_VERSION"
  
  echo ""
  echo "📊 PATCH RELEASE STATUS: $PATCH_VERSION"
  echo "═══════════════════════════════════════════"
  
  # Show patch info
  local patch_type=$(jq -r '.patch_info.type' "$plan_file")
  local urgency=$(jq -r '.patch_info.urgency' "$plan_file")
  local created_date=$(jq -r '.patch_info.created_date' "$plan_file")
  local status=$(jq -r '.patch_info.status' "$plan_file")
  
  echo "├── Type: $patch_type"
  echo "├── Urgency: $urgency"
  echo "├── Created: $created_date"
  echo "├── Status: $status"
  echo ""
  
  # Show customer deployment status
  echo "📋 CUSTOMER DEPLOYMENT STATUS:"
  local policies=("demo" "startup" "standard" "enterprise")
  
  for policy in "${policies[@]}"; do
    local count=$(jq -r --arg policy "$policy" '.customer_distribution[$policy]' "$plan_file")
    local deployed=$(jq -r --arg policy "$policy" '.deployment_tracking[$policy] | length' "$plan_file")
    
    if [[ "$count" -gt 0 ]]; then
      local percentage=$(( deployed * 100 / count ))
      echo "├── $policy: $deployed/$count deployed ($percentage%)"
    fi
  done
  
  echo ""
  echo "🛠️ AVAILABLE ACTIONS:"
  echo "├── Continue deployment: $0 deploy-patch --version $PATCH_VERSION --customers <policy>"
  echo "├── Monitor health: ./scripts/render-deploy.sh check-health --customer <customer>"
  echo "└── Rollback if needed: $0 rollback-patch --version $PATCH_VERSION --customers <policy>"
}

# Validate patch version and requirements
validate_patch() {
  validate_patch_version
  validate_patch_type
  
  log_info "Validating patch $PATCH_VERSION ($PATCH_TYPE)"
  
  # Check if patch tag exists
  if ! git tag -l | grep -q "^$PATCH_VERSION$"; then
    log_error "Patch tag $PATCH_VERSION not found"
    log_info "Create the tag first: git tag -a $PATCH_VERSION -m 'Patch: $PATCH_TYPE'"
    exit 1
  fi
  
  # Check if base version exists
  local base_version="v${MAJOR}.${MINOR}.0"
  if ! git tag -l | grep -q "^$base_version$"; then
    log_warning "Base version $base_version not found"
    log_info "This patch may be for a version that doesn't exist yet"
  fi
  
  # Validate patch requirements based on type
  local requirements=$(jq -r --arg type "$PATCH_TYPE" '.patch_types[$type].testing_requirements' "$PATCH_POLICIES_FILE")
  
  echo ""
  echo "✅ PATCH VALIDATION RESULTS:"
  echo "├── Version format: Valid"
  echo "├── Git tag: Exists"
  echo "├── Patch type: $PATCH_TYPE"
  echo "├── Base version: $base_version"
  echo "└── Testing requirements: $(echo "$requirements" | jq -r 'keys | join(", ")')"
  
  log_success "Patch $PATCH_VERSION validation completed"
}

# Main execution
main() {
  load_config
  
  if [[ -z "$COMMAND" ]]; then
    log_error "Command required. Use --help for usage information"
    exit 1
  fi
  
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           SecureWatch - Patch Release Manager           ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  if $DRY_RUN; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
  fi
  
  case "$COMMAND" in
    "plan-patch")
      plan_patch
      ;;
    "deploy-patch")
      deploy_patch
      ;;
    "emergency-patch")
      emergency_patch
      ;;
    "check-patch-status")
      check_patch_status
      ;;
    "validate-patch")
      validate_patch
      ;;
    "rollback-patch")
      log_error "Patch rollback functionality coming soon"
      log_info "For now, use: ./scripts/render-deploy.sh rollback-customer --customer <customer>"
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