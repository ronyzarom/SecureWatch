# 🚀 SecureWatch Deployment Scripts

This directory contains three essential scripts for managing SecureWatch deployments across different scenarios.

## 📋 **Script Overview**

| Script | Purpose | Use Case |
|--------|---------|----------|
| `new-customer.sh` | Complete new customer setup | Production customer onboarding |
| `update-customer.sh` | Update existing customers | Migrations, patches, feature releases |
| `demo-server.sh` | Demo environment setup | Sales demos, trials, development |

---

## 1️⃣ **New Customer Setup**

### **Purpose**
Sets up a complete SecureWatch instance for a new customer including infrastructure, database, and initial data seeding.

### **Usage**
```bash
# Basic setup
./new-customer.sh --config config/acme-corp.json

# Dry run (preview changes)
./new-customer.sh --config config/acme-corp.json --dry-run

# Help
./new-customer.sh --help
```

### **Configuration File Format**
Create a JSON configuration file (see `config/customer-template.json`):

```json
{
  "customer": {
    "name": "ACME Corporation",
    "industry": "technology",
    "size": "midsize"
  },
  "database": {
    "host": "acme-db.render.com",
    "name": "securewatch_acme",
    "user": "acme_user",
    "password": "secure_password"
  },
  "admin": {
    "email": "admin@acme.com",
    "name": "ACME Administrator"
  }
}
```

### **What It Does**
1. ✅ Validates configuration and dependencies
2. ✅ Creates Render services (backend/frontend)
3. ✅ Initializes database schema
4. ✅ Seeds training content and compliance frameworks
5. ✅ Generates sample data (optional)
6. ✅ Creates admin user
7. ✅ Generates setup summary

### **Example Output**
```
╔══════════════════════════════════════════════════════════╗
║               SecureWatch - New Customer Setup          ║
╚══════════════════════════════════════════════════════════╝

[INFO] Checking dependencies...
[SUCCESS] All dependencies satisfied
[INFO] Customer: ACME Corporation (technology, midsize)
[SUCCESS] Database connection successful
[SUCCESS] Setup Complete! 🎉

Admin login: admin@acme.com / generated_password_123
Summary: customer-acme-corp-summary.txt
```

---

## 2️⃣ **Existing Customer Updates**

### **Purpose**
Updates existing SecureWatch instances with new features, database migrations, and security patches.

### **Usage**
```bash
# Update all customers to new version
./update-customer.sh --version v2.1.0

# Update specific customer
./update-customer.sh --version v2.1.0 --customer acme-corp

# Rollback customer to previous version
./update-customer.sh --rollback v2.0.0 --customer acme-corp

# Dry run
./update-customer.sh --version v2.1.0 --dry-run

# Skip backup
./update-customer.sh --version v2.1.0 --no-backup
```

### **Customer Configuration**
Maintains customer list in `config/customers.json`:

```json
{
  "customers": [
    {
      "name": "ACME Corporation",
      "database_url": "postgresql://...",
      "render_services": {
        "backend": "srv-acme-backend-123",
        "frontend": "srv-acme-frontend-456"
      },
      "current_version": "v2.0.0"
    }
  ]
}
```

### **What It Does**
1. 🔍 Checks current versions
2. 💾 Creates database backups
3. 🔄 Applies database migrations
4. 🚀 Triggers Render deployments
5. ✅ Verifies successful updates
6. 📊 Generates update report

### **Migration Structure**
```
migrations/
├── v2.1.0/
│   ├── 001_add_new_features.sql
│   ├── 002_update_indexes.sql
│   └── 003_seed_content.sql
└── v2.2.0/
    ├── 001_schema_changes.sql
    └── 002_data_migration.sql
```

---

## 3️⃣ **Demo Server Setup**

### **Purpose**
Sets up a demo instance with realistic sample data for demonstrations, trials, and development.

### **Usage**
```bash
# Basic demo setup
./demo-server.sh

# Custom environment
./demo-server.sh --environment staging

# Reset existing demo data
./demo-server.sh --reset

# Custom database
./demo-server.sh --database-url postgresql://demo:pass@localhost/demo

# Custom domain
./demo-server.sh --domain demo.yourcompany.com
```

### **What It Creates**
1. 🏢 **5 Demo Companies** (1,550 total employees)
   - TechCorp Solutions (Technology, 200 employees)
   - MedHealth Systems (Healthcare, 150 employees)
   - FinanceFirst Bank (Finance, 300 employees)
   - RetailMax Inc (Retail, 400 employees)
   - EduLearn University (Education, 500 employees)

2. 📚 **Comprehensive Training Content**
   - 10 training programs
   - 10 interactive content modules
   - Industry-specific content

3. 🚨 **150 Realistic Violations**
   - Phishing attempts
   - Policy violations
   - Security incidents
   - Distributed across 90 days

4. 👥 **Demo User Accounts**
   - `demo@securewatch.com` / `password123` (Admin)
   - `analyst@securewatch.com` / `analyst123` (Analyst)
   - `manager@securewatch.com` / `manager123` (Manager)
   - `viewer@securewatch.com` / `viewer123` (Viewer)

### **Auto-Refresh Features**
- Daily violation generation
- Weekly data aging
- Monthly content updates

---

## 🛠️ **Prerequisites**

### **Required Tools**
```bash
# macOS
brew install jq postgresql python3

# Ubuntu/Debian
apt-get install jq postgresql-client python3 python3-pip

# Python packages
pip3 install faker psycopg2-binary bcrypt
```

### **Environment Variables**
```bash
# For production deployments
export RENDER_API_KEY="your_render_api_key"
export DATABASE_URL="postgresql://user:pass@host:port/db"

# For demo environment
export DEMO_DATABASE_URL="postgresql://demo:pass@localhost/demo"
```

---

## 📁 **File Structure**

```
scripts/
├── new-customer.sh          # New customer setup
├── update-customer.sh       # Customer updates
├── demo-server.sh           # Demo environment
├── refresh-demo-data.sh     # Auto-generated demo refresh
└── README.md                # This file

config/
├── customer-template.json   # Template for new customers
├── customers.json           # Existing customer registry
└── demo-config.json         # Demo environment settings

migrations/
├── v2.1.0/
│   ├── 001_add_features.sql
│   └── 002_update_data.sql
└── v2.2.0/
    └── 001_schema_changes.sql

seed-data/
├── core/
│   ├── training-library.sql
│   └── compliance-frameworks.sql
├── industry/
│   ├── healthcare.sql
│   ├── finance.sql
│   └── technology.sql
└── size/
    ├── startup.sql
    ├── midsize.sql
    └── enterprise.sql
```

---

## 🚨 **Important Notes**

### **Security**
- 🔐 Always use strong passwords in configuration files
- 🔒 Store sensitive configs outside of version control
- 🔑 Rotate database credentials regularly
- 📋 Review all configurations before production use

### **Backups**
- 💾 Automatic backups created before updates
- 🗄️ Backups stored in `backups/` directory
- ⏰ Retention policy: 30 days for production, 7 days for demo
- 🔄 Test restore procedures regularly

### **Monitoring**
- 📊 Check deployment status in Render dashboard
- 📈 Monitor database performance after migrations
- 🚨 Set up alerts for failed deployments
- 📝 Review logs for any errors

---

## 🎯 **Quick Start Examples**

### **New Customer (ACME Corp)**
```bash
# 1. Create configuration
cp config/customer-template.json config/acme-corp.json
# Edit config/acme-corp.json with ACME details

# 2. Run setup
./new-customer.sh --config config/acme-corp.json

# 3. Verify deployment
# Check Render dashboard and test login
```

### **Update All Customers**
```bash
# 1. Test migration
./update-customer.sh --version v2.1.0 --dry-run

# 2. Update staging first
./update-customer.sh --version v2.1.0 --customer staging-customer

# 3. Update all production customers
./update-customer.sh --version v2.1.0
```

### **Demo Environment**
```bash
# 1. Quick demo setup
./demo-server.sh

# 2. Reset and recreate
./demo-server.sh --reset

# 3. Custom demo for staging
./demo-server.sh --environment staging --domain staging-demo.securewatch.com
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

**Database Connection Failed**
```bash
# Check database URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/database

# Test connection manually
psql $DATABASE_URL -c "SELECT version();"
```

**Render API Issues**
```bash
# Verify API key
curl -H "Authorization: Bearer $RENDER_API_KEY" \
     https://api.render.com/v1/services

# Check service status manually in dashboard
```

**Migration Failures**
```bash
# Check current schema version
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;"

# Manual rollback if needed
./update-customer.sh --rollback v2.0.0 --customer affected-customer
```

**Demo Data Issues**
```bash
# Reset demo completely
./demo-server.sh --reset

# Check demo data
psql $DEMO_DATABASE_URL -c "SELECT COUNT(*) FROM employees;"
```

---

## 📞 **Support**

- 📖 **Documentation**: https://docs.securewatch.com
- 💬 **Support Email**: support@securewatch.com
- 🐛 **Bug Reports**: Create GitHub issue
- 💡 **Feature Requests**: support@securewatch.com

---

*Last updated: March 2024* 