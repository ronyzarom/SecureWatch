#!/bin/bash

# =============================================================================
# SECUREWATCH INTELLIGENT STARTUP SCRIPT
# =============================================================================
# Auto-detects deployment type and initializes system appropriately
# Works for both new deployments and existing customers
# Compatible with local development and cloud (Render) environments

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/startup.log"
NODE_ENV="${NODE_ENV:-development}"
PORT="${PORT:-3001}"

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

log_success() {
    log "✅ $1"
}

log_info() {
    log "ℹ️  $1"
}

log_warning() {
    log "⚠️  $1"
}

log_error() {
    log "❌ $1"
}

# =============================================================================
# ENVIRONMENT DETECTION
# =============================================================================
detect_environment() {
    log_info "Detecting deployment environment..."
    
    if [[ -n "$RENDER" ]]; then
        DEPLOY_ENV="render"
        log_info "Environment: Render Cloud"
    elif [[ "$NODE_ENV" == "production" ]]; then
        DEPLOY_ENV="production"
        log_info "Environment: Production"
    else
        DEPLOY_ENV="development"
        log_info "Environment: Development"
    fi
    
    # Detect customer
    CUSTOMER_SLUG="${CUSTOMER_SLUG:-default}"
    CUSTOMER_NAME="${CUSTOMER_NAME:-SecureWatch}"
    
    log_info "Customer: $CUSTOMER_NAME ($CUSTOMER_SLUG)"
}

# =============================================================================
# DATABASE CONNECTIVITY TEST
# =============================================================================
test_database_connection() {
    log_info "Testing database connectivity..."
    
    if [[ -z "$DATABASE_URL" ]]; then
        log_warning "DATABASE_URL not set, using default local database"
        DATABASE_URL="postgresql://postgres:password@localhost:5432/securewatch"
    fi
    
    # Extract database details for testing
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    log_info "Database host: $DB_HOST"
    
    # Test connection using Node.js
    if node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1')
            .then(() => { console.log('✅ Database connection successful'); process.exit(0); })
            .catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });
    " 2>/dev/null; then
        log_success "Database connection established"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# =============================================================================
# DEPLOYMENT TYPE DETECTION
# =============================================================================
detect_deployment_type() {
    log_info "Detecting deployment type..."
    
    # Check if database tables exist
    TABLES_EXIST=$(node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'\")
            .then(result => { 
                const count = parseInt(result.rows[0].count);
                console.log(count > 0 ? 'true' : 'false'); 
                process.exit(0); 
            })
            .catch(() => { console.log('false'); process.exit(0); });
    " 2>/dev/null || echo "false")
    
    if [[ "$TABLES_EXIST" == "true" ]]; then
        DEPLOYMENT_TYPE="existing"
        log_info "Deployment type: EXISTING (database tables found)"
    else
        DEPLOYMENT_TYPE="new"
        log_info "Deployment type: NEW (no database tables found)"
    fi
}

# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================
initialize_database() {
    log_info "Initializing database for new deployment..."
    
    # Navigate to backend directory
    cd "$SCRIPT_DIR/backend"
    
    # Run customer database initialization
    if [[ -f "database/customer-init.js" ]]; then
        log_info "Running customer database initialization..."
        if node database/customer-init.js; then
            log_success "Database initialization completed"
            return 0
        else
            log_error "Database initialization failed"
            return 1
        fi
    else
        log_warning "Customer initialization script not found, skipping..."
        return 0
    fi
}

# =============================================================================
# DEPENDENCY INSTALLATION
# =============================================================================
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies if package.json exists
    if [[ -f "$SCRIPT_DIR/package.json" ]]; then
        cd "$SCRIPT_DIR"
        if command -v npm >/dev/null 2>&1; then
            log_info "Installing root dependencies..."
            npm install --production
        fi
    fi
    
    # Install backend dependencies
    if [[ -f "$SCRIPT_DIR/backend/package.json" ]]; then
        cd "$SCRIPT_DIR/backend"
        if command -v npm >/dev/null 2>&1; then
            log_info "Installing backend dependencies..."
            npm install --production
        fi
    fi
    
    log_success "Dependencies installed"
}

# =============================================================================
# SERVER STARTUP
# =============================================================================
start_server() {
    log_info "Starting SecureWatch server..."
    
    cd "$SCRIPT_DIR/backend"
    
    # Set default environment variables
    export NODE_ENV="${NODE_ENV}"
    export PORT="${PORT}"
    
    log_info "Server configuration:"
    log_info "  - Environment: $NODE_ENV"
    log_info "  - Port: $PORT"
    log_info "  - Customer: $CUSTOMER_NAME ($CUSTOMER_SLUG)"
    
    # Start the server
    if [[ -f "server.js" ]]; then
        log_success "Starting server with node server.js"
        exec node server.js
    else
        log_error "Server file not found: backend/server.js"
        exit 1
    fi
}

# =============================================================================
# HEALTH CHECK
# =============================================================================
perform_health_check() {
    log_info "Performing post-startup health check..."
    
    # Give server time to start
    sleep 3
    
    # Check if server is responding
    if curl -f "http://localhost:$PORT/health" >/dev/null 2>&1; then
        log_success "Health check passed - server is responding"
    else
        log_warning "Health check failed - server may still be starting"
    fi
}

# =============================================================================
# MAIN EXECUTION FLOW
# =============================================================================
main() {
    log "🚀 SECUREWATCH INTELLIGENT STARTUP"
    log "=================================="
    log ""
    
    # 1. Detect environment and customer
    detect_environment
    log ""
    
    # 2. Install dependencies if needed
    if [[ "$DEPLOY_ENV" != "render" ]]; then
        install_dependencies
        log ""
    fi
    
    # 3. Test database connectivity
    if ! test_database_connection; then
        log_error "Cannot proceed without database connection"
        exit 1
    fi
    log ""
    
    # 4. Detect deployment type
    detect_deployment_type
    log ""
    
    # 5. Initialize database if new deployment
    if [[ "$DEPLOYMENT_TYPE" == "new" ]]; then
        log_info "🔧 NEW DEPLOYMENT DETECTED - Initializing system..."
        if ! initialize_database; then
            log_error "Database initialization failed"
            exit 1
        fi
        log_success "🎉 System initialization completed!"
        log ""
    else
        log_info "📊 EXISTING DEPLOYMENT DETECTED - Skipping initialization"
        log ""
    fi
    
    # 6. Start the server
    log_info "🌐 Starting application server..."
    start_server
}

# =============================================================================
# EXECUTION
# =============================================================================
# Check if running directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 