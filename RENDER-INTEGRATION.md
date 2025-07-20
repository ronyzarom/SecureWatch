# 🌐 SecureWatch Render Integration

**Integration Version:** 1.0  
**Last Updated:** March 2024  
**Deployment Platform:** Render  

---

## 🎯 Overview

SecureWatch's tag-based minor release system integrates seamlessly with **Render** for enterprise-grade cloud deployments. This integration provides automated deployment coordination, customer-specific service management, and comprehensive rollback capabilities.

### **Integration Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    SECUREWATCH + RENDER                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏷️ Tag-Based Deployment     🌐 Render Services              │
│  ├── Version tags (v1.1.0)   ├── Customer-specific services│
│  ├── Policy enforcement      ├── Auto-deploy configuration │
│  ├── Phased rollouts         ├── Environment variables     │
│  └── Health monitoring       └── Custom domains            │
│                                                             │
│  📋 Integration Layer                                       │
│  ├── render-deploy.sh: Render API automation              │
│  ├── minor-release-manager.sh: Coordinated rollouts       │
│  ├── Customer service mapping                              │
│  └── Health monitoring and rollback automation            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Render Service Architecture

### **Customer Service Structure**
Each customer has dedicated Render services:

```
Customer: ACME Corporation (acme-corp)
├── Backend Service: srv-acme-backend-abc123
│   ├── Type: Web Service (Node.js)
│   ├── Domain: acme-api.securewatch.app
│   ├── Database: PostgreSQL (dedicated)
│   └── Auto-deploy: Disabled (manual tag-based)
├── Frontend Service: srv-acme-frontend-def456
│   ├── Type: Static Site (React/Vite)
│   ├── Domain: acme.securewatch.app
│   ├── CDN: Enabled
│   └── Auto-deploy: Disabled (manual tag-based)
└── Database: Dedicated PostgreSQL instance
```

### **Service Naming Convention**
```
Backend:  securewatch-{customer-slug}-backend
Frontend: securewatch-{customer-slug}-frontend
Database: securewatch-{customer-slug}-db

Examples:
- srv-acme-backend-abc123
- srv-acme-frontend-def456
- srv-techstart-backend-ghi789
```

---

## 🔧 Configuration Setup

### **1. Render Configuration File**
Location: `config/render-deployment.json`

Key components:
- Customer service mapping
- Environment variable templates
- Deployment phase configurations
- Health monitoring settings
- Rollback procedures

### **2. Environment Variables Setup**

#### **Backend Service Environment Variables**
```bash
NODE_ENV=production
VERSION_TAG=v1.1.0                    # Updated per deployment
CUSTOMER_SLUG=acme-corp               # Customer identifier
DATABASE_URL=${CUSTOMER_DATABASE_URL} # Customer-specific DB
JWT_SECRET=${CUSTOMER_JWT_SECRET}     # Customer-specific secret
RENDER_SERVICE_ID=${RENDER_SERVICE_ID} # Service identifier
```

#### **Frontend Service Environment Variables**
```bash
VITE_API_URL=https://acme-api.securewatch.app
VITE_VERSION_TAG=v1.1.0               # Updated per deployment
VITE_CUSTOMER_SLUG=acme-corp          # Customer identifier
VITE_ENVIRONMENT=production
```

### **3. Render API Authentication**
```bash
# Set API key as environment variable
export RENDER_API_KEY="your_render_api_key_here"

# Or pass as command line argument
./scripts/render-deploy.sh --api-key "your_render_api_key_here"
```

---

## 🚀 Deployment Workflow

### **How Minor Releases Work with Render**

#### **Phase 1: Demo Environment**
```bash
# Automatic deployment to demo services
# Uses main branch or latest tags
# Immediate rollout for sales demos
```

#### **Phase 2: Startup Customers**
```bash
# Manual tag-based deployment
# 50% customer batches with 2-hour delays
# Automated health monitoring
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer techstart
```

#### **Phase 3: Standard Customers** 
```bash
# Phased deployment across 25% batches
# 6-hour delays between batches
# Comprehensive health checks
./scripts/minor-release-manager.sh deploy-customers --version v1.1.0 --customers standard
```

#### **Phase 4: Enterprise Customers**
```bash
# Individual customer deployments
# Manual approval required
# Scheduled maintenance windows
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer financefirst
```

---

## 🛠️ Command Reference

### **Render-Specific Commands**

#### **Customer Deployment**
```bash
# Deploy specific version to customer
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer acme-corp

# Deploy only backend service
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer acme-corp --service-type backend

# Deploy with dry-run to see what would happen
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer acme-corp --dry-run
```

#### **Health Monitoring**
```bash
# Check customer service health
./scripts/render-deploy.sh check-health --customer acme-corp

# List recent deployments
./scripts/render-deploy.sh list-deployments --customer acme-corp
```

#### **Rollback Operations**
```bash
# Rollback customer to previous deployment
./scripts/render-deploy.sh rollback-customer --customer acme-corp

# Emergency rollback with force flag
./scripts/render-deploy.sh rollback-customer --customer acme-corp --force
```

#### **Environment Management**
```bash
# Update environment variables for new version
./scripts/render-deploy.sh update-env-vars --version v1.1.0 --customer acme-corp
```

### **Integrated Minor Release Commands**

#### **Coordinated Rollouts**
```bash
# Deploy to all startup customers using Render
./scripts/minor-release-manager.sh deploy-customers --version v1.1.0 --customers startup

# This automatically:
# 1. Determines customer service IDs
# 2. Updates environment variables
# 3. Triggers Render deployments
# 4. Monitors health checks
# 5. Updates release tracking
```

---

## 📊 Deployment Process Details

### **1. Pre-Deployment**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 PRE-DEPLOYMENT CHECKS                                   │
├─────────────────────────────────────────────────────────────┤
│  ├── Validate version tag exists                           │
│  ├── Check customer service IDs                            │
│  ├── Verify Render API authentication                      │
│  ├── Confirm deployment policy compliance                  │
│  └── Backup current environment variables                  │
└─────────────────────────────────────────────────────────────┘
```

### **2. Deployment Execution**
```
┌─────────────────────────────────────────────────────────────┐
│  🚀 DEPLOYMENT EXECUTION                                    │
├─────────────────────────────────────────────────────────────┤
│  1. Update environment variables (VERSION_TAG, etc.)       │
│  2. Create Render deployment with specific Git commit      │
│  3. Monitor deployment status (build → deploy → live)      │
│  4. Wait for deployment completion (10-minute timeout)     │
│  5. Perform health checks on deployed services             │
│  6. Update release tracking and customer status            │
└─────────────────────────────────────────────────────────────┘
```

### **3. Post-Deployment**
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ POST-DEPLOYMENT VALIDATION                              │
├─────────────────────────────────────────────────────────────┤
│  ├── Service health verification (/api/health)             │
│  ├── Version confirmation (/api/version)                   │
│  ├── Database connectivity check                           │
│  ├── Performance baseline validation                       │
│  └── Customer notification (if configured)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Rollback Procedures

### **Automatic Rollback Triggers**
- Health check failures (3 consecutive failures)
- Response time > 5000ms
- Error rate > 5%
- Customer-initiated rollback request

### **Rollback Methods**

#### **1. Render API Rollback**
```bash
# Quick rollback to previous Render deployment
./scripts/render-deploy.sh rollback-customer --customer acme-corp
```

#### **2. Database Rollback** 
```bash
# Restore database from backup if needed
./scripts/update-customer.sh --rollback v1.0.0 --customer acme-corp
```

#### **3. Full Service Restoration**
```bash
# Complete restoration including environment variables
./scripts/render-deploy.sh deploy-customer --version v1.0.0 --customer acme-corp --force
```

---

## 🛡️ Security and Best Practices

### **API Key Management**
```bash
# Store API key securely as environment variable
export RENDER_API_KEY="your_secure_api_key"

# Use secrets management for production
# Never commit API keys to version control
```

### **Service Isolation**
- Each customer has dedicated services
- Separate databases per customer
- Customer-specific environment variables
- Domain isolation (customer.securewatch.app)

### **Deployment Safety**
- Manual deployment triggers (no auto-deploy from main)
- Comprehensive health checks
- Automated rollback on failures
- Deployment logging and audit trails

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Deployment Timeouts**
```bash
# Check Render service logs
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-xyz/deploys"

# Increase timeout if needed
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer acme-corp
```

#### **2. Health Check Failures**
```bash
# Manual health check
curl https://acme-api.securewatch.app/api/health

# Check service status
./scripts/render-deploy.sh check-health --customer acme-corp
```

#### **3. Environment Variable Issues**
```bash
# Update specific environment variables
./scripts/render-deploy.sh update-env-vars --version v1.1.0 --customer acme-corp

# Check current environment variables
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-xyz/env-vars"
```

#### **4. Service ID Not Found**
```bash
# Check customer configuration
jq '.customer_environment_mapping["acme-corp"]' config/render-deployment.json

# List available customers
jq '.customer_environment_mapping | keys[]' config/render-deployment.json
```

---

## 📈 Monitoring and Metrics

### **Deployment Metrics**
- Deployment success rate per phase
- Average deployment time
- Health check pass rate
- Rollback frequency

### **Service Metrics** 
- Response time monitoring
- Error rate tracking
- Availability monitoring
- Performance baselines

### **Customer Metrics**
- Customer satisfaction during rollouts
- Support ticket volume during deployments
- Feature adoption rates post-deployment

---

## 🎯 Real-World Example: v1.1.0 Rollout

### **Day 0: Demo Phase**
```bash
# Automatic deployment to demo environment
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer demo
```

### **Day 1-7: Startup Phase**
```bash
# Deploy to TechStart Inc (startup policy)
./scripts/minor-release-manager.sh deploy-customers --version v1.1.0 --customers startup
```

### **Day 8-21: Standard Phase**
```bash
# Deploy to ACME Corporation (standard policy)
./scripts/minor-release-manager.sh deploy-customers --version v1.1.0 --customers standard
```

### **Day 22-51: Enterprise Phase**
```bash
# Individual deployments for enterprise customers
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer financefirst
./scripts/render-deploy.sh deploy-customer --version v1.1.0 --customer medhealth
```

---

## 🔗 Integration Benefits

### **🏢 For Enterprise Customers**
- ✅ Predictable deployment schedules
- ✅ Manual approval processes
- ✅ Zero-downtime deployments
- ✅ Comprehensive rollback capabilities
- ✅ Dedicated service isolation

### **🚀 For Development Teams**
- ✅ Automated deployment coordination
- ✅ Comprehensive health monitoring
- ✅ Easy rollback procedures
- ✅ Customer-specific configuration management
- ✅ Audit trails and deployment tracking

### **🎯 For Operations**
- ✅ Centralized deployment management
- ✅ Policy-based deployment controls
- ✅ Automated health monitoring
- ✅ Detailed deployment logging
- ✅ Emergency response procedures

---

## 📞 Support and Resources

### **Documentation**
- **Minor Release Workflow**: `MINOR-RELEASE-WORKFLOW.md`
- **Tag-Based Deployment**: `TAG-BASED-DEPLOYMENT.md`
- **Deployment Procedures**: `DEPLOYMENT-PROCEDURE.md`

### **Configuration Files**
- **Render Config**: `config/render-deployment.json`
- **Customer Config**: `config/customers.json`
- **Minor Release Policies**: `config/minor-release-policies.json`

### **Scripts**
- **Render Integration**: `scripts/render-deploy.sh`
- **Minor Release Manager**: `scripts/minor-release-manager.sh`
- **Tag-Based Deploy**: `scripts/tag-based-deploy.sh`

---

**The Render integration is now fully operational and ready for production minor releases!** 🌐✨

This system provides enterprise-grade deployment management with customer-specific policies, automated health monitoring, and comprehensive rollback capabilities, all seamlessly integrated with Render's cloud platform. 