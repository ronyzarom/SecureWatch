# SecureWatch Client Database Setup

This guide describes how to create a new SecureWatch database for a client by duplicating the current production database and cleaning it up.

## Overview

The new approach duplicates the current production database, preserving all the schema, indexes, constraints, views, and reference data (training, policies, categories), while removing all customer-specific operational data to create a clean foundation for a new client.

## Prerequisites

- Node.js installed
- PostgreSQL client tools (`pg_dump`, `psql`)
- Access to the current SecureWatch database
- Target database credentials for the new client

## Quick Start

### 1. Create Client Configuration

Create a JSON configuration file for your client (e.g., `config/my-client.json`):

```json
{
  "clientName": "My Company Inc",
  "clientSlug": "my-company",
  "adminEmail": "admin@my-company.com",
  "adminName": "Company Administrator", 
  "adminPassword": "SecurePassword123!",
  "databaseUrl": "postgresql://user:password@host:port/my_company_db",
  "industry": "technology",
  "forceNewDb": false
}
```

### 2. Run Database Duplication

```bash
# Create new database
./duplicate-client-db.sh --config config/my-client.json

# Or force recreate if database exists
./duplicate-client-db.sh --config config/my-client.json --force-new-db
```

### 3. Review Results

Check the generated summary file:
```bash
cat backend/client-[slug]-database-summary.txt
```

## What the Script Does

### 1. Database Duplication
- Connects to the current SecureWatch database as source
- Creates a new target database for the client
- Copies the complete schema (tables, indexes, constraints, views, functions)
- Excludes legacy tables (those ending with `_legacy`)

### 2. Reference Data Preservation
Copies essential reference data:
- ✅ `compliance_regulations` - Regulatory frameworks
- ✅ `threat_categories` - Security threat categorization
- ✅ `training_categories` - Training course categories
- ✅ `training_content` - Training materials
- ✅ `training_programs` - Training programs
- ✅ `app_settings` - Default system settings

### 3. Data Cleanup
Removes all customer-specific operational data:
- 🗑️ `users` - User accounts
- 🗑️ `employees` - Employee records
- 🗑️ `violations` - Security violations
- 🗑️ `email_communications` - Email data
- 🗑️ `gmail_messages`, `teams_messages`, `slack_messages` - Integration data
- 🗑️ `notifications` - User notifications
- 🗑️ `sync_jobs` - Integration sync history
- 🗑️ `compliance_incidents` - Compliance incidents
- 🗑️ `training_assignments` - Training assignments
- 🗑️ `employee_metrics` - Analytics data
- 🗑️ `integration_configs` - Connector configurations
- 🗑️ `google_drive_files` - Google Drive sync data
- 🗑️ `platform_entities` - Platform-specific entities
- 🗑️ `ai_training_generation_log` - AI training logs
- 🗑️ `policy_actions`, `policy_executions` - Policy execution history
- 🗑️ `mfa_audit_log` - MFA authentication logs
- 🗑️ And 25+ more operational tables...

### 4. Fresh Start Setup
- Creates new admin user with specified credentials
- Creates corresponding employee record for the admin
- Resets all sequence counters to start from 1
- Configures integration settings as disabled/default
- Generates comprehensive summary report

## Benefits

✅ **Complete Schema**: Identical to production with all 62+ tables
✅ **All Features**: Full SecureWatch functionality available immediately
✅ **Reference Data**: Pre-populated training, policies, and categories
✅ **Clean Slate**: No customer-specific data from previous clients
✅ **Production Ready**: Same structure as main database
✅ **Fast Setup**: Minutes instead of hours compared to schema building

## Configuration Options

| Field | Description | Required |
|-------|-------------|----------|
| `clientName` | Human-readable client name | ✅ |
| `clientSlug` | URL-safe identifier (auto-generated if not provided) | ❌ |
| `adminEmail` | Admin user email address | ✅ |
| `adminName` | Admin user display name | ✅ |
| `adminPassword` | Admin user password | ✅ |
| `databaseUrl` | PostgreSQL connection string for target database | ✅ |
| `industry` | Client industry (for compliance customization) | ✅ |
| `forceNewDb` | Drop existing database if it exists | ❌ |

## Example Workflows

### Local Testing Database
```bash
./duplicate-client-db.sh --config config/test-local-client.json --force-new-db
```

### Production Client Database
```bash
./duplicate-client-db.sh --config config/production-client.json
```

### Quick Development Setup
```bash
./duplicate-client-db.sh --config config/dev-client.json --force-new-db
```

## Comparison with Previous Approach

| Aspect | Old (Schema Building) | New (Database Duplication) |
|--------|----------------------|----------------------------|
| Tables Created | 6 basic tables | 62 complete tables |
| Schema Accuracy | Custom/simplified | Identical to production |
| Setup Time | Complex, error-prone | Simple, reliable |
| Reference Data | Manual insertion | Automatically preserved |
| Feature Completeness | Limited | Full SecureWatch features |
| Maintenance | High (schema drift) | Low (always current) |

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify database credentials in config file
- Ensure target database server is accessible
- Check that PostgreSQL client tools are installed

**Permission Denied**
- Ensure user has CREATE DATABASE permissions
- For cloud databases, verify connection parameters
- Check firewall/security group settings

**Foreign Key Constraint Errors**
- These are warnings for reference data that has user dependencies
- The script continues and creates essential data successfully
- These can be safely ignored during initial setup

### Logs and Debugging

The script provides detailed output showing:
- Connection establishment
- Table copying progress  
- Data cleanup results
- User creation status
- Final summary generation

## Security Considerations

- 🔒 Admin passwords are hashed with bcrypt
- 🔒 All customer data is completely removed
- 🔒 Integration settings are reset to disabled
- 🔒 No sensitive data is copied between clients
- 🔒 Sequence counters are reset to prevent ID conflicts

## Next Steps After Setup

1. **Test Admin Login**: Verify credentials work
2. **Change Password**: Update default admin password  
3. **Configure Integrations**: Set up Office 365, Google Workspace, etc.
4. **Import Employees**: Add company employee data
5. **Customize Policies**: Review and adjust for client industry
6. **Set Compliance Profiles**: Configure regulatory requirements

## Files Created

- `client-[slug]-database-summary.txt` - Comprehensive setup summary
- New PostgreSQL database with complete SecureWatch schema
- Admin user account ready for first login

## Support

For issues or questions about client database setup, refer to:
- Generated summary file for client-specific details
- Script output logs for debugging information
- This documentation for process overview 