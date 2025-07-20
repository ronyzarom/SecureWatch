# SecureWatch Deployment Procedure
**Document Version:** 1.0  
**Last Updated:** March 2024  
**Approved By:** [Technical Lead]  
**Review Date:** June 2024  

---

## Table of Contents
1. [Document Overview](#1-document-overview)
2. [Scope and Applicability](#2-scope-and-applicability)
3. [Prerequisites](#3-prerequisites)
4. [Security Requirements](#4-security-requirements)
5. [Deployment Procedures](#5-deployment-procedures)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Rollback Procedures](#7-rollback-procedures)
8. [Troubleshooting](#8-troubleshooting)
9. [Appendices](#9-appendices)

---

## 1. Document Overview

### 1.1 Purpose
This document provides standardized procedures for deploying SecureWatch across three primary scenarios:
- **New Customer Deployment**: Complete setup for new customer instances
- **Existing Customer Updates**: Migrations and feature deployments
- **Demo Environment Setup**: Sales demonstrations and development environments

### 1.2 Objectives
- Ensure consistent, reliable deployments across all environments
- Minimize deployment risks through standardized procedures
- Provide clear rollback and recovery procedures
- Maintain security and data integrity throughout the deployment process

### 1.3 Document Control
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2024 | Development Team | Initial procedure documentation |

---

## 2. Scope and Applicability

### 2.1 In Scope
- Production customer deployments
- Staging environment updates
- Demo environment management
- Database migrations and schema updates
- Application code deployments via Render platform
- Training content and sample data seeding

### 2.2 Out of Scope
- Infrastructure provisioning (handled by Render)
- DNS configuration
- SSL certificate management
- Third-party integrations setup

### 2.3 Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Deployment Engineer** | Execute deployment procedures, verify success |
| **Technical Lead** | Approve deployments, provide technical oversight |
| **Customer Success** | Customer communication, coordinate maintenance windows |
| **Security Officer** | Review security configurations, approve production deployments |

---

## 3. Prerequisites

### 3.1 Technical Requirements

#### 3.1.1 Required Software
```bash
# System dependencies
- jq (JSON processor)
- PostgreSQL client (psql)
- Python 3.8+
- Git
- curl

# Python packages
- faker
- psycopg2-binary
- bcrypt
```

#### 3.1.2 Access Requirements
- [ ] Render platform access with API key
- [ ] Database administrator credentials
- [ ] GitHub repository access
- [ ] Customer notification channels access

#### 3.1.3 Environment Variables
```bash
# Production deployments
export RENDER_API_KEY="rnd_xxxxxxxxxx"
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Demo environments
export DEMO_DATABASE_URL="postgresql://demo:pass@localhost/demo"
```

### 3.2 Pre-Deployment Checklist

#### 3.2.1 General Requirements
- [ ] All code changes merged to main branch
- [ ] Database migrations tested in staging
- [ ] Backup procedures verified
- [ ] Customer notification sent (if applicable)
- [ ] Maintenance window scheduled
- [ ] Rollback plan prepared

#### 3.2.2 New Customer Specific
- [ ] Customer configuration file prepared and reviewed
- [ ] Database instance provisioned
- [ ] Render services created
- [ ] Admin credentials generated
- [ ] Training content customized (if required)

#### 3.2.3 Update Specific
- [ ] Migration scripts prepared and tested
- [ ] Customer registry updated
- [ ] Backup storage capacity verified
- [ ] Render deployment pipeline configured

---

## 4. Security Requirements

### 4.1 Data Protection
- All customer data must be encrypted in transit and at rest
- Database credentials must be unique per customer
- Backup files must be encrypted and stored securely
- Access logs must be maintained for all deployment activities

### 4.2 Access Control
- Deployment scripts require multi-factor authentication
- Production database access requires approval
- API keys must be rotated regularly
- Customer data access follows principle of least privilege

### 4.3 Compliance Requirements
- GDPR compliance for EU customers
- SOC 2 Type II requirements for enterprise customers
- Data residency requirements must be respected
- Audit trails maintained for all deployments

---

## 5. Deployment Procedures

## 5.1 New Customer Deployment

### 5.1.1 Preparation Phase

**Step 1: Customer Configuration**
```bash
# Copy template configuration
cp config/customer-template.json config/[customer-slug].json

# Customize configuration file
# Required fields:
# - customer.name
# - customer.industry
# - customer.size
# - database.host
# - database.name
# - database.user
# - database.password
# - admin.email
# - admin.name
```

**Step 2: Security Review**
- [ ] Review customer configuration for security compliance
- [ ] Verify database credentials are unique and secure
- [ ] Confirm admin email is authorized
- [ ] Validate industry-specific compliance requirements

**Step 3: Infrastructure Verification**
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Verify Render API access
curl -H "Authorization: Bearer $RENDER_API_KEY" \
     https://api.render.com/v1/services
```

### 5.1.2 Deployment Execution

**Step 1: Dry Run Execution**
```bash
# Perform dry run to validate configuration
./scripts/new-customer.sh --config config/[customer-slug].json --dry-run

# Review dry run output for any issues
# Verify all components will be deployed correctly
```

**Step 2: Production Deployment**
```bash
# Execute deployment
./scripts/new-customer.sh --config config/[customer-slug].json

# Monitor deployment progress
# Log any errors or warnings
```

**Step 3: Deployment Verification**
```bash
# Verify database schema
psql $DATABASE_URL -c "\dt"

# Check admin user creation
psql $DATABASE_URL -c "SELECT email, role FROM users WHERE role = 'admin';"

# Verify training content
psql $DATABASE_URL -c "SELECT COUNT(*) FROM training_programs;"
```

### 5.1.3 Post-Deployment Tasks

**Step 1: Service Verification**
- [ ] Verify Render services are deployed and running
- [ ] Test admin login functionality
- [ ] Confirm all features are accessible
- [ ] Validate sample data (if included)

**Step 2: Customer Handoff**
- [ ] Provide admin credentials securely
- [ ] Schedule customer onboarding session
- [ ] Deliver setup summary document
- [ ] Configure monitoring and alerts

**Step 3: Documentation**
- [ ] Update customer registry
- [ ] Generate deployment report
- [ ] Archive configuration files
- [ ] Update support documentation

---

## 5.2 Existing Customer Updates

### 5.2.1 Preparation Phase

**Step 1: Update Planning**
```bash
# Review current customer versions
./scripts/update-customer.sh --version [target-version] --dry-run

# Identify customers requiring updates
jq '.customers[] | select(.current_version != "[target-version]")' config/customers.json
```

**Step 2: Migration Preparation**
```bash
# Prepare migration files
mkdir -p migrations/[target-version]

# Create migration scripts:
# - Schema changes
# - Data migrations  
# - Index updates
# - Content updates
```

**Step 3: Staging Validation**
- [ ] Test migrations on staging environment
- [ ] Verify application compatibility
- [ ] Performance test with production data volume
- [ ] Validate rollback procedures

### 5.2.2 Deployment Execution

**Step 1: Single Customer Test**
```bash
# Update staging customer first
./scripts/update-customer.sh --version [target-version] --customer staging-customer

# Verify successful update
# Monitor for any issues
```

**Step 2: Production Rollout**

**Option A: All Customers (Recommended for minor updates)**
```bash
# Update all customers simultaneously
./scripts/update-customer.sh --version [target-version]
```

**Option B: Phased Rollout (Recommended for major updates)**
```bash
# Update customers in phases
./scripts/update-customer.sh --version [target-version] --customer customer-group-1
./scripts/update-customer.sh --version [target-version] --customer customer-group-2
./scripts/update-customer.sh --version [target-version] --customer customer-group-3
```

**Step 3: Verification**
```bash
# Verify all customers updated successfully
jq '.customers[] | select(.current_version == "[target-version]")' config/customers.json

# Check deployment status
# Monitor application health
```

### 5.2.3 Post-Update Verification

**Step 1: Health Checks**
- [ ] Database connectivity test
- [ ] Application functionality verification
- [ ] Performance monitoring
- [ ] Error rate analysis

**Step 2: Customer Communication**
- [ ] Send update completion notification
- [ ] Provide new feature documentation
- [ ] Schedule training sessions (if required)
- [ ] Monitor customer feedback

---

## 5.3 Demo Environment Setup

### 5.3.1 Environment Preparation

**Step 1: Infrastructure Setup**
```bash
# Configure demo database
export DEMO_DATABASE_URL="postgresql://demo_user:demo_pass@localhost:5432/securewatch_demo"

# Set demo domain
export DEMO_DOMAIN="demo.securewatch.com"
```

**Step 2: Demo Configuration**
- [ ] Verify demo database is isolated from production
- [ ] Configure auto-refresh schedules
- [ ] Set up demo user accounts
- [ ] Prepare demo presentation materials

### 5.3.2 Demo Deployment

**Step 1: Fresh Demo Setup**
```bash
# Deploy new demo environment
./scripts/demo-server.sh --environment demo

# Verify demo data generation
# Test all demo user accounts
```

**Step 2: Demo Data Reset (if required)**
```bash
# Reset existing demo data
./scripts/demo-server.sh --reset

# Confirm data reset and regeneration
```

### 5.3.3 Demo Maintenance

**Step 1: Regular Refresh**
```bash
# Schedule daily refresh (cron job)
0 2 * * * /path/to/scripts/refresh-demo-data.sh

# Monitor refresh operations
# Verify data quality
```

**Step 2: Demo Monitoring**
- [ ] Monitor demo environment performance
- [ ] Track demo usage analytics
- [ ] Maintain demo user accounts
- [ ] Update demo content regularly

---

## 6. Post-Deployment Verification

### 6.1 Technical Verification

#### 6.1.1 Database Verification
```sql
-- Verify schema version
SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;

-- Check data integrity
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM training_programs;
SELECT COUNT(*) FROM violations;

-- Verify foreign key constraints
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f';
```

#### 6.1.2 Application Verification
- [ ] Admin login functionality
- [ ] Employee management features
- [ ] Training program assignment
- [ ] Violation tracking
- [ ] Reporting capabilities
- [ ] Email notifications

### 6.2 Performance Verification

#### 6.2.1 Response Time Testing
```bash
# Test critical endpoints
curl -w "@curl-format.txt" -o /dev/null -s "https://[customer-domain]/api/employees"
curl -w "@curl-format.txt" -o /dev/null -s "https://[customer-domain]/api/training/programs"
```

#### 6.2.2 Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor connection usage
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;
```

### 6.3 Security Verification

#### 6.3.1 Access Control Testing
- [ ] Verify admin-only functions are protected
- [ ] Test user role restrictions
- [ ] Confirm data isolation between customers
- [ ] Validate password policies

#### 6.3.2 Vulnerability Assessment
- [ ] Run security scanner on endpoints
- [ ] Verify SSL certificate validity
- [ ] Check for exposed sensitive data
- [ ] Validate input sanitization

---

## 7. Rollback Procedures

### 7.1 Application Rollback

#### 7.1.1 Render Deployment Rollback
```bash
# List recent deployments
render deployments list --service=[service-id]

# Rollback to previous deployment
render rollback --service=[service-id] --deployment=[previous-deployment-id]
```

#### 7.1.2 Git-based Rollback
```bash
# Identify commit to rollback to
git log --oneline -10

# Create rollback commit
git revert [commit-hash]
git push origin main

# Trigger new deployment
```

### 7.2 Database Rollback

#### 7.2.1 Automated Rollback
```bash
# Use update script rollback feature
./scripts/update-customer.sh --rollback [previous-version] --customer [customer-name]

# Verify rollback success
```

#### 7.2.2 Manual Database Rollback
```bash
# Identify backup file
ls -la backups/[customer-name]_*.sql

# Restore from backup
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < backups/[customer-name]_[timestamp].sql

# Verify restoration
```

### 7.3 Rollback Verification

#### 7.3.1 Data Integrity Check
```sql
-- Verify critical tables
SELECT 'employees' as table_name, COUNT(*) FROM employees
UNION ALL
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'training_programs' as table_name, COUNT(*) FROM training_programs;

-- Check for missing constraints
SELECT conname FROM pg_constraint WHERE NOT convalidated;
```

#### 7.3.2 Application Functionality
- [ ] Test admin login
- [ ] Verify critical features
- [ ] Check data consistency
- [ ] Confirm customer access

---

## 8. Troubleshooting

### 8.1 Common Issues and Solutions

#### 8.1.1 Database Connection Failures

**Issue:** Cannot connect to database
```
Error: psql: could not connect to server
```

**Solution:**
```bash
# Verify database URL format
echo $DATABASE_URL
# Expected: postgresql://user:pass@host:port/database

# Test network connectivity
ping [database-host]

# Check database server status
psql $DATABASE_URL -c "SELECT version();"
```

#### 8.1.2 Render Deployment Failures

**Issue:** Render service deployment fails
```
Error: Build failed or service not responding
```

**Solution:**
```bash
# Check Render service logs
render logs --service=[service-id] --tail

# Verify environment variables
render env list --service=[service-id]

# Check build configuration
cat render.yaml
```

#### 8.1.3 Migration Failures

**Issue:** Database migration script fails
```
Error: relation "table_name" does not exist
```

**Solution:**
```bash
# Check current schema version
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"

# Review migration dependencies
ls -la migrations/[version]/

# Apply missing prerequisites
psql $DATABASE_URL < migrations/[prerequisite-version]/001_prerequisite.sql
```

### 8.2 Emergency Procedures

#### 8.2.1 Production Outage Response

**Immediate Actions:**
1. Assess impact scope (single customer vs. multiple)
2. Check Render service status
3. Verify database connectivity
4. Review recent deployments
5. Initiate communication with affected customers

**Resolution Steps:**
```bash
# Quick health check
curl -I https://[customer-domain]/health

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Review application logs
render logs --service=[service-id] --tail=100
```

#### 8.2.2 Data Corruption Response

**Immediate Actions:**
1. Stop all write operations
2. Identify corruption scope
3. Locate most recent clean backup
4. Assess data recovery options
5. Communicate with customer

**Recovery Steps:**
```bash
# Create emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from clean backup
./scripts/update-customer.sh --rollback [clean-version] --customer [customer-name]

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM employees WHERE created_at > '[corruption-date]';"
```

### 8.3 Contact Information

| Escalation Level | Contact | Response Time |
|------------------|---------|---------------|
| **Level 1** | Deployment Engineer | 15 minutes |
| **Level 2** | Technical Lead | 30 minutes |
| **Level 3** | CTO | 1 hour |
| **Emergency** | On-call Engineer | 5 minutes |

---

## 9. Appendices

### Appendix A: Configuration Templates

#### A.1 Customer Configuration Template
```json
{
  "customer": {
    "name": "Customer Name",
    "slug": "customer-slug",
    "industry": "technology|healthcare|finance|retail|education",
    "size": "startup|midsize|enterprise",
    "domain": "customer.com"
  },
  "database": {
    "host": "customer-db.render.com",
    "name": "securewatch_customer",
    "user": "customer_user",
    "password": "secure_password",
    "port": 5432
  },
  "admin": {
    "email": "admin@customer.com",
    "name": "Administrator Name",
    "password": "auto_generated_or_provided"
  },
  "seeding": {
    "include_sample_data": true,
    "sample_employee_count": 100,
    "include_sample_violations": true
  },
  "compliance": {
    "required_frameworks": ["SOC2", "ISO27001"],
    "industry_specific": true
  }
}
```

#### A.2 Migration Script Template
```sql
-- migrations/v2.1.0/001_description.sql
-- Migration: [Description of changes]
-- Author: [Author name]
-- Date: [YYYY-MM-DD]

BEGIN;

-- Schema changes
ALTER TABLE employees ADD COLUMN new_field VARCHAR(255);

-- Data migrations
UPDATE employees SET new_field = 'default_value' WHERE new_field IS NULL;

-- Index updates
CREATE INDEX CONCURRENTLY idx_employees_new_field ON employees(new_field);

-- Record migration
INSERT INTO schema_migrations (version, description) 
VALUES ('v2.1.0', 'Added new_field to employees table');

COMMIT;
```

### Appendix B: Monitoring and Alerts

#### B.1 Key Metrics to Monitor
- Database connection count
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint
- Memory and CPU utilization
- Disk space usage

#### B.2 Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Response Time | > 2 seconds | > 5 seconds |
| Error Rate | > 1% | > 5% |
| Database Connections | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |

### Appendix C: Security Checklist

#### C.1 Pre-Deployment Security Review
- [ ] Customer configuration reviewed for sensitive data
- [ ] Database credentials are unique and complex
- [ ] API keys have appropriate permissions
- [ ] Backup encryption is enabled
- [ ] Access logs are configured

#### C.2 Post-Deployment Security Verification
- [ ] Admin account follows password policy
- [ ] User permissions are correctly assigned
- [ ] Data encryption is active
- [ ] Security headers are present
- [ ] Vulnerability scan completed

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Technical Lead** | [Name] | [Signature] | [Date] |
| **Security Officer** | [Name] | [Signature] | [Date] |
| **Operations Manager** | [Name] | [Signature] | [Date] |

---

**Document Classification:** Internal Use  
**Next Review Date:** June 2024  
**Document Location:** `/docs/DEPLOYMENT-PROCEDURE.md`  

*This document contains proprietary information. Distribution is restricted to authorized personnel only.* 