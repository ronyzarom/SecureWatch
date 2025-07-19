const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../src/utils/database');

/**
 * Initialize SecureWatch Compliance Framework Database Schema
 * This script applies the compliance framework schema to the existing database
 */
async function initializeComplianceFramework() {
  console.log('🔧 Initializing SecureWatch Compliance Framework...');
  console.log('==================================================');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionSuccess = await testConnection();
    
    if (!connectionSuccess) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }
    console.log('✅ Database connection successful');

    // Check if compliance framework is already installed
    console.log('🔍 Checking for existing compliance framework...');
    const existingCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'compliance_regulations'
    `);

    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Compliance framework already exists.');
      console.log('   To reinstall, drop compliance tables first or use --force flag');
      
      // Show current compliance status
      const regulationsCount = await pool.query('SELECT COUNT(*) FROM compliance_regulations');
      const policiesCount = await pool.query('SELECT COUNT(*) FROM internal_policies');
      const profilesCount = await pool.query('SELECT COUNT(*) FROM compliance_profiles');
      
      console.log('📊 Current compliance framework status:');
      console.log(`   - Regulations: ${regulationsCount.rows[0].count}`);
      console.log(`   - Internal Policies: ${policiesCount.rows[0].count}`);
      console.log(`   - Compliance Profiles: ${profilesCount.rows[0].count}`);
      
      return;
    }

    // Load and execute compliance schema
    console.log('📋 Loading compliance framework schema...');
    const schemaPath = path.join(__dirname, 'compliance-framework-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Compliance schema file not found:', schemaPath);
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✅ Schema loaded (${Math.round(schemaSQL.length / 1024)}KB)`);

    console.log('🏗️  Applying compliance framework schema...');
    console.log('   This may take a few moments...');
    
    // Execute the schema in a transaction
    await pool.query('BEGIN');
    
    try {
      await pool.query(schemaSQL);
      await pool.query('COMMIT');
      console.log('✅ Compliance framework schema applied successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    // Verify installation
    console.log('🔍 Verifying compliance framework installation...');
    
    const verificationQueries = [
      { name: 'Compliance Regulations', query: 'SELECT COUNT(*) FROM compliance_regulations' },
      { name: 'Internal Policies', query: 'SELECT COUNT(*) FROM internal_policies' },
      { name: 'Compliance Profiles', query: 'SELECT COUNT(*) FROM compliance_profiles' },
      { name: 'Compliance Incidents', query: 'SELECT COUNT(*) FROM compliance_incidents' },
      { name: 'Compliance Audit Log', query: 'SELECT COUNT(*) FROM compliance_audit_log' }
    ];

    for (const check of verificationQueries) {
      try {
        const result = await pool.query(check.query);
        console.log(`   ✅ ${check.name}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`   ❌ ${check.name}: Failed to verify`);
        throw error;
      }
    }

    // Check enhanced columns on existing tables
    console.log('🔍 Verifying enhanced existing tables...');
    
    const columnChecks = [
      { table: 'employees', column: 'compliance_profile_id' },
      { table: 'employees', column: 'regulatory_status' },
      { table: 'violations', column: 'compliance_category' },
      { table: 'violations', column: 'regulatory_impact' },
      { table: 'security_policies', column: 'compliance_mapping' }
    ];

    for (const check of columnChecks) {
      try {
        const result = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [check.table, check.column]);
        
        if (result.rows.length > 0) {
          console.log(`   ✅ ${check.table}.${check.column}: Added`);
        } else {
          console.log(`   ⚠️  ${check.table}.${check.column}: Not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${check.table}.${check.column}: Verification failed`);
      }
    }

    // Display summary
    console.log('');
    console.log('🎉 Compliance Framework Installation Complete!');
    console.log('==================================================');
    console.log('✅ Database schema enhanced with compliance framework');
    console.log('✅ Default regulations added (GDPR, SOX, HIPAA, PCI DSS)');
    console.log('✅ Default internal policy templates added');
    console.log('✅ Default compliance profiles created');
    console.log('✅ Audit trail system enabled');
    console.log('✅ Compliance views and indexes created');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Configure applicable regulations in admin settings');
    console.log('2. Customize internal policies for your organization');
    console.log('3. Assign compliance profiles to employees');
    console.log('4. Review compliance dashboard for status');
    console.log('');
    console.log('📚 Documentation:');
    console.log('- Compliance configuration: /settings/compliance');
    console.log('- Employee compliance status: /employees (enhanced view)');
    console.log('- Compliance incidents: /compliance/incidents');
    console.log('');

  } catch (error) {
    console.error('❌ Compliance framework initialization failed:', error.message);
    
    if (error.code) {
      console.error(`   Database Error Code: ${error.code}`);
    }
    
    if (error.position) {
      console.error(`   Error Position: ${error.position}`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.error('   Stack Trace:', error.stack);
    }
    
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Ensure database connection is working');
    console.log('2. Verify user has CREATE TABLE permissions');
    console.log('3. Check for conflicting table/column names');
    console.log('4. Review database logs for detailed error info');
    
    process.exit(1);
  }
}

/**
 * Remove compliance framework (for development/testing)
 */
async function removeComplianceFramework() {
  console.log('🗑️  Removing SecureWatch Compliance Framework...');
  console.log('⚠️  This will delete all compliance data!');
  
  try {
    await pool.query('BEGIN');
    
    // Drop tables in reverse dependency order
    const dropQueries = [
      'DROP VIEW IF EXISTS compliance_incidents_dashboard',
      'DROP VIEW IF EXISTS employee_compliance_status',
      'DROP TABLE IF EXISTS compliance_audit_log CASCADE',
      'DROP TABLE IF EXISTS compliance_incidents CASCADE',
      'DROP TABLE IF EXISTS compliance_profiles CASCADE',
      'DROP TABLE IF EXISTS internal_policies CASCADE',
      'DROP TABLE IF EXISTS compliance_regulations CASCADE',
      'DROP FUNCTION IF EXISTS log_compliance_change() CASCADE'
    ];
    
    for (const query of dropQueries) {
      await pool.query(query);
    }
    
    // Remove added columns from existing tables
    const columnDrops = [
      'ALTER TABLE employees DROP COLUMN IF EXISTS compliance_profile_id',
      'ALTER TABLE employees DROP COLUMN IF EXISTS compliance_notes',
      'ALTER TABLE employees DROP COLUMN IF EXISTS data_retention_until',
      'ALTER TABLE employees DROP COLUMN IF EXISTS regulatory_status',
      'ALTER TABLE employees DROP COLUMN IF EXISTS last_compliance_review',
      'ALTER TABLE employees DROP COLUMN IF EXISTS compliance_exceptions',
      'ALTER TABLE violations DROP COLUMN IF EXISTS compliance_category',
      'ALTER TABLE violations DROP COLUMN IF EXISTS regulatory_impact',
      'ALTER TABLE violations DROP COLUMN IF EXISTS policy_references',
      'ALTER TABLE violations DROP COLUMN IF EXISTS compliance_severity',
      'ALTER TABLE violations DROP COLUMN IF EXISTS requires_notification',
      'ALTER TABLE violations DROP COLUMN IF EXISTS notification_timeline_hours',
      'ALTER TABLE security_policies DROP COLUMN IF EXISTS compliance_mapping',
      'ALTER TABLE security_policies DROP COLUMN IF EXISTS regulatory_basis',
      'ALTER TABLE security_policies DROP COLUMN IF EXISTS internal_policy_basis'
    ];
    
    for (const query of columnDrops) {
      await pool.query(query);
    }
    
    await pool.query('COMMIT');
    console.log('✅ Compliance framework removed successfully');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Failed to remove compliance framework:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--remove') || args.includes('--uninstall')) {
    removeComplianceFramework().then(() => process.exit(0));
  } else {
    initializeComplianceFramework().then(() => process.exit(0));
  }
}

module.exports = {
  initializeComplianceFramework,
  removeComplianceFramework
}; 