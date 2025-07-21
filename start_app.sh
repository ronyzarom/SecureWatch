#!/bin/bash

# =============================================================================
# SECUREWATCH INTELLIGENT FULLSTACK STARTUP SCRIPT
# =============================================================================
# Auto-detects deployment type and initializes system appropriately
# Handles FULLSTACK deployment: Frontend build + Backend server
# Respects existing .env file configuration

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
# ENVIRONMENT FILE LOADING
# =============================================================================
load_environment_files() {
    log_info "Loading environment configuration..."
    
    # Determine which .env file to use based on environment
    local env_file=""
    
    if [[ -n "$RENDER" ]]; then
        log_info "Render environment detected - using environment variables"
        return 0
    elif [[ "$NODE_ENV" == "production" ]]; then
        env_file="backend/.env.production"
    elif [[ "$NODE_ENV" == "development" ]]; then
        env_file="backend/.env.dev"
    else
        env_file="backend/.env"
    fi
    
    # Try the specific environment file first
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment from: $env_file"
        set -a  # Export all variables
        source "$env_file"
        set +a  # Stop exporting
        log_success "Environment variables loaded from $env_file"
        return 0
    fi
    
    # Fallback to backend/.env
    if [[ -f "backend/.env" ]]; then
        log_info "Loading environment from: backend/.env"
        set -a  # Export all variables
        source "backend/.env"
        set +a  # Stop exporting
        log_success "Environment variables loaded from backend/.env"
        return 0
    fi
    
    # Check if .env.example exists and suggest creating .env
    if [[ -f "backend/.env.example" ]]; then
        log_warning "No .env file found, but .env.example exists"
        log_info "Creating backend/.env from backend/.env.example"
        cp "backend/.env.example" "backend/.env"
        log_info "Please edit backend/.env with your configuration and restart"
        set -a
        source "backend/.env"
        set +a
        log_success "Environment variables loaded from new backend/.env"
        return 0
    fi
    
    log_warning "No .env file found - using system environment variables only"
    return 0
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
    
    # Detect customer from environment variables (loaded from .env)
    CUSTOMER_SLUG="${CUSTOMER_SLUG:-default}"
    CUSTOMER_NAME="${CUSTOMER_NAME:-SecureWatch}"
    
    log_info "Customer: $CUSTOMER_NAME ($CUSTOMER_SLUG)"
    log_info "Deployment Type: $DEPLOY_TYPE"
    
    # Log loaded configuration
    log_info "Configuration summary:"
    log_info "  - DATABASE_URL: ${DATABASE_URL:+✅ Set}"
    log_info "  - DB_HOST: ${DB_HOST:-not set}"
    log_info "  - DB_NAME: ${DB_NAME:-not set}"
    log_info "  - SESSION_SECRET: ${SESSION_SECRET:+✅ Set}"
    log_info "  - JWT_SECRET: ${JWT_SECRET:+✅ Set}"
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
    
    # Use DATABASE_URL if available (preferred for cloud deployments)
    if [[ -n "$DATABASE_URL" ]]; then
        log_info "Using DATABASE_URL for connection"
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    # Otherwise use individual DB_* variables from .env
    elif [[ -n "$DB_HOST" ]]; then
        log_info "Using DB_* variables for connection"
        log_info "Database configuration:"
        log_info "  - Host: ${DB_HOST}"
        log_info "  - Port: ${DB_PORT:-5432}"
        log_info "  - Database: ${DB_NAME}"
        log_info "  - User: ${DB_USER}"
    else
        log_error "No database configuration found"
        log_error "Please set DATABASE_URL or DB_* variables in your .env file"
        return 1
    fi
    
    log_info "Database host: ${DB_HOST:-unknown}"
    
    # Test connection using Node.js with dotenv
    cd "$SCRIPT_DIR/backend"
    if node -e "
        require('dotenv').config();
        const { Pool } = require('pg');
        
        let connectionConfig;
        if (process.env.DATABASE_URL) {
            connectionConfig = { connectionString: process.env.DATABASE_URL };
        } else {
            connectionConfig = {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            };
        }
        
        const pool = new Pool(connectionConfig);
        pool.query('SELECT 1')
            .then(() => { 
                console.log('✅ Database connection successful'); 
                process.exit(0); 
            })
            .catch(err => { 
                console.error('❌ Database connection failed:', err.message); 
                process.exit(1); 
            });
    " 2>/dev/null; then
        log_success "Database connection established"
        return 0
    else
        log_error "Database connection failed"
        log_error "Please check your database configuration in .env file"
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
        require('dotenv').config();
        const { Pool } = require('pg');
        
        let connectionConfig;
        if (process.env.DATABASE_URL) {
            connectionConfig = { connectionString: process.env.DATABASE_URL };
        } else {
            connectionConfig = {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            };
        }
        
        const pool = new Pool(connectionConfig);
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
    log_info "Starting SecureWatch server..."
    
    cd "$SCRIPT_DIR/backend"
    
    # Export configuration that was loaded from .env files
    export NODE_ENV="${NODE_ENV}"
    export PORT="${PORT}"
    
    log_info "Server configuration:"
    log_info "  - Environment: $NODE_ENV"
    log_info "  - Port: $PORT"
    log_info "  - Customer: ${CUSTOMER_NAME} (${CUSTOMER_SLUG})"
    log_info "  - Deployment: $DEPLOY_TYPE"
    log_info "  - Static serving: ${SERVE_STATIC:-false}"
    log_info "  - Database: ${DATABASE_URL:+DATABASE_URL}${DB_HOST:+DB_HOST}"
    
    if [[ "$DEPLOY_TYPE" == "backend-only" ]]; then
        # Development mode: Start both backend and frontend
        log_info "🔧 Development mode: Starting backend AND frontend servers"
        
        # Start backend server in background
        if [[ -f "server.js" ]]; then
            log_success "Starting backend server on port $PORT"
            node server.js &
            BACKEND_PID=$!
            log_info "Backend PID: $BACKEND_PID"
        else
            log_error "Server file not found: backend/server.js"
            exit 1
        fi
        
        # Give backend time to start
        sleep 2
        
        # Start frontend dev server
        cd "$SCRIPT_DIR"
        if [[ -f "package.json" ]]; then
            log_success "Starting frontend dev server"
            log_info "Frontend will be available at: http://localhost:5173"
            log_info "Backend API available at: http://localhost:$PORT"
            log_info ""
            log_info "🌟 Development servers running:"
            log_info "   Frontend: http://localhost:5173"
            log_info "   Backend:  http://localhost:$PORT"
            log_info "   API:      http://localhost:$PORT/api"
            log_info ""
            log_info "Press Ctrl+C to stop both servers"
            
            # Setup signal handlers to kill both processes
            trap 'log_info "Stopping servers..."; kill $BACKEND_PID 2>/dev/null; exit 0' SIGINT SIGTERM
            
            # Start frontend (this will block)
            npm run dev
        else
            log_error "Frontend package.json not found"
            log_info "Backend server running on port $PORT"
            wait $BACKEND_PID
        fi
    else
        # Production/Render mode: Single fullstack server
        log_info "🌐 Production mode: Starting fullstack server"
        
        # Start the server (it will load .env via dotenv)
        if [[ -f "server.js" ]]; then
            log_success "Starting fullstack server with node server.js"
            exec node server.js
        else
            log_error "Server file not found: backend/server.js"
            exit 1
        fi
    fi
}

# =============================================================================
# MAIN EXECUTION FLOW
# =============================================================================
main() {
    log "🚀 SECUREWATCH INTELLIGENT FULLSTACK STARTUP"
    log "============================================="
    log ""
    
    # 1. Load environment files (.env, .env.dev, etc.)
    load_environment_files
    log ""
    
    # 2. Detect environment and customer
    detect_environment
    log ""
    
    # 3. Build frontend if fullstack deployment
    if ! build_frontend; then
        log_error "Frontend build failed - continuing with backend only"
    fi
    log ""
    
    # 4. Install backend dependencies if needed
    if [[ "$DEPLOY_ENV" != "render" ]]; then
        install_backend_dependencies
        log ""
    fi
    
    # 5. Test database connectivity
    if ! test_database_connection; then
        log_error "Cannot proceed without database connection"
        log_error "Please check your .env file configuration"
        exit 1
    fi
    log ""
    
    # 6. Detect deployment type
    detect_deployment_type
    log ""
    
    # 7. Initialize database if new deployment
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
    
    # 8. Setup static file serving for fullstack
    setup_static_serving
    log ""
    
    # 9. Start the server
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