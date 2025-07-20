#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Render Deployment Integration Script
# =============================================================================
# This script handles Render-specific deployments for tag-based minor releases
# with support for customer-specific services, environment management, and
# automated rollback procedures.
#
# Usage: ./render-deploy.sh [command] [options]
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
log_render() { echo -e "${PURPLE}[RENDER]${NC} $1"; }

# Default values
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMMAND=""
VERSION_TAG=""
CUSTOMER_SLUG=""
SERVICE_TYPE=""
RENDER_API_KEY=""
DRY_RUN=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    deploy-customer)
      COMMAND="deploy-customer"
      shift
      ;;
    deploy-batch)
      COMMAND="deploy-batch"
      shift
      ;;
    check-health)
      COMMAND="check-health"
      shift
      ;;
    rollback-customer)
      COMMAND="rollback-customer"
      shift
      ;;
    update-env-vars)
      COMMAND="update-env-vars"
      shift
      ;;
    list-deployments)
      COMMAND="list-deployments"
      shift
      ;;
    --version)
      VERSION_TAG="$2"
      shift 2
      ;;
    --customer)
      CUSTOMER_SLUG="$2"
      shift 2
      ;;
    --service-type)
      SERVICE_TYPE="$2"
      shift 2
      ;;
    --api-key)
      RENDER_API_KEY="$2"
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
SecureWatch Render Deployment Integration

USAGE:
  $0 <command> [options]

COMMANDS:
  deploy-customer      Deploy specific version to customer's Render services
  deploy-batch         Deploy to multiple customers in a batch
  check-health         Check health of customer's deployed services
  rollback-customer    Rollback customer to previous deployment
  update-env-vars      Update environment variables for customer services
  list-deployments     List recent deployments for customer

OPTIONS:
  --version <tag>      Version tag to deploy (e.g., v1.1.0)
  --customer <slug>    Customer slug (e.g., acme-corp)
  --service-type <type> Service type (backend, frontend, both)
  --api-key <key>      Render API key (or set RENDER_API_KEY env var)
  --dry-run            Show what would be done without executing
  --force              Skip safety checks and confirmations
  --help               Show this help message

EXAMPLES:
  # Deploy v1.1.0 to ACME Corporation
  $0 deploy-customer --version v1.1.0 --customer acme-corp

  # Deploy to startup customers batch
  $0 deploy-batch --version v1.1.0 --customers startup

  # Check health of customer services
  $0 check-health --customer acme-corp

  # Rollback customer deployment
  $0 rollback-customer --customer acme-corp

  # Update environment variables for new version
  $0 update-env-vars --version v1.1.0 --customer acme-corp

EOF
}

# Load configuration
load_config() {
  local render_config="$PROJECT_ROOT/config/render-deployment.json"
  local customers_config="$PROJECT_ROOT/config/customers.json"
  
  if [[ ! -f "$render_config" ]]; then
    log_error "Render deployment configuration not found: $render_config"
    exit 1
  fi
  
  if [[ ! -f "$customers_config" ]]; then
    log_error "Customers configuration not found: $customers_config"
    exit 1
  fi
  
  export RENDER_CONFIG="$render_config"
  export CUSTOMERS_CONFIG="$customers_config"
}

# Setup Render API authentication
setup_render_auth() {
  if [[ -z "$RENDER_API_KEY" ]]; then
    RENDER_API_KEY="${RENDER_API_KEY:-}"
    
    if [[ -z "$RENDER_API_KEY" ]]; then
      log_error "Render API key required. Set RENDER_API_KEY environment variable or use --api-key"
      exit 1
    fi
  fi
  
  export RENDER_AUTH_HEADER="Authorization: Bearer $RENDER_API_KEY"
  log_success "Render API authentication configured"
}

# Get customer service IDs
get_customer_services() {
  local customer="$1"
  
  local backend_service=$(jq -r --arg customer "$customer" '.customer_environment_mapping[$customer].backend_service_id // empty' "$RENDER_CONFIG")
  local frontend_service=$(jq -r --arg customer "$customer" '.customer_environment_mapping[$customer].frontend_service_id // empty' "$RENDER_CONFIG")
  
  if [[ -z "$backend_service" || -z "$frontend_service" ]]; then
    log_error "Service IDs not found for customer: $customer"
    log_info "Available customers:"
    jq -r '.customer_environment_mapping | keys[]' "$RENDER_CONFIG"
    exit 1
  fi
  
  echo "$backend_service,$frontend_service"
}

# Make Render API call
render_api_call() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  
  local url="https://api.render.com/v1${endpoint}"
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would make API call: $method $url"
    if [[ -n "$data" ]]; then
      log_info "[DRY RUN] Request data: $data"
    fi
    return 0
  fi
  
  local curl_args=(-s -H "$RENDER_AUTH_HEADER" -H "Content-Type: application/json")
  
  if [[ "$method" == "POST" || "$method" == "PATCH" || "$method" == "PUT" ]]; then
    curl_args+=(-X "$method")
    if [[ -n "$data" ]]; then
      curl_args+=(-d "$data")
    fi
  elif [[ "$method" == "DELETE" ]]; then
    curl_args+=(-X DELETE)
  fi
  
  local response=$(curl "${curl_args[@]}" "$url")
  local http_code=$(curl "${curl_args[@]}" -w "%{http_code}" -o /dev/null "$url")
  
  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "$response"
  else
    log_error "Render API call failed: $method $url (HTTP $http_code)"
    echo "$response" | jq -r '.message // .error // .' 2>/dev/null || echo "$response"
    return 1
  fi
}

# Create deployment on Render
create_render_deployment() {
  local service_id="$1"
  local version_tag="$2"
  
  log_render "Creating deployment for service $service_id with tag $version_tag"
  
  local deployment_data=$(cat << EOF
{
  "clearCache": "clear",
  "gitCommitSHA": "$(git rev-parse "tags/$version_tag" 2>/dev/null || git rev-parse HEAD)"
}
EOF
)
  
  local response=$(render_api_call "POST" "/services/$service_id/deploys" "$deployment_data")
  
  if [[ $? -eq 0 ]]; then
    local deploy_id=$(echo "$response" | jq -r '.id')
    log_success "Deployment created: $deploy_id"
    echo "$deploy_id"
  else
    log_error "Failed to create deployment for service $service_id"
    return 1
  fi
}

# Wait for deployment completion
wait_for_deployment() {
  local service_id="$1"
  local deploy_id="$2"
  local timeout="${3:-600}" # 10 minutes default
  
  log_info "Waiting for deployment $deploy_id to complete (timeout: ${timeout}s)"
  
  local elapsed=0
  local check_interval=30
  
  while [[ $elapsed -lt $timeout ]]; do
    if $DRY_RUN; then
      log_info "[DRY RUN] Would check deployment status"
      return 0
    fi
    
    local response=$(render_api_call "GET" "/services/$service_id/deploys/$deploy_id" "")
    local status=$(echo "$response" | jq -r '.status')
    
    case "$status" in
      "live")
        log_success "Deployment completed successfully"
        return 0
        ;;
      "build_failed"|"update_failed"|"canceled")
        log_error "Deployment failed with status: $status"
        return 1
        ;;
      "created"|"build_in_progress"|"update_in_progress")
        log_info "Deployment in progress... ($status)"
        ;;
      *)
        log_warning "Unknown deployment status: $status"
        ;;
    esac
    
    sleep $check_interval
    elapsed=$((elapsed + check_interval))
  done
  
  log_error "Deployment timeout after ${timeout} seconds"
  return 1
}

# Update environment variables for version
update_service_env_vars() {
  local service_id="$1"
  local version_tag="$2"
  local customer_slug="$3"
  
  log_render "Updating environment variables for service $service_id"
  
  # Get environment variable template
  local env_template=$(jq -r '.environment_variable_templates.backend_env_vars' "$RENDER_CONFIG")
  
  # Replace template variables
  local env_vars=$(echo "$env_template" | jq --arg version "$version_tag" --arg customer "$customer_slug" '
    . as $template | 
    with_entries(.value = (.value | 
      gsub("\\$\\{DEPLOYMENT_VERSION\\}"; $version) |
      gsub("\\$\\{CUSTOMER_SLUG\\}"; $customer)
    ))
  ')
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would update environment variables:"
    echo "$env_vars" | jq .
    return 0
  fi
  
  # Update each environment variable
  echo "$env_vars" | jq -r 'to_entries[] | "\(.key)=\(.value)"' | while IFS='=' read -r key value; do
    local update_data=$(jq -n --arg key "$key" --arg value "$value" '{key: $key, value: $value}')
    
    if render_api_call "PUT" "/services/$service_id/env-vars/$key" "$update_data" >/dev/null; then
      log_info "Updated env var: $key"
    else
      log_warning "Failed to update env var: $key"
    fi
  done
  
  log_success "Environment variables updated"
}

# Check service health
check_service_health() {
  local service_id="$1"
  local customer_slug="$2"
  
  log_render "Checking health for service $service_id"
  
  # Get service information
  local service_info=$(render_api_call "GET" "/services/$service_id" "")
  local service_url=$(echo "$service_info" | jq -r '.serviceDetails.url')
  
  if [[ -z "$service_url" || "$service_url" == "null" ]]; then
    log_warning "No service URL found for $service_id"
    return 1
  fi
  
  # Check health endpoint
  local health_endpoint="${service_url}/api/health"
  
  if $DRY_RUN; then
    log_info "[DRY RUN] Would check health at: $health_endpoint"
    return 0
  fi
  
  local health_response=$(curl -s -f "$health_endpoint" || echo "ERROR")
  
  if [[ "$health_response" == "ERROR" ]]; then
    log_error "Health check failed for $service_id"
    return 1
  fi
  
  local status=$(echo "$health_response" | jq -r '.status // "unknown"')
  local version=$(echo "$health_response" | jq -r '.version // "unknown"')
  
  if [[ "$status" == "healthy" ]]; then
    log_success "Service $service_id is healthy (version: $version)"
    return 0
  else
    log_warning "Service $service_id status: $status"
    return 1
  fi
}

# Deploy to customer
deploy_customer() {
  if [[ -z "$VERSION_TAG" || -z "$CUSTOMER_SLUG" ]]; then
    log_error "Version tag and customer slug required"
    exit 1
  fi
  
  log_info "Deploying $VERSION_TAG to customer: $CUSTOMER_SLUG"
  
  # Get customer services
  local services=$(get_customer_services "$CUSTOMER_SLUG")
  IFS=',' read -r backend_service frontend_service <<< "$services"
  
  # Determine which services to deploy
  local services_to_deploy=()
  case "${SERVICE_TYPE:-both}" in
    "backend")
      services_to_deploy=("$backend_service")
      ;;
    "frontend") 
      services_to_deploy=("$frontend_service")
      ;;
    "both"|*)
      services_to_deploy=("$backend_service" "$frontend_service")
      ;;
  esac
  
  echo ""
  echo "🚀 DEPLOYMENT PLAN:"
  echo "├── Customer: $CUSTOMER_SLUG"
  echo "├── Version: $VERSION_TAG"
  echo "├── Services: ${#services_to_deploy[@]}"
  for service in "${services_to_deploy[@]}"; do
    echo "│   ├── $service"
  done
  echo ""
  
  if ! $DRY_RUN && ! $FORCE; then
    read -p "Proceed with Render deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  fi
  
  # Deploy each service
  local deployment_ids=()
  local failed_services=()
  
  for service_id in "${services_to_deploy[@]}"; do
    log_render "Deploying service: $service_id"
    
    # Update environment variables first
    update_service_env_vars "$service_id" "$VERSION_TAG" "$CUSTOMER_SLUG"
    
    # Create deployment
    local deploy_id=$(create_render_deployment "$service_id" "$VERSION_TAG")
    if [[ $? -eq 0 && -n "$deploy_id" ]]; then
      deployment_ids+=("$service_id:$deploy_id")
      
      # Wait for deployment completion
      if wait_for_deployment "$service_id" "$deploy_id"; then
        log_success "Service $service_id deployed successfully"
        
        # Check service health
        sleep 30 # Wait for service to stabilize
        if check_service_health "$service_id" "$CUSTOMER_SLUG"; then
          log_success "Service $service_id health check passed"
        else
          log_warning "Service $service_id health check failed"
        fi
      else
        log_error "Service $service_id deployment failed"
        failed_services+=("$service_id")
      fi
    else
      log_error "Failed to create deployment for service $service_id"
      failed_services+=("$service_id")
    fi
  done
  
  # Deployment summary
  echo ""
  echo "📊 DEPLOYMENT SUMMARY:"
  echo "├── Customer: $CUSTOMER_SLUG"
  echo "├── Version: $VERSION_TAG"
  echo "├── Total Services: ${#services_to_deploy[@]}"
  echo "├── Successful: $((${#services_to_deploy[@]} - ${#failed_services[@]}))"
  echo "├── Failed: ${#failed_services[@]}"
  
  if [[ ${#failed_services[@]} -gt 0 ]]; then
    echo "├── Failed Services:"
    for service in "${failed_services[@]}"; do
      echo "│   ├── $service"
    done
    echo ""
    log_error "Some services failed to deploy. Consider rollback."
    exit 1
  else
    echo "└── Status: ✅ All services deployed successfully"
    log_success "Customer $CUSTOMER_SLUG successfully deployed to $VERSION_TAG"
  fi
}

# Rollback customer deployment
rollback_customer() {
  if [[ -z "$CUSTOMER_SLUG" ]]; then
    log_error "Customer slug required"
    exit 1
  fi
  
  log_info "Rolling back customer: $CUSTOMER_SLUG"
  
  # Get customer services
  local services=$(get_customer_services "$CUSTOMER_SLUG")
  IFS=',' read -r backend_service frontend_service <<< "$services"
  
  local services_to_rollback=("$backend_service" "$frontend_service")
  
  echo ""
  echo "🔄 ROLLBACK PLAN:"
  echo "├── Customer: $CUSTOMER_SLUG"
  echo "├── Services: ${#services_to_rollback[@]}"
  for service in "${services_to_rollback[@]}"; do
    echo "│   ├── $service"
  done
  echo ""
  
  if ! $DRY_RUN && ! $FORCE; then
    read -p "Proceed with rollback? This will revert to the previous deployment. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Rollback cancelled"
      exit 0
    fi
  fi
  
  # Rollback each service
  for service_id in "${services_to_rollback[@]}"; do
    log_render "Rolling back service: $service_id"
    
    if $DRY_RUN; then
      log_info "[DRY RUN] Would rollback service $service_id"
      continue
    fi
    
    # Get recent deployments
    local deployments=$(render_api_call "GET" "/services/$service_id/deploys" "")
    local previous_deploy=$(echo "$deployments" | jq -r '.[1].id // empty')
    
    if [[ -z "$previous_deploy" ]]; then
      log_error "No previous deployment found for service $service_id"
      continue
    fi
    
    # Trigger rollback
    if render_api_call "POST" "/services/$service_id/deploys/$previous_deploy/rollback" "" >/dev/null; then
      log_success "Rollback initiated for service $service_id"
      
      # Wait for rollback completion
      if wait_for_deployment "$service_id" "$previous_deploy"; then
        log_success "Service $service_id rolled back successfully"
      else
        log_error "Service $service_id rollback failed"
      fi
    else
      log_error "Failed to initiate rollback for service $service_id"
    fi
  done
  
  log_success "Rollback completed for customer $CUSTOMER_SLUG"
}

# List recent deployments
list_deployments() {
  if [[ -z "$CUSTOMER_SLUG" ]]; then
    log_error "Customer slug required"
    exit 1
  fi
  
  log_info "Listing deployments for customer: $CUSTOMER_SLUG"
  
  # Get customer services
  local services=$(get_customer_services "$CUSTOMER_SLUG")
  IFS=',' read -r backend_service frontend_service <<< "$services"
  
  echo ""
  echo "📋 RECENT DEPLOYMENTS: $CUSTOMER_SLUG"
  echo "═══════════════════════════════════════"
  
  for service_id in "$backend_service" "$frontend_service"; do
    local service_type=$(echo "$service_id" | grep -o 'backend\|frontend')
    echo ""
    echo "🔧 $service_type Service ($service_id):"
    
    if $DRY_RUN; then
      log_info "[DRY RUN] Would list deployments for $service_id"
      continue
    fi
    
    local deployments=$(render_api_call "GET" "/services/$service_id/deploys" "")
    
    echo "$deployments" | jq -r '.[:5][] | "├── \(.createdAt | .[0:19]) | \(.status) | \(.commit.message // "No commit message")"' || echo "├── No deployments found"
  done
  
  echo ""
}

# Main execution
main() {
  load_config
  setup_render_auth
  
  if [[ -z "$COMMAND" ]]; then
    log_error "Command required. Use --help for usage information"
    exit 1
  fi
  
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           SecureWatch - Render Deployment               ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  if $DRY_RUN; then
    log_warning "DRY RUN MODE - No changes will be made to Render"
    echo ""
  fi
  
  case "$COMMAND" in
    "deploy-customer")
      deploy_customer
      ;;
    "rollback-customer")
      rollback_customer
      ;;
    "check-health")
      if [[ -z "$CUSTOMER_SLUG" ]]; then
        log_error "Customer slug required"
        exit 1
      fi
      
      local services=$(get_customer_services "$CUSTOMER_SLUG")
      IFS=',' read -r backend_service frontend_service <<< "$services"
      
      check_service_health "$backend_service" "$CUSTOMER_SLUG"
      check_service_health "$frontend_service" "$CUSTOMER_SLUG"
      ;;
    "list-deployments")
      list_deployments
      ;;
    "update-env-vars")
      if [[ -z "$VERSION_TAG" || -z "$CUSTOMER_SLUG" ]]; then
        log_error "Version tag and customer slug required"
        exit 1
      fi
      
      local services=$(get_customer_services "$CUSTOMER_SLUG")
      IFS=',' read -r backend_service frontend_service <<< "$services"
      
      update_service_env_vars "$backend_service" "$VERSION_TAG" "$CUSTOMER_SLUG"
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