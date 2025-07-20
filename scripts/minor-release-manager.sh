#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Minor Release Management Script
# =============================================================================
# This script manages minor version releases with phased rollouts based on
# customer deployment policies and minor release strategies.
#
# Usage: ./minor-release-manager.sh [command] [options]
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_phase() { echo -e "${PURPLE}[PHASE]${NC} $1"; }

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMMAND=""
MINOR_VERSION=""
TARGET_PHASE=""
CUSTOMER_FILTER=""
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    plan-release)
      COMMAND="plan-release"
      shift
      ;;
    start-phase)
      COMMAND="start-phase"
      shift
      ;;
    deploy-customers)
      COMMAND="deploy-customers"
      shift
      ;;
    check-status)
      COMMAND="check-status"
      shift
      ;;
    send-notifications)
      COMMAND="send-notifications"
      shift
      ;;
    rollback-phase)
      COMMAND="rollback-phase"
      shift
      ;;
    --version)
      MINOR_VERSION="$2"
      shift 2
      ;;
    --phase)
      TARGET_PHASE="$2"
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
SecureWatch Minor Release Management

USAGE:
  $0 <command> [options]

COMMANDS:
  plan-release       Create release plan for minor version
  start-phase        Start specific phase of minor release
  deploy-customers   Deploy to customers in current phase
  check-status       Check status of minor release rollout
  send-notifications Send notifications to customers
  rollback-phase     Rollback specific phase

OPTIONS:
  --version <ver>    Minor version (e.g., v1.1.0, v1.2.0)
  --phase <phase>    Release phase (demo, startup, standard, enterprise)
  --customers <type> Customer filter (policy type or specific names)
  --dry-run          Show what would be done without executing
  --force            Skip safety checks and confirmations
  --help             Show this help message

EXAMPLES:
  # Plan v1.1.0 minor release
  $0 plan-release --version v1.1.0

  # Start demo phase rollout
  $0 start-phase --version v1.1.0 --phase demo

  # Deploy to startup customers
  $0 deploy-customers --version v1.1.0 --customers startup

  # Check current release status
  $0 check-status --version v1.1.0

  # Send advance notifications
  $0 send-notifications --version v1.1.0 --phase standard

  # Emergency rollback of startup phase
  $0 rollback-phase --version v1.1.0 --phase startup

MINOR RELEASE PHASES:
  1. demo           - Immediate deployment to demo environments
  2. startup        - Early access for startup customers (7 days)
  3. standard       - Phased rollout to standard customers (14 days)
  4. enterprise     - Manual approval for enterprise customers (30 days)

EOF
}

# Load configuration
load_config() {
  local policies_file="$PROJECT_ROOT/config/minor-release-policies.json"
  local customers_file="$PROJECT_ROOT/config/customers.json"
  
  if [[ ! -f "$policies_file" ]]; then
    log_error "Minor release policies file not found: $policies_file"
    exit 1
  fi
  
  if [[ ! -f "$customers_file" ]]; then
    log_error "Customers file not found: $customers_file"
    exit 1
  fi
  
  export POLICIES_FILE="$policies_file"
  export CUSTOMERS_FILE="$customers_file"
}

# Validate minor version format
validate_version() {
  if [[ -z "$MINOR_VERSION" ]]; then
    log_error "Minor version required. Use --version v1.1.0"
    exit 1
  fi
  
  if [[ ! "$MINOR_VERSION" =~ ^v[0-9]+\.[1-9][0-9]*\.0$ ]]; then
    log_error "Invalid minor version format. Use v1.1.0, v1.2.0, etc."
    log_info "Minor versions should have patch version 0 (e.g., v1.1.0)"
    exit 1
  fi
  
  # Extract version components
  local version_clean=${MINOR_VERSION#v}
  IFS='.' read -r MAJOR MINOR PATCH <<< "$version_clean"
  
  if [[ "$PATCH" != "0" ]]; then
    log_error "Minor releases should have patch version 0"
    exit 1
  fi
  
  export MAJOR MINOR PATCH
}

# Get customers by policy
get_customers_by_policy() {
  local policy="$1"
  jq -r --arg policy "$policy" '.customers[] | select(.deployment_policy == $policy) | .name' "$CUSTOMERS_FILE"
}

# Get policy for customer
get_customer_policy() {
  local customer="$1"
  jq -r --arg customer "$customer" '.customers[] | select(.name == $customer or .slug == $customer) | .deployment_policy' "$CUSTOMERS_FILE"
}

# Create release plan
plan_release() {
  validate_version
  
  log_phase "Creating minor release plan for $MINOR_VERSION"
  
  local plan_file="release-plans/minor-release-${MINOR_VERSION}.json"
  mkdir -p "$(dirname "$plan_file")"
  
  # Get phase information
  local phases=$(jq -r '.minor_release_lifecycle.phases[] | .name' "$POLICIES_FILE")
  
  # Count customers by policy
  local demo_count=$(get_customers_by_policy "demo" | wc -l)
  local startup_count=$(get_customers_by_policy "startup" | wc -l)
  local standard_count=$(get_customers_by_policy "standard" | wc -l)
  local enterprise_count=$(get_customers_by_policy "enterprise" | wc -l)
  
  cat > "$plan_file" << EOF
{
  "release_info": {
    "version": "$MINOR_VERSION",
    "created_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "created_by": "$(whoami)",
    "type": "minor_release",
    "status": "planned"
  },
  "customer_distribution": {
    "demo": $demo_count,
    "startup": $startup_count,
    "standard": $standard_count,
    "enterprise": $enterprise_count,
    "total": $((demo_count + startup_count + standard_count + enterprise_count))
  },
  "rollout_timeline": {
    "total_duration": "~60_days",
    "phases": [
      {
        "name": "demo",
        "start_date": "release_day",
        "duration": "1_day",
        "customer_count": $demo_count,
        "deployment_method": "automatic"
      },
      {
        "name": "startup_early_access", 
        "start_date": "release_day + 1",
        "duration": "7_days",
        "customer_count": $startup_count,
        "deployment_method": "automatic_phased"
      },
      {
        "name": "standard_rollout",
        "start_date": "release_day + 8",
        "duration": "14_days", 
        "customer_count": $standard_count,
        "deployment_method": "automatic_batched"
      },
      {
        "name": "enterprise_rollout",
        "start_date": "release_day + 22",
        "duration": "30_days",
        "customer_count": $enterprise_count,
        "deployment_method": "manual_approval"
      }
    ]
  },
  "phase_status": {
    "demo": "pending",
    "startup_early_access": "pending", 
    "standard_rollout": "pending",
    "enterprise_rollout": "pending"
  },
  "deployment_tracking": {
    "demo": [],
    "startup": [],
    "standard": [],
    "enterprise": []
  }
}
EOF

  log_success "Release plan created: $plan_file"
  
  echo ""
  echo "📋 MINOR RELEASE PLAN SUMMARY:"
  echo "├── Version: $MINOR_VERSION"
  echo "├── Total Duration: ~60 days"
  echo "├── Total Customers: $((demo_count + startup_count + standard_count + enterprise_count))"
  echo "├── Demo: $demo_count customers (immediate)"
  echo "├── Startup: $startup_count customers (7 days)" 
  echo "├── Standard: $standard_count customers (14 days)"
  echo "└── Enterprise: $enterprise_count customers (30 days)"
  
  echo ""
  echo "🚀 NEXT STEPS:"
  echo "1. Review and approve release plan"
  echo "2. Create version tag: git tag -a $MINOR_VERSION -m 'Minor release $MINOR_VERSION'"
  echo "3. Start demo phase: $0 start-phase --version $MINOR_VERSION --phase demo"
  echo "4. Monitor and proceed through phases"
}

# Start specific phase
start_phase() {
  validate_version
  
  if [[ -z "$TARGET_PHASE" ]]; then
    log_error "Phase required. Use --phase <phase>"
    exit 1
  fi
  
  log_phase "Starting phase: $TARGET_PHASE for version $MINOR_VERSION"
  
  local plan_file="release-plans/minor-release-${MINOR_VERSION}.json"
  if [[ ! -f "$plan_file" ]]; then
    log_error "Release plan not found. Run: $0 plan-release --version $MINOR_VERSION"
    exit 1
  fi
  
  # Validate phase
  local valid_phases=("demo" "startup_early_access" "standard_rollout" "enterprise_rollout")
  if [[ ! " ${valid_phases[@]} " =~ " ${TARGET_PHASE} " ]]; then
    log_error "Invalid phase: $TARGET_PHASE"
    log_info "Valid phases: ${valid_phases[*]}"
    exit 1
  fi
  
  # Check if tag exists
  if ! git tag -l | grep -q "^$MINOR_VERSION$"; then
    if $FORCE; then
      log_warning "Version tag $MINOR_VERSION not found, but --force specified"
    else
      log_error "Version tag $MINOR_VERSION not found. Create it first:"
      log_info "git tag -a $MINOR_VERSION -m 'Minor release $MINOR_VERSION'"
      exit 1
    fi
  fi
  
  # Update plan status
  local temp_plan=$(mktemp)
  jq --arg phase "$TARGET_PHASE" --arg date "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '.phase_status[$phase] = "active" | .phase_status[$phase + "_start_date"] = $date' \
    "$plan_file" > "$temp_plan" && mv "$temp_plan" "$plan_file"
  
  log_success "Phase $TARGET_PHASE started for $MINOR_VERSION"
  
  # Show next steps based on phase
  case "$TARGET_PHASE" in
    "demo")
      echo ""
      echo "🎯 DEMO PHASE ACTIONS:"
      echo "├── Deploy to all demo environments immediately"
      echo "├── Update sales team on new features"
      echo "├── Update demo environment documentation"
      echo "└── Monitor for any issues"
      echo ""
      echo "Next: $0 deploy-customers --version $MINOR_VERSION --customers demo"
      ;;
    "startup_early_access")
      echo ""
      echo "🚀 STARTUP EARLY ACCESS ACTIONS:"
      echo "├── Send notifications to startup customers"
      echo "├── Deploy in 50% batches"
      echo "├── Collect feedback and monitor issues"
      echo "└── Prepare for standard rollout"
      echo ""
      echo "Next: $0 send-notifications --version $MINOR_VERSION --phase startup"
      ;;
    "standard_rollout")
      echo ""
      echo "⚖️ STANDARD ROLLOUT ACTIONS:"
      echo "├── Send 7-day advance notifications"
      echo "├── Deploy in 25% customer batches"
      echo "├── Monitor customer health and feedback"
      echo "└── Prepare enterprise customer communications"
      echo ""
      echo "Next: $0 send-notifications --version $MINOR_VERSION --phase standard"
      ;;
    "enterprise_rollout")
      echo ""
      echo "🏢 ENTERPRISE ROLLOUT ACTIONS:"
      echo "├── Send 14-day advance notifications"
      echo "├── Schedule individual customer calls"
      echo "├── Coordinate with customer IT teams"
      echo "└── Plan maintenance windows"
      echo ""
      echo "Next: $0 send-notifications --version $MINOR_VERSION --phase enterprise"
      ;;
  esac
}

# Deploy to customers based on phase
deploy_customers() {
  validate_version
  
  if [[ -z "$CUSTOMER_FILTER" ]]; then
    log_error "Customer filter required. Use --customers <policy|names>"
    exit 1
  fi
  
  log_info "Deploying $MINOR_VERSION to customers: $CUSTOMER_FILTER"
  
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
  echo "🎯 DEPLOYMENT PLAN:"
  echo "├── Version: $MINOR_VERSION"
  echo "├── Target customers: ${#customers[@]}"
  for customer in "${customers[@]}"; do
    local policy=$(get_customer_policy "$customer")
    echo "├── $customer ($policy)"
  done
  echo ""
  
  if ! $DRY_RUN && ! $FORCE; then
    read -p "Proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  fi
  
  # Deploy to each customer
  local success_count=0
  local failure_count=0
  
  for customer in "${customers[@]}"; do
    log_info "Deploying to: $customer"
    
    if $DRY_RUN; then
      log_info "[DRY RUN] Would deploy $MINOR_VERSION to $customer"
      success_count=$((success_count + 1))
    else
      if "$PROJECT_ROOT/scripts/update-customer.sh" --version "$MINOR_VERSION" --customer "$customer"; then
        log_success "Successfully deployed to $customer"
        success_count=$((success_count + 1))
      else
        log_error "Failed to deploy to $customer"
        failure_count=$((failure_count + 1))
      fi
    fi
    
    # Brief pause between deployments
    sleep 2
  done
  
  echo ""
  echo "📊 DEPLOYMENT SUMMARY:"
  echo "├── Total customers: ${#customers[@]}"
  echo "├── Successful: $success_count"
  echo "├── Failed: $failure_count"
  echo "└── Success rate: $(( success_count * 100 / ${#customers[@]} ))%"
  
  if [[ $failure_count -gt 0 ]]; then
    log_warning "Some deployments failed. Check logs and retry failed customers."
  else
    log_success "All deployments completed successfully!"
  fi
}

# Check release status
check_status() {
  validate_version
  
  local plan_file="release-plans/minor-release-${MINOR_VERSION}.json"
  if [[ ! -f "$plan_file" ]]; then
    log_error "Release plan not found for $MINOR_VERSION"
    exit 1
  fi
  
  log_info "Checking status of minor release: $MINOR_VERSION"
  
  echo ""
  echo "📊 MINOR RELEASE STATUS: $MINOR_VERSION"
  echo "═══════════════════════════════════════════"
  
  # Show overall info
  local created_date=$(jq -r '.release_info.created_date' "$plan_file")
  local status=$(jq -r '.release_info.status' "$plan_file")
  local total_customers=$(jq -r '.customer_distribution.total' "$plan_file")
  
  echo "├── Created: $created_date"
  echo "├── Status: $status"
  echo "├── Total Customers: $total_customers"
  echo ""
  
  # Show phase status
  echo "📋 PHASE STATUS:"
  local phases=("demo" "startup_early_access" "standard_rollout" "enterprise_rollout")
  
  for phase in "${phases[@]}"; do
    local phase_status=$(jq -r --arg phase "$phase" '.phase_status[$phase] // "pending"' "$plan_file")
    local customer_count=$(jq -r --arg phase "$phase" '.customer_distribution[$phase] // 0' "$plan_file")
    
    case "$phase_status" in
      "pending")
        echo "├── $phase: ⏳ Pending ($customer_count customers)"
        ;;
      "active")
        echo "├── $phase: 🔄 Active ($customer_count customers)"
        ;;
      "completed")
        echo "├── $phase: ✅ Completed ($customer_count customers)"
        ;;
      "failed")
        echo "├── $phase: ❌ Failed ($customer_count customers)"
        ;;
    esac
  done
  
  echo ""
  echo "🛠️ AVAILABLE ACTIONS:"
  echo "├── View detailed logs: cat logs/minor-release-${MINOR_VERSION}.log"
  echo "├── Continue next phase: $0 start-phase --version $MINOR_VERSION --phase <next>"
  echo "├── Deploy customers: $0 deploy-customers --version $MINOR_VERSION --customers <policy>"
  echo "└── Send notifications: $0 send-notifications --version $MINOR_VERSION --phase <phase>"
}

# Send notifications to customers
send_notifications() {
  validate_version
  
  if [[ -z "$TARGET_PHASE" ]]; then
    log_error "Phase required for notifications. Use --phase <phase>"
    exit 1
  fi
  
  log_info "Sending notifications for $MINOR_VERSION to $TARGET_PHASE customers"
  
  # Map phases to customer policies
  local customer_policy=""
  case "$TARGET_PHASE" in
    "demo") customer_policy="demo" ;;
    "startup_early_access"|"startup") customer_policy="startup" ;;
    "standard_rollout"|"standard") customer_policy="standard" ;;
    "enterprise_rollout"|"enterprise") customer_policy="enterprise" ;;
    *)
      log_error "Invalid phase for notifications: $TARGET_PHASE"
      exit 1
      ;;
  esac
  
  local customers=()
  while IFS= read -r customer; do
    customers+=("$customer")
  done < <(get_customers_by_policy "$customer_policy")
  
  if [[ ${#customers[@]} -eq 0 ]]; then
    log_warning "No customers found for policy: $customer_policy"
    exit 0
  fi
  
  echo ""
  echo "📧 NOTIFICATION PLAN:"
  echo "├── Version: $MINOR_VERSION"
  echo "├── Phase: $TARGET_PHASE"
  echo "├── Policy: $customer_policy"
  echo "├── Recipients: ${#customers[@]} customers"
  echo ""
  
  for customer in "${customers[@]}"; do
    echo "├── $customer"
  done
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would send notifications to ${#customers[@]} customers"
    return 0
  fi
  
  # Create notification log
  local notification_log="logs/notifications-${MINOR_VERSION}-${TARGET_PHASE}.log"
  mkdir -p "$(dirname "$notification_log")"
  
  echo "$(date): Starting notification send for $MINOR_VERSION $TARGET_PHASE phase" >> "$notification_log"
  
  # Send notifications (placeholder for actual email/notification system)
  for customer in "${customers[@]}"; do
    log_info "Sending notification to: $customer"
    echo "$(date): Notification sent to $customer" >> "$notification_log"
    
    # In real implementation, this would integrate with email/notification service
    # send_customer_notification "$customer" "$MINOR_VERSION" "$TARGET_PHASE"
  done
  
  log_success "Notifications sent to ${#customers[@]} customers"
  log_info "Notification log: $notification_log"
}

# Main execution
main() {
  load_config
  
  if [[ -z "$COMMAND" ]]; then
    log_error "Command required. Use --help for usage information"
    exit 1
  fi
  
  # Create logs directory
  mkdir -p "$PROJECT_ROOT/logs"
  mkdir -p "$PROJECT_ROOT/release-plans"
  
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║          SecureWatch - Minor Release Manager            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  if $DRY_RUN; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
  fi
  
  case "$COMMAND" in
    "plan-release")
      plan_release
      ;;
    "start-phase")
      start_phase
      ;;
    "deploy-customers")
      deploy_customers
      ;;
    "check-status")
      check_status
      ;;
    "send-notifications")
      send_notifications
      ;;
    "rollback-phase")
      log_error "Rollback functionality not yet implemented"
      exit 1
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