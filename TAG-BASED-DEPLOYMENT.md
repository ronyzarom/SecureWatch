# 🏷️ SecureWatch Tag-Based Production Deployment

**Deployment Strategy:** Tag-Based Production  
**Implementation Date:** March 2024  
**Version:** v1.0.0+  

---

## 🎯 Overview

SecureWatch now uses a **Tag-Based Production Deployment** strategy that provides enterprise-grade stability while enabling controlled feature rollouts. This system separates development (main branch) from production deployments (tagged versions).

### **Core Principles**

- ✅ **Production customers**: Deploy from stable tags only
- ✅ **Version control**: Customer-specific version tracking
- ✅ **Policy-based**: Different policies for different customer needs
- ✅ **Safe rollbacks**: Easy reversion to previous versions
- ✅ **Demo flexibility**: Main branch for latest features

---

## 🛡️ Deployment Policies

### **Enterprise Policy**
```json
{
  "description": "Maximum stability, manual updates only",
  "deployment_source": "stable_tags_only",
  "auto_update": false,
  "supported_versions": ["v1.0.0"],
  "rollback_window": "24_hours",
  "suitable_for": "Large enterprises, healthcare, finance"
}
```

### **Standard Policy**
```json
{
  "description": "Balanced stability and features",
  "deployment_source": "stable_tags_only", 
  "auto_update": true,
  "supported_versions": ["v1.0.0", "v1.1.0"],
  "rollback_window": "12_hours",
  "suitable_for": "Mid-size companies, standard business"
}
```

### **Startup Policy**
```json
{
  "description": "Latest features, faster updates",
  "deployment_source": "latest_stable_tag",
  "auto_update": true,
  "supported_versions": ["v1.0.0", "v1.1.0", "latest"],
  "rollback_window": "6_hours",
  "suitable_for": "Startups, tech companies"
}
```

### **Demo Policy**
```json
{
  "description": "Demo and trial environments",
  "deployment_source": "main_branch",
  "auto_update": true,
  "supported_versions": ["main", "latest", "v1.0.0"],
  "rollback_window": "2_hours",
  "suitable_for": "Sales demos, trials, development"
}
```

---

## 📋 Current Customer Assignments

| Customer | Policy | Current Version | Target Version | Auto Update |
|----------|--------|-----------------|----------------|-------------|
| **ACME Corporation** | Standard | v1.0.0 | v1.0.0 | ✅ |
| **TechStart Inc** | Startup | v1.0.0 | latest_stable | ✅ |
| **MedHealth Systems** | Enterprise | v0.9.0 | v1.0.0 | ❌ |
| **FinanceFirst Bank** | Enterprise | v1.0.0 | v1.0.0 | ❌ |

---

## 🛠️ Command Reference

### **Version Management**

```bash
# List all available versions
./scripts/tag-based-deploy.sh list-versions

# Check customer deployment policy
./scripts/tag-based-deploy.sh check-policy --customer "ACME Corporation"

# Validate version for policy
./scripts/tag-based-deploy.sh validate --version v1.1.0 --policy enterprise
```

### **New Customer Deployment**

```bash
# Deploy new customer with specific version
./scripts/new-customer.sh --config config/customer.json --version v1.0.0

# Deploy with policy-based version selection
./scripts/new-customer.sh --config config/customer.json --source stable_tags_only

# Deploy demo environment with latest features
./scripts/new-customer.sh --config config/demo.json --environment demo --source main_branch
```

### **Customer Updates**

```bash
# Update customer to specific version
./scripts/update-customer.sh --version v1.1.0 --customer acme-corp

# Update respecting customer policy
./scripts/tag-based-deploy.sh deploy --customer "ACME Corporation" --version v1.0.0

# Rollback customer
./scripts/update-customer.sh --rollback v1.0.0 --customer customer-name
```

### **Version Creation**

```bash
# Create new version tag
./scripts/tag-based-deploy.sh create-tag --version v1.1.0

# Push new tag
git push origin v1.1.0
```

---

## 🚀 Deployment Workflows

### **New Release Process**

```
1. DEVELOPMENT
   ├── Feature development on main branch
   ├── Internal testing and QA
   └── Staging deployment from main

2. VERSION CREATION
   ├── Create version tag (v1.1.0)
   ├── Deploy to staging from tag
   ├── Final validation and testing
   └── Push tag to repository

3. CUSTOMER ROLLOUT
   ├── Update startup customers first
   ├── Update standard customers
   ├── Update enterprise customers (manual)
   └── Monitor and verify deployments

4. POST-RELEASE
   ├── Update customer registry
   ├── Monitor customer health
   ├── Customer notifications
   └── Documentation updates
```

### **Emergency Rollback**

```bash
# Immediate application rollback (Render)
render rollback --service=backend-service --deployment=previous-id

# Database rollback with script
./scripts/update-customer.sh --rollback v1.0.0 --customer customer-name

# Manual database restore
psql $DATABASE_URL < backups/customer_20240315_143022.sql
```

---

## 📊 Version Lifecycle

### **v1.0.0 (Current Stable)**
- **Status**: Stable production release
- **Support**: Full support (security + features)
- **Customers**: All production customers
- **Lifecycle**: Long-term support

### **v1.1.0 (Planned)**
- **Status**: In development
- **Target Date**: April 2024
- **Features**: Enhanced analytics, new reporting
- **Migration Path**: v1.0.0 → v1.1.0

### **main (Development)**
- **Status**: Continuous development
- **Support**: Experimental
- **Usage**: Demo environments only
- **Stability**: Not guaranteed

---

## 🔧 Configuration Examples

### **Customer Configuration**
```json
{
  "customer": {
    "name": "ACME Corporation",
    "industry": "technology",
    "size": "midsize"
  },
  "deployment": {
    "policy": "standard",
    "source": "stable_tags_only",
    "target_version": "v1.0.0",
    "auto_update": true
  }
}
```

### **Policy Validation**
```bash
# Check if version is allowed for customer
if ./scripts/tag-based-deploy.sh validate --version v1.1.0 --policy enterprise; then
  echo "Version approved for deployment"
else
  echo "Version not allowed for this policy"
fi
```

---

## 📈 Benefits

### **Production Stability**
- ✅ Customers protected from breaking changes
- ✅ Tested, stable versions only
- ✅ Controlled rollout process
- ✅ Easy rollback capability

### **Development Flexibility**
- ✅ Main branch for active development
- ✅ Demo environments with latest features
- ✅ Feature branches for experimentation
- ✅ Continuous integration workflow

### **Enterprise Compliance**
- ✅ Version tracking and audit trails
- ✅ Policy-based deployment controls
- ✅ Maintenance window scheduling
- ✅ Change management processes

### **Customer Satisfaction**
- ✅ Predictable update schedules
- ✅ Customer-specific versioning
- ✅ Zero-downtime deployments
- ✅ Rapid issue resolution

---

## 🎯 Migration from Main Branch

If you were previously deploying from main branch:

1. **Identify Customer Policies**
   ```bash
   # Check current customer configurations
   ./scripts/tag-based-deploy.sh check-policy --customer "customer-name"
   ```

2. **Deploy Current Stable Version**
   ```bash
   # Move customers to tagged version
   ./scripts/update-customer.sh --version v1.0.0 --customer customer-name
   ```

3. **Update Deployment Processes**
   ```bash
   # Use tag-based deployment for new customers
   ./scripts/new-customer.sh --config config.json --version v1.0.0
   ```

4. **Reserve Main Branch for Development**
   - Main branch: Development and staging only
   - Demo environments: Can use main branch
   - Production: Tagged versions only

---

## 📞 Support

- **Documentation**: See `DEPLOYMENT-PROCEDURE.md` for detailed procedures
- **Version Issues**: Use `./scripts/tag-based-deploy.sh validate`
- **Customer Questions**: Reference customer policy configurations
- **Emergency Support**: Follow rollback procedures in deployment docs

---

**Next Steps**: This tag-based system is now active. All new deployments should use tagged versions for production customers, with main branch reserved for development and demo environments. 