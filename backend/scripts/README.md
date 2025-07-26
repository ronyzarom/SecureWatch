# SecureWatch Backend Scripts

This directory contains utility scripts for managing the SecureWatch backend system.

## Available Scripts

### 🧹 `cleanup-all-connectors.js` - Complete Connector Data Cleanup

**Purpose**: Removes ALL synced data and violations from ALL connectors for fresh testing.

**What it cleans**:
- **Google Workspace**: Users (@zaromh.com), Gmail messages, sync jobs, config timestamps
- **Microsoft Teams**: Messages, sync jobs, config timestamps  
- **Slack**: Messages, sync jobs, config timestamps
- **Office 365**: Email communications, sync jobs, config timestamps
- **All Violations**: From any connector analysis
- **Email Communications**: From all connector sources

**Usage**:
```bash
# From backend directory
node scripts/cleanup-all-connectors.js           # Clean connector data only
node scripts/cleanup-all-connectors.js --nuclear # Clean EVERYTHING (nuclear mode)

# Or make it executable and run directly
chmod +x scripts/cleanup-all-connectors.js
./scripts/cleanup-all-connectors.js
./scripts/cleanup-all-connectors.js --nuclear
```

**When to use**:
- ✅ **Normal mode**: Before testing any connector sync from scratch
- ✅ **Normal mode**: When dashboard shows stale data from previous tests
- ✅ **Normal mode**: When sync timestamps are preventing fresh syncs
- ✅ **Nuclear mode** (`--nuclear`): When you want to completely reset the system
- ✅ **Nuclear mode**: When you want to remove ALL employees and violations
- ✅ **Nuclear mode**: For completely fresh testing with empty database

**What it preserves**:
- ✅ **Normal mode**: Core employees (non-Google Workspace users)
- ✅ **Normal mode**: Non-connector related violations
- ✅ **Both modes**: System configurations
- ✅ **Both modes**: User accounts and auth settings
- ✅ **Both modes**: Connector connection settings (keeps credentials)
- ⚠️ **Nuclear mode**: Removes ALL employees and violations (complete reset)

**Output**: Detailed logging showing exactly what was cleaned and current state verification.

---

### 🧪 Other Scripts

#### `test-api.js`
Tests various API endpoints for functionality.

#### `test-policies-api.js` 
Tests policy-related API endpoints.

#### `apply-integrations-schema.js`
Applies integration database schema changes.

#### `apply-policies-schema.js`
Applies policy database schema changes.

#### `migrate-policies.js`
Migrates policy data between schema versions.

#### `cleanup-test-data.js` / `cleanup-test-data-enhanced.js`
Legacy cleanup scripts (use `cleanup-all-connectors.js` instead).

---

## Usage Examples

### Fresh Connector Testing Workflow

1. **Clean everything**:
   ```bash
   node scripts/cleanup-all-connectors.js
   ```

2. **Test specific connector**:
   - Go to SecureWatch → Settings → Integrations
   - Configure and sync your connector (Teams, Google Workspace, etc.)
   - Check dashboard for fresh metrics

3. **Repeat testing**:
   - Run cleanup script again
   - Test different scenarios

### Before Production Deployment

1. **Clean test data**:
   ```bash
   node scripts/cleanup-all-connectors.js
   ```

2. **Verify clean state**:
   - Check dashboard shows 0 for connector metrics
   - Verify no test users in employees table
   - Confirm all sync timestamps are reset

---

## Safety Notes

⚠️ **Warning**: The cleanup script removes ALL connector data. Only use in development/testing environments.

✅ **Safe**: The script preserves core system data, user accounts, and connection configurations. 