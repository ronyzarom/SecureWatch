import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

class DatabaseDuplicator {
  constructor(configPath) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.clientSlug = this.config.clientSlug || this.config.clientName.toLowerCase().replace(/\s+/g, '-');
    this.sourceDbPool = null;
    this.targetDbPool = null;
  }

  async run() {
    try {
      console.log('🚀 SecureWatch Database Duplicator');
      console.log('=====================================\n');
      
      console.log(`📋 Client: ${this.config.clientName} (${this.clientSlug})`);
      console.log(`👤 Admin: ${this.config.adminEmail}`);
      console.log(`🏢 Industry: ${this.config.industry}\n`);

      // Parse database URLs
      await this.setupConnections();
      
      // Create target database
      await this.createTargetDatabase();
      
      // Copy schema and data
      await this.copyDatabase();
      
      // Clean up customer-specific data
      await this.cleanupCustomerData();
      
      // Create new admin user
      await this.createAdminUser();
      
      // Update settings
      await this.updateSettings();
      
      // Generate summary
      await this.generateSummary();
      
      console.log('\n🎉 Database duplication and cleanup completed successfully!\n');
      console.log('📋 Quick Start:');
      console.log(`   1. Login: ${this.config.adminEmail} / ${this.config.adminPassword}`);
      console.log('   2. Configure integrations');
      console.log('   3. Import employee data');
      console.log(`   4. Review summary: client-${this.clientSlug}-database-summary.txt\n`);

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    } finally {
      if (this.sourceDbPool) await this.sourceDbPool.end();
      if (this.targetDbPool) await this.targetDbPool.end();
    }
  }

  async setupConnections() {
    console.log('🔗 Setting up database connections...');
    
    // Parse source database (current securewatch db)
    const sourceDbUrl = process.env.DATABASE_URL || 'postgresql://ronyzaromil@localhost:5432/securewatch';
    
    // Parse target database info
    const targetDbUrl = new URL(this.config.databaseUrl);
    const targetDbName = targetDbUrl.pathname.substring(1);
    
    // Connect to source database
    this.sourceDbPool = new Pool({
      connectionString: sourceDbUrl,
      ssl: sourceDbUrl.includes('render.com') ? { rejectUnauthorized: false } : false
    });
    
    // For target database creation, connect to postgres database first
    const adminDbUrl = targetDbUrl.href.replace(`/${targetDbName}`, '/postgres');
    this.adminPool = new Pool({
      connectionString: adminDbUrl,
      ssl: targetDbUrl.href.includes('render.com') ? { rejectUnauthorized: false } : false
    });
    
    console.log('✅ Database connections established');
  }

  async createTargetDatabase() {
    console.log('🏗️  Creating target database...');
    
    const targetDbUrl = new URL(this.config.databaseUrl);
    const targetDbName = targetDbUrl.pathname.substring(1);
    
    try {
      // Check if database exists
      const dbCheckResult = await this.adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [targetDbName]
      );

      if (dbCheckResult.rows.length > 0) {
        if (this.config.forceNewDb) {
          console.log(`🔥 Force flag detected. Dropping database '${targetDbName}'...`);
          
          // Terminate existing connections
          await this.adminPool.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
          `, [targetDbName]);
          
          await this.adminPool.query(`DROP DATABASE IF EXISTS "${targetDbName}"`);
          console.log(`🗑️  Database '${targetDbName}' dropped`);
        } else {
          throw new Error(`Database '${targetDbName}' already exists. Use --force-new-db to overwrite.`);
        }
      }
      
      // Create new database
      await this.adminPool.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Database '${targetDbName}' created`);
      
      // Connect to the new target database
      this.targetDbPool = new Pool({
        connectionString: this.config.databaseUrl,
        ssl: this.config.databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : false
      });
      
    } catch (error) {
      console.error('❌ Error creating target database:', error.message);
      throw error;
    } finally {
      if (this.adminPool) {
        await this.adminPool.end();
        this.adminPool = null;
      }
    }
  }

  async copyDatabase() {
    console.log('📋 Copying database schema and data...');
    
    // Get all table names from source database (excluding legacy tables)
    const tablesResult = await this.sourceDbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE '%_legacy'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📊 Found ${tables.length} tables to copy`);
    
    // Copy schema first (create tables, indexes, etc.)
    console.log('📋 Copying schema...');
    const schemaDump = await this.executeCommand(`pg_dump "${this.sourceDbPool.options.connectionString}" --schema-only --no-owner --no-privileges --exclude-table="*_legacy"`);
    
    // Clean the schema dump to remove problematic statements
    const cleanedSchema = schemaDump
      .split('\n')
      .filter(line => 
        !line.startsWith('SET ') &&
        !line.startsWith('SELECT pg_catalog.set_config') &&
        !line.startsWith('--') &&
        line.trim() !== ''
      )
      .join('\n');
    
    // Apply schema to target database
    await this.targetDbPool.query(cleanedSchema);
    console.log('✅ Schema copied successfully');
    
    // Copy data for essential tables that contain configuration/reference data
    const essentialTables = [
      'compliance_regulations',
      'internal_policies', 
      'threat_categories',
      'training_categories',
      'training_content',
      'training_programs',
      'policy_category_rules',
      'compliance_profiles'
      // Note: app_settings excluded - we'll create clean settings instead
    ];
    
    console.log('📊 Copying essential reference data...');
    for (const tableName of essentialTables) {
      if (tables.includes(tableName)) {
        try {
          // Get data from source
          const dataResult = await this.sourceDbPool.query(`SELECT * FROM ${tableName}`);
          
          if (dataResult.rows.length > 0) {
            // Get column names
            const columns = Object.keys(dataResult.rows[0]);
            const columnList = columns.join(', ');
            const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Insert data to target
            for (const row of dataResult.rows) {
              const values = columns.map(col => row[col]);
              await this.targetDbPool.query(
                `INSERT INTO ${tableName} (${columnList}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING`,
                values
              );
            }
            
            console.log(`   ✅ Copied ${dataResult.rows.length} rows from ${tableName}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Table ${tableName} not found or error copying: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database copied successfully');
  }

  async cleanupCustomerData() {
    console.log('🧹 Cleaning up customer-specific data...');
    
    // Tables to completely clear (customer-specific operational data)
    const clearTables = [
      'users',
      'employees', 
      'violations',
      'email_communications',
      'gmail_messages',
      'teams_messages', 
      'slack_messages',
      'notifications',
      'sync_jobs',
      'compliance_incidents',
      'training_assignments',
      'employee_metrics',
      'activity_logs',
      'audit_logs',
      'user_sessions',
      'mfa_codes',
      'violation_status_history',
      // Connector/Integration specific tables
      'integration_configs',
      'google_drive_files',
      'platform_entities',
      'unified_sync_jobs',
      'sync_jobs_legacy',
      'ai_training_generation_log',
      'ai_validation_requests',
      'category_detection_results',
      'category_keywords',
      'compliance_analysis_log',
      'compliance_audit_log',
      'employee_access_restrictions',
      'employee_compliance_analysis_summary',
      'employee_compliance_status',
      'employee_logging_settings',
      'employee_monitoring_settings',
      'employee_training_compliance',
      'incident_updates',
      'incidents',
      'mfa_audit_log',
      'notification_delivery_log',
      'notification_preferences',
      'policy_actions',
      'policy_executions',
      'policy_inheritance_cache',
      'sync_alert_statistics',
      'sync_compliance_statistics',
      'system_notifications',
      'training_certificates',
      'training_compliance_requirements',
      'training_content_progress',
      'training_notifications',
      'training_program_content',
      // Configuration tables with customer data
      'app_settings'
    ];
    
    for (const tableName of clearTables) {
      try {
        const result = await this.targetDbPool.query(`DELETE FROM ${tableName}`);
        console.log(`   🗑️  Cleared ${result.rowCount || 0} rows from ${tableName}`);
      } catch (error) {
        console.log(`   ⚠️  Table ${tableName} not found: ${error.message}`);
      }
    }
    
    // Reset sequences
    console.log('🔄 Resetting sequences...');
    const sequencesResult = await this.targetDbPool.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesResult.rows) {
      try {
        await this.targetDbPool.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
      } catch (error) {
        console.log(`   ⚠️  Could not reset sequence ${seq.sequence_name}`);
      }
    }
    
    console.log('✅ Customer data cleanup completed');
  }

  async createAdminUser() {
    console.log('👤 Creating admin user...');
    
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(this.config.adminPassword, 10);
      
      // Create admin user
      const userResult = await this.targetDbPool.query(`
        INSERT INTO users (email, name, password_hash, role, department, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        this.config.adminEmail,
        this.config.adminName,
        passwordHash,
        'admin',
        'Administration',
        true
      ]);
      
      // Create corresponding employee record
      await this.targetDbPool.query(`
        INSERT INTO employees (name, email, department, job_title, risk_score, risk_level, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        this.config.adminName,
        this.config.adminEmail,
        'Administration',
        'System Administrator',
        5,
        'Low',
        true
      ]);
      
      console.log(`✅ Admin user created: ${this.config.adminEmail}`);
      
    } catch (error) {
      console.error('❌ Error creating admin user:', error.message);
      throw error;
    }
  }

  async updateSettings() {
    console.log('⚙️  Updating system settings...');
    
    // Reset integration settings
    const integrationSettings = [
      {
        key: 'office365_integration',
        value: {
          isActive: false,
          clientId: '',
          tenantId: '',
          lastSync: null,
          syncSettings: {
            syncEmails: true,
            syncSentEmails: true,
            daysBack: 7,
            maxEmailsPerUser: 100
          }
        }
      },
      {
        key: 'google_workspace_integration', 
        value: {
          isActive: false,
          serviceAccountEmail: '',
          lastSync: null,
          syncSettings: {
            syncEmails: true,
            syncSentEmails: true,
            daysBack: 7,
            maxMessagesPerUser: 100
          }
        }
      },
      {
        key: 'teams_integration',
        value: {
          isActive: false,
          lastSync: null
        }
      },
      {
        key: 'slack_integration',
        value: {
          isActive: false,
          lastSync: null
        }
      }
    ];
    
    for (const setting of integrationSettings) {
      await this.targetDbPool.query(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `, [setting.key, JSON.stringify(setting.value)]);
    }
    
    console.log('✅ System settings updated');
  }

  async generateSummary() {
    const summaryFile = `client-${this.clientSlug}-database-summary.txt`;
    
    // Get table counts
    const tableCountResult = await this.targetDbPool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const summary = `
SecureWatch Client Database Summary
==================================

Client Information:
------------------
Client Name: ${this.config.clientName}
Client Slug: ${this.clientSlug}
Industry: ${this.config.industry}
Database URL: ${this.config.databaseUrl.replace(/:[^:@]*@/, ':***@')}
Schema Version: Complete (${tableCountResult.rows[0].table_count} tables)
Multi-tenant Support: No (single-tenant database)

Admin User Credentials:
----------------------
Email: ${this.config.adminEmail}
Password: ${this.config.adminPassword}
Role: System Administrator

Database Structure:
------------------
✓ Complete ${tableCountResult.rows[0].table_count}-table schema (identical to production)
✓ All indexes, constraints, and views replicated
✓ Reference data preserved (policies, training, categories)
✓ Clean foundation without customer-specific data

Security Features:
-----------------
✓ Password hashing (bcrypt)
✓ Role-based access control
✓ MFA support ready
✓ Audit logging enabled
✓ Compliance framework ready

Integration Support:
-------------------
✓ Office 365 / Microsoft 365
✓ Google Workspace (Gmail, Drive)
✓ Microsoft Teams
✓ Slack
✓ Custom compliance profiles

Important Notes:
---------------
• All integrations are disabled by default and need configuration
• Admin user has full system access - change password after first login
• Database contains only the data for this client (${this.config.clientName})
• All tables support the full SecureWatch feature set
• Reference data (training, policies, categories) is pre-populated

Next Steps:
----------
1. Test admin login with the provided credentials
2. Change the default admin password
3. Configure integrations (Office 365, Google Workspace, etc.)
4. Import or create employee records
5. Set up compliance profiles for your industry (${this.config.industry})
6. Review and customize policies and training content

Generated: ${new Date().toISOString()}
`.trim();

    fs.writeFileSync(summaryFile, summary);
    console.log(`✅ Summary saved to: ${summaryFile}`);
  }

  async executeCommand(command) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = process.argv[2];
  
  if (!configPath) {
    console.error('Usage: node duplicate-and-clean-db.js <config-file>');
    process.exit(1);
  }
  
  const duplicator = new DatabaseDuplicator(configPath);
  duplicator.run().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
} 