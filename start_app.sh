#!/bin/bash

# =============================================================================
# SECUREWATCH INTELLIGENT FULLSTACK STARTUP SCRIPT
# =============================================================================
# Auto-detects deployment type and initializes system appropriately
# Handles FULLSTACK deployment: Frontend build + Backend server
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
        DEPLOY_TYPE="fullstack"
        log_info "Environment: Render Cloud (Fullstack)"
    elif [[ "$NODE_ENV" == "production" ]]; then
        DEPLOY_ENV="production"
        DEPLOY_TYPE="fullstack"
        log_info "Environment: Production (Fullstack)"
    else
        DEPLOY_ENV="development"
        DEPLOY_TYPE="backend-only"
        log_info "Environment: Development (Backend Only)"
    fi
    
    # Detect customer
    CUSTOMER_SLUG="${CUSTOMER_SLUG:-default}"
    CUSTOMER_NAME="${CUSTOMER_NAME:-SecureWatch}"
    
    log_info "Customer: $CUSTOMER_NAME ($CUSTOMER_SLUG)"
    log_info "Deployment Type: $DEPLOY_TYPE"
}

# =============================================================================
# FRONTEND BUILD (for fullstack deployments)
# =============================================================================
build_frontend() {
    if [[ "$DEPLOY_TYPE" != "fullstack" ]]; then
        log_info "Skipping frontend build for backend-only deployment"
        return 0
    fi
    
    log_info "Building frontend for fullstack deployment..."
    
    # Check if frontend files exist
    if [[ ! -f "$SCRIPT_DIR/package.json" ]] || [[ ! -f "$SCRIPT_DIR/vite.config.ts" ]]; then
        log_warning "Frontend build files not found, skipping frontend build"
        return 0
    fi
    
    cd "$SCRIPT_DIR"
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    if ! npm install; then
        log_error "Frontend dependency installation failed"
        return 1
    fi
    
    # Build frontend
    log_info "Building frontend assets..."
    if ! npm run build; then
        log_error "Frontend build failed"
        return 1
    fi
    
    # Verify build output
    if [[ -d "$SCRIPT_DIR/dist" ]]; then
        log_success "Frontend build completed - dist/ directory created"
        log_info "Frontend build size: $(du -sh dist/ | cut -f1)"
    else
        log_error "Frontend build failed - no dist/ directory found"
        return 1
    fi
    
    return 0
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
    cd "$SCRIPT_DIR/backend"
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
    cd "$SCRIPT_DIR/backend"
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
install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    
    # Install backend dependencies
    if [[ -f "$SCRIPT_DIR/backend/package.json" ]]; then
        cd "$SCRIPT_DIR/backend"
        if command -v npm >/dev/null 2>&1; then
            log_info "Installing backend dependencies..."
            npm install --production
        fi
    fi
    
    log_success "Backend dependencies installed"
}

# =============================================================================
# STATIC FILE SERVING SETUP
# =============================================================================
setup_static_serving() {
    if [[ "$DEPLOY_TYPE" != "fullstack" ]]; then
        log_info "Skipping static file setup for backend-only deployment"
        return 0
    fi
    
    log_info "Setting up static file serving for fullstack deployment..."
    
    # Verify frontend build exists
    if [[ -d "$SCRIPT_DIR/dist" ]]; then
        log_info "Frontend build found - static files will be served from /dist"
        export SERVE_STATIC="true"
        export STATIC_DIR="$SCRIPT_DIR/dist"
    else
        log_warning "No frontend build found - running in API-only mode"
        export SERVE_STATIC="false"
    fi
}

# =============================================================================
# SERVER STARTUP
# =============================================================================
start_server() {
    log_info "Starting SecureWatch fullstack server..."
    
    cd "$SCRIPT_DIR/backend"
    
    # Set environment variables
    export NODE_ENV="${NODE_ENV}"
    export PORT="${PORT}"
    export CUSTOMER_SLUG="${CUSTOMER_SLUG}"
    export CUSTOMER_NAME="${CUSTOMER_NAME}"
    
    log_info "Server configuration:"
    log_info "  - Environment: $NODE_ENV"
    log_info "  - Port: $PORT"
    log_info "  - Customer: $CUSTOMER_NAME ($CUSTOMER_SLUG)"
    log_info "  - Deployment: $DEPLOY_TYPE"
    log_info "  - Static serving: ${SERVE_STATIC:-false}"
    
    # Start the server
    if [[ -f "server.js" ]]; then
        log_success "Starting fullstack server with node server.js"
        exec node server.js
    else
        log_error "Server file not found: backend/server.js"
        exit 1
    fi
}

# =============================================================================
# MAIN EXECUTION FLOW
# =============================================================================
main() {
    log "🚀 SECUREWATCH INTELLIGENT FULLSTACK STARTUP"
    log "============================================="
    log ""
    
    # 1. Detect environment and customer
    detect_environment
    log ""
    
    # 2. Build frontend if fullstack deployment
    if ! build_frontend; then
        log_error "Frontend build failed - continuing with backend only"
    fi
    log ""
    
    # 3. Install backend dependencies if needed
    if [[ "$DEPLOY_ENV" != "render" ]]; then
        install_backend_dependencies
        log ""
    fi
    
    # 4. Test database connectivity
    if ! test_database_connection; then
        log_error "Cannot proceed without database connection"
        exit 1
    fi
    log ""
    
    # 5. Detect deployment type
    detect_deployment_type
    log ""
    
    # 6. Initialize database if new deployment
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
    
    # 7. Setup static file serving for fullstack
    setup_static_serving
    log ""
    
    # 8. Start the server
    log_info "🌐 Starting fullstack application server..."
    start_server
}

# =============================================================================
# EXECUTION
# =============================================================================
# Check if running directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 