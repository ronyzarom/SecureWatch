#!/bin/bash
set -e

# =============================================================================
# SecureWatch - Demo Server Setup Script
# =============================================================================
# This script sets up a demo instance of SecureWatch with realistic sample data
# for demonstrations, trials, and development purposes.
#
# Usage: ./demo-server.sh [--environment staging] [--reset]
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
ENVIRONMENT="demo"
RESET_DATA=false
DATABASE_URL="${DATABASE_URL:-}"
DEMO_DOMAIN="${DEMO_DOMAIN:-demo.securewatch.com}"

# Demo configuration
DEMO_COMPANIES=(
  "TechCorp Solutions:technology:200"
  "MedHealth Systems:healthcare:150"
  "FinanceFirst Bank:finance:300"
  "RetailMax Inc:retail:400"
  "EduLearn University:education:500"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --reset)
      RESET_DATA=true
      shift
      ;;
    --database-url)
      DATABASE_URL="$2"
      shift 2
      ;;
    --domain)
      DEMO_DOMAIN="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --environment    Environment name (demo, staging, dev)"
      echo "  --reset          Reset all demo data"
      echo "  --database-url   Override database URL"
      echo "  --domain         Demo domain name"
      echo "  --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Setup demo server"
      echo "  $0 --environment staging --reset     # Reset staging demo"
      echo "  $0 --database-url postgresql://...   # Custom database"
      exit 0
      ;;
    *)
      log_error "Unknown option $1"
      exit 1
      ;;
  esac
done

# Check dependencies
check_dependencies() {
  log_info "Checking dependencies..."
  
  local missing_deps=()
  
  command -v psql >/dev/null 2>&1 || missing_deps+=("postgresql-client")
  command -v python3 >/dev/null 2>&1 || missing_deps+=("python3")
  command -v pip3 >/dev/null 2>&1 || missing_deps+=("python3-pip")
  
  if [[ ${#missing_deps[@]} -ne 0 ]]; then
    log_error "Missing dependencies: ${missing_deps[*]}"
    log_info "Install with: brew install ${missing_deps[*]} (macOS)"
    exit 1
  fi
  
  # Check Python packages
  if ! python3 -c "import faker, psycopg2" >/dev/null 2>&1; then
    log_info "Installing Python dependencies..."
    pip3 install faker psycopg2-binary >/dev/null 2>&1
  fi
  
  log_success "All dependencies satisfied"
}

# Setup database connection
setup_database() {
  log_info "Setting up database connection..."
  
  if [[ -z "$DATABASE_URL" ]]; then
    # Use default demo database
    DATABASE_URL="postgresql://demo_user:demo_pass@localhost:5432/securewatch_demo"
    log_warning "Using default database URL: $DATABASE_URL"
    log_info "To use custom database, set DATABASE_URL environment variable"
  fi
  
  # Test connection
  if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    log_error "Cannot connect to database: $DATABASE_URL"
    log_info "Please ensure PostgreSQL is running and database exists"
    exit 1
  fi
  
  log_success "Database connection established"
}

# Reset demo data
reset_demo_data() {
  log_warning "Resetting demo data..."
  
  read -p "This will delete ALL existing data. Are you sure? (y/N): " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Reset cancelled"
    return 0
  fi
  
  log_info "Dropping and recreating schema..."
  psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >/dev/null
  
  log_success "Demo data reset completed"
}

# Initialize database schema
init_demo_schema() {
  log_info "Initializing demo database schema..."
  
  # Apply core schema
  if [[ -f "$PROJECT_ROOT/backend/database/schema.sql" ]]; then
    psql "$DATABASE_URL" < "$PROJECT_ROOT/backend/database/schema.sql" >/dev/null
  else
    log_error "Core schema file not found"
    exit 1
  fi
  
  # Apply training management schema
  if [[ -f "$PROJECT_ROOT/backend/database/training-management-schema.sql" ]]; then
    psql "$DATABASE_URL" < "$PROJECT_ROOT/backend/database/training-management-schema.sql" >/dev/null
  fi
  
  # Create demo-specific tables
  psql "$DATABASE_URL" << 'EOF' >/dev/null
-- Demo tracking table
CREATE TABLE IF NOT EXISTS demo_metadata (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mark as demo environment
INSERT INTO demo_metadata (key, value) VALUES 
('environment', 'demo'),
('setup_date', NOW()::text),
('version', '1.0.0');
EOF
  
  log_success "Schema initialization completed"
}

# Create demo companies
create_demo_companies() {
  log_info "Creating demo companies..."
  
  local company_id=1
  
  for company_data in "${DEMO_COMPANIES[@]}"; do
    IFS=':' read -r company_name industry employee_count <<< "$company_data"
    
    log_info "Setting up: $company_name ($industry, $employee_count employees)"
    
    # Create company record (if you have a companies table)
    psql "$DATABASE_URL" << EOF >/dev/null
INSERT INTO demo_metadata (key, value) VALUES 
('company_${company_id}_name', '$company_name'),
('company_${company_id}_industry', '$industry'),
('company_${company_id}_size', '$employee_count');
EOF
    
    # Generate employees for this company
    python3 - << EOF
import psycopg2
import random
from faker import Faker

fake = Faker()
db_url = "$DATABASE_URL"
company_name = "$company_name"
industry = "$industry"
employee_count = int("$employee_count")
company_id = $company_id

# Industry-specific departments
departments = {
    'technology': ['Engineering', 'Product', 'DevOps', 'QA', 'Sales', 'Marketing', 'HR'],
    'healthcare': ['Clinical', 'Administration', 'IT', 'Finance', 'HR', 'Compliance'],
    'finance': ['Investment', 'Risk', 'Compliance', 'Operations', 'IT', 'HR'],
    'retail': ['Operations', 'Sales', 'Marketing', 'Supply Chain', 'IT', 'HR'],
    'education': ['Academic', 'Administration', 'IT', 'Student Services', 'HR']
}

dept_list = departments.get(industry, ['Operations', 'Sales', 'IT', 'HR'])

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

for i in range(employee_count):
    name = fake.name()
    email = f"{name.lower().replace(' ', '.')}.{i}@{company_name.lower().replace(' ', '')}.com"
    department = random.choice(dept_list)
    role = fake.job()
    hire_date = fake.date_between(start_date='-5y', end_date='today')
    
    # Risk scoring based on role and department
    risk_score = random.randint(10, 85)
    if 'admin' in role.lower() or 'manager' in role.lower():
        risk_score += 10
    if department in ['IT', 'Engineering', 'Finance']:
        risk_score += 5
    risk_score = min(risk_score, 100)
    
    cursor.execute("""
        INSERT INTO employees (name, email, department, role, hire_date, risk_score, company_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (name, email, department, role, hire_date, risk_score, company_id))

conn.commit()
cursor.close()
conn.close()
print(f"Generated {employee_count} employees for {company_name}")
EOF
    
    company_id=$((company_id + 1))
  done
  
  log_success "Demo companies created"
}

# Seed training content
seed_training_content() {
  log_info "Seeding comprehensive training content..."
  
  # Core training programs
  psql "$DATABASE_URL" << 'EOF' >/dev/null
-- Universal Security Training
INSERT INTO training_programs (title, description, type, duration_minutes, created_by) VALUES
('Security Awareness Fundamentals', 'Essential cybersecurity knowledge for all employees', 'mandatory', 45, 1),
('Phishing Prevention Mastery', 'Advanced phishing detection and prevention', 'mandatory', 30, 1),
('Data Protection Essentials', 'Protecting sensitive company and customer data', 'mandatory', 40, 1),
('Password Security & Authentication', 'Best practices for secure authentication', 'mandatory', 25, 1),
('Remote Work Security', 'Security guidelines for distributed teams', 'optional', 35, 1),
('Incident Response Training', 'How to respond to security incidents', 'optional', 50, 1),
('Social Engineering Defense', 'Recognizing and preventing social attacks', 'mandatory', 30, 1),
('Mobile Device Security', 'Securing smartphones and tablets', 'optional', 20, 1),
('Cloud Security Basics', 'Security in cloud environments', 'optional', 40, 1),
('Privacy Regulations Overview', 'Understanding GDPR, CCPA, and other regulations', 'mandatory', 60, 1);

-- Interactive training content
INSERT INTO training_content (title, type, content_data, description, duration_minutes) VALUES
('Interactive Phishing Simulator', 'interactive', '{"type": "phishing_sim", "scenarios": 20}', 'Real-world phishing email simulation', 25),
('Password Strength Analyzer', 'interactive', '{"type": "password_tool", "exercises": 10}', 'Hands-on password security training', 15),
('Data Classification Workshop', 'interactive', '{"type": "classification_game", "levels": 5}', 'Learn to classify data sensitivity', 20),
('Incident Response Simulation', 'simulation', '{"type": "incident_sim", "scenarios": 8}', 'Practice incident response procedures', 45),
('Security Policy Quiz', 'quiz', '{"questions": 30, "categories": 6}', 'Test knowledge of security policies', 20),
('Social Engineering Scenarios', 'simulation', '{"type": "social_eng_sim", "scenarios": 15}', 'Practice defending against social attacks', 30),
('Mobile Security Checklist', 'checklist', '{"items": 25, "categories": 5}', 'Step-by-step mobile security guide', 15),
('Cloud Configuration Lab', 'lab', '{"type": "cloud_lab", "exercises": 12}', 'Hands-on cloud security configuration', 60),
('Privacy Impact Assessment', 'assessment', '{"type": "privacy_assessment", "scenarios": 10}', 'Practice privacy impact assessments', 40),
('Security Culture Survey', 'survey', '{"questions": 20, "dimensions": 4}', 'Assess organizational security culture', 10);
EOF
  
  log_success "Training content seeded"
}

# Generate realistic violations
generate_violations() {
  log_info "Generating realistic security violations..."
  
  python3 - << 'EOF'
import psycopg2
import random
from datetime import datetime, timedelta

db_url = "$DATABASE_URL"

# Violation types with realistic patterns
violation_types = [
    ('Phishing Email Clicked', 'Employee clicked on suspicious email link', ['Medium', 'High']),
    ('Weak Password Detected', 'Password does not meet security requirements', ['Low', 'Medium']),
    ('Unauthorized Software Installation', 'Unapproved software installed on company device', ['Medium', 'High']),
    ('Data Exfiltration Attempt', 'Suspicious data transfer detected', ['High', 'Critical']),
    ('Failed Login Attempts', 'Multiple failed authentication attempts', ['Low', 'Medium']),
    ('Suspicious Email Forwarding', 'Email forwarded to external address', ['Medium', 'High']),
    ('USB Device Violation', 'Unauthorized USB device connected', ['Medium']),
    ('After Hours Access', 'Unusual system access outside business hours', ['Low', 'Medium']),
    ('Policy Violation', 'Violation of company security policy', ['Medium']),
    ('Social Engineering Attempt', 'Suspected social engineering attack', ['High', 'Critical'])
]

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Get employee IDs
cursor.execute("SELECT id FROM employees")
employee_ids = [row[0] for row in cursor.fetchall()]

# Generate violations over the past 90 days
for _ in range(150):  # Generate 150 violations
    employee_id = random.choice(employee_ids)
    violation_type, base_description, severities = random.choice(violation_types)
    severity = random.choice(severities)
    
    # Vary the description
    descriptions = [
        base_description,
        f"Automated detection: {base_description.lower()}",
        f"Security alert: {base_description.lower()}",
        f"Policy breach: {base_description.lower()}"
    ]
    description = random.choice(descriptions)
    
    # Random date within last 90 days
    days_ago = random.randint(0, 90)
    detected_at = datetime.now() - timedelta(days=days_ago)
    
    # Status distribution
    status_weights = [('Active', 30), ('Resolved', 60), ('Under Review', 10)]
    status = random.choices([s[0] for s in status_weights], weights=[s[1] for s in status_weights])[0]
    
    # Evidence
    evidence = [
        f"Email ID: {random.randint(10000, 99999)}",
        f"IP Address: 192.168.{random.randint(1, 254)}.{random.randint(1, 254)}",
        f"Timestamp: {detected_at.isoformat()}"
    ]
    
    cursor.execute("""
        INSERT INTO violations (employee_id, type, description, severity, status, detected_at, evidence, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (employee_id, violation_type, description, severity, status, detected_at, evidence, '{}'))

conn.commit()
cursor.close()
conn.close()
print("Generated 150 realistic security violations")
EOF
  
  log_success "Violations generated"
}

# Create demo admin users
create_demo_users() {
  log_info "Creating demo admin users..."
  
  python3 - << 'EOF'
import psycopg2
import bcrypt

db_url = "$DATABASE_URL"

demo_users = [
    ('demo@securewatch.com', 'Demo Administrator', 'admin', 'password123'),
    ('analyst@securewatch.com', 'Security Analyst', 'analyst', 'analyst123'),
    ('manager@securewatch.com', 'Security Manager', 'manager', 'manager123'),
    ('viewer@securewatch.com', 'Read Only User', 'viewer', 'viewer123')
]

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

for email, name, role, password in demo_users:
    # Hash password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    cursor.execute("""
        INSERT INTO users (email, name, role, password_hash, created_at, is_demo_account)
        VALUES (%s, %s, %s, %s, NOW(), true)
        ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_demo_account = true
    """, (email, name, role, hashed_password))

conn.commit()
cursor.close()
conn.close()
print("Created demo admin users")
EOF
  
  log_success "Demo users created"
}

# Setup demo data refresh
setup_auto_refresh() {
  log_info "Setting up demo data auto-refresh..."
  
  # Create refresh script
  cat > "$PROJECT_ROOT/scripts/refresh-demo-data.sh" << 'EOF'
#!/bin/bash
# Auto-refresh demo data (run daily)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Refresh violations (add new ones, age old ones)
python3 - << 'PYTHON_EOF'
import psycopg2
import random
from datetime import datetime, timedelta
import os

db_url = os.environ.get('DATABASE_URL', 'postgresql://demo_user:demo_pass@localhost:5432/securewatch_demo')

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Archive old violations (older than 6 months)
cursor.execute("""
    UPDATE violations 
    SET status = 'Archived' 
    WHERE detected_at < NOW() - INTERVAL '6 months'
    AND status != 'Archived'
""")

# Add a few new violations
violation_types = [
    'Phishing Email Clicked',
    'Weak Password Detected', 
    'Suspicious Email Forwarding',
    'After Hours Access'
]

cursor.execute("SELECT id FROM employees ORDER BY RANDOM() LIMIT 5")
employee_ids = [row[0] for row in cursor.fetchall()]

for employee_id in employee_ids:
    violation_type = random.choice(violation_types)
    severity = random.choice(['Low', 'Medium', 'High'])
    
    cursor.execute("""
        INSERT INTO violations (employee_id, type, description, severity, status, detected_at)
        VALUES (%s, %s, %s, %s, 'Active', NOW())
    """, (employee_id, violation_type, f"Automated detection: {violation_type.lower()}", severity))

conn.commit()
cursor.close()
conn.close()
print("Demo data refreshed")
PYTHON_EOF
EOF
  
  chmod +x "$PROJECT_ROOT/scripts/refresh-demo-data.sh"
  
  log_success "Auto-refresh setup completed"
}

# Generate demo summary
generate_demo_summary() {
  local summary_file="demo-setup-summary.txt"
  
  log_info "Generating demo summary..."
  
  # Get statistics
  local total_employees=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM employees;" | xargs)
  local total_violations=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM violations;" | xargs)
  local total_programs=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM training_programs;" | xargs)
  local total_users=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE is_demo_account = true;" | xargs)
  
  cat > "$summary_file" << EOF
SecureWatch Demo Environment Summary
===================================

Setup Date: $(date)
Environment: $ENVIRONMENT
Domain: $DEMO_DOMAIN
Database: $DATABASE_URL

Demo Data Statistics:
- Companies: ${#DEMO_COMPANIES[@]}
- Employees: $total_employees
- Security Violations: $total_violations
- Training Programs: $total_programs
- Demo Users: $total_users

Demo User Accounts:
- demo@securewatch.com / password123 (Admin)
- analyst@securewatch.com / analyst123 (Analyst)
- manager@securewatch.com / manager123 (Manager)
- viewer@securewatch.com / viewer123 (Viewer)

Demo Companies:
$(printf '%s\n' "${DEMO_COMPANIES[@]}" | sed 's/:/: /' | sed 's/:/ employees in /')

Features Demonstrated:
✓ Employee risk management
✓ Security violation tracking
✓ Training program management
✓ Compliance monitoring
✓ Real-time analytics
✓ Multi-company simulation

Refresh Schedule:
- Data auto-refresh: Daily
- Violations aging: Weekly
- New content: Monthly

Management Commands:
- Reset demo: ./demo-server.sh --reset
- Refresh data: ./refresh-demo-data.sh
- View logs: tail -f /var/log/securewatch-demo.log

Support:
- Documentation: https://docs.securewatch.com
- Demo Support: demo@securewatch.com
EOF

  log_success "Summary saved to: $summary_file"
}

# Main execution
main() {
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║              SecureWatch - Demo Server Setup            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  
  log_info "Setting up demo environment: $ENVIRONMENT"
  echo ""
  
  # Execute setup steps
  check_dependencies
  setup_database
  
  if $RESET_DATA; then
    reset_demo_data
  fi
  
  init_demo_schema
  create_demo_companies
  seed_training_content
  generate_violations
  create_demo_users
  setup_auto_refresh
  generate_demo_summary
  
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║                Demo Setup Complete! 🎉                  ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  log_success "Demo environment ready at: $DEMO_DOMAIN"
  log_info "Demo admin: demo@securewatch.com / password123"
  log_info "Summary: demo-setup-summary.txt"
  log_warning "This is a DEMO environment - data will be refreshed regularly"
}

# Run main function
main "$@" 