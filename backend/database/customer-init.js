const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../src/utils/database');

async function initializeCustomerDatabase() {
  console.log('🔧 Initializing Single-Tenant Customer Database...');
  
  const customerName = process.env.CUSTOMER_NAME || 'ABC Software';
  
  console.log(`👤 Customer: ${customerName}`);

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionSuccess = await testConnection();
    
    if (!connectionSuccess) {
      console.error('❌ Database connection failed. Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const retrySuccess = await testConnection();
      if (!retrySuccess) {
        console.error('❌ Database connection failed after retry. Starting without database.');
        return false;
      }
    }

    // Check if database is already initialized (single-tenant check)
    console.log('🔍 Checking if database is already initialized...');
    const existingUsers = await pool.query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1 AND table_schema = $2',
      ['users', 'public']
    ).catch(() => null);

    if (existingUsers && existingUsers.rows[0].count > 0) {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] }));
      if (userCount.rows[0].count > 0) {
        console.log('✅ Database already initialized!');
        return true;
      }
    }

    // Initialize core schema
    console.log('📋 Initializing core database schema...');
    await initializeCoreSchema();

    // Generate sample employees
    console.log('👥 Generating sample employees...');
    await generateSampleEmployees();

    // Create admin user
    console.log('🔑 Creating admin user...');
    await createAdminUser();

    // Initialize sample data for critical tables
    console.log('📊 Creating sample violations and notifications...');
    await initializeSampleData();

    console.log('✅ Customer database initialization completed successfully!');
    console.log('');
    console.log('📊 Customer setup includes:');
    console.log(`  - Customer: ${customerName}`);
    console.log('  - Admin user: admin@abc-sw.com');
    console.log('  - 120 sample employees with risk profiles');
    console.log('  - Complete single-tenant database schema');
    console.log('  - All critical tables with sample data');
    console.log('  - Dashboard functionality ready');
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️  Starting server without database. Some features may not work.');
    return false;
  }
}

async function initializeCoreSchema() {
  console.log('📋 Creating complete 60-table development-grade schema...');
  
  try {
    // Read the complete schema file
    const schemaPath = path.join(__dirname, '../../dev-complete-60-tables-schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Loading complete 60-table schema from file...');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the complete schema
      await pool.query(schemaSQL);
      console.log('✅ Complete 60-table schema created successfully!');
      
    } else {
      console.log('⚠️  Schema file not found, creating essential tables manually...');
      
      // Fallback: Create essential tables if schema file is missing
      await pool.query(`
        -- Essential core tables for basic functionality
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
            department VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            mfa_enabled BOOLEAN DEFAULT false,
            mfa_secret VARCHAR(255),
            mfa_backup_codes TEXT[],
            mfa_last_used TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            department VARCHAR(255),
            job_title VARCHAR(255),
            photo_url TEXT,
            risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
            risk_level VARCHAR(20) DEFAULT 'Low' CHECK (risk_level IN ('Critical', 'High', 'Medium', 'Low')),
            last_activity TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            compliance_profile_id INTEGER,
            compliance_notes TEXT,
            data_retention_until DATE,
            regulatory_status JSONB DEFAULT '{}',
            last_compliance_review DATE,
            compliance_exceptions JSONB DEFAULT '{}',
            ai_compliance_score INTEGER DEFAULT 0,
            ai_compliance_status VARCHAR(50) DEFAULT 'unknown',
            ai_risk_trend VARCHAR(20) DEFAULT 'unknown',
            ai_last_analyzed TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS violations (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
            type VARCHAR(255) NOT NULL,
            severity VARCHAR(20) DEFAULT 'Low' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
            description TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved')),
            evidence TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW(),
            source VARCHAR(50),
            metadata JSONB DEFAULT '{}',
            compliance_category VARCHAR(50),
            regulatory_impact JSONB DEFAULT '{}',
            policy_references TEXT[] DEFAULT '{}',
            compliance_severity VARCHAR(20),
            requires_notification BOOLEAN DEFAULT false,
            notification_timeline_hours INTEGER
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL DEFAULT 'info',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            action_url VARCHAR(500),
            employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
            violation_id INTEGER REFERENCES violations(id) ON DELETE SET NULL,
            priority VARCHAR(10) DEFAULT 'medium',
            category VARCHAR(20) DEFAULT 'system',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Essential indexes
        CREATE INDEX IF NOT EXISTS idx_employees_risk_score ON employees(risk_score DESC);
        CREATE INDEX IF NOT EXISTS idx_violations_employee ON violations(employee_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
      `);
      
      console.log('✅ Essential tables created as fallback!');
    }
    
  } catch (error) {
    console.error('❌ Error creating schema:', error.message);
    throw error;
  }
}

async function generateSampleEmployees() {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
  const positions = ['Manager', 'Senior', 'Junior', 'Lead', 'Director', 'Analyst'];
  
  const employees = [];
  for (let i = 1; i <= 120; i++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const riskScore = Math.floor(Math.random() * 100);
    
    employees.push({
      name: `Employee ${i}`,
      email: `employee${i}@abc-sw.com`,
      department: dept,
      job_title: `${pos} ${dept}`,
      risk_score: riskScore
    });
  }

  // Insert employees in batches (single-tenant style)
  for (const emp of employees) {
    const riskLevel = emp.risk_score >= 80 ? 'Critical' : 
                      emp.risk_score >= 60 ? 'High' : 
                      emp.risk_score >= 40 ? 'Medium' : 'Low';
    
    await pool.query(`
      INSERT INTO employees (name, email, department, job_title, risk_score, risk_level, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [emp.name, emp.email, emp.department, emp.job_title, emp.risk_score, riskLevel, true]);
  }

  console.log(`  ✅ Generated ${employees.length} sample employees`);
}

async function createAdminUser() {
  const bcrypt = require('bcrypt');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@abc-sw.com';
  const adminName = process.env.ADMIN_NAME || 'ABC Administrator';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SecureWatch2024!';
  
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  
  // Create admin user in users table (single-tenant)
  await pool.query(`
    INSERT INTO users (email, name, password_hash, role, department)
    VALUES ($1, $2, $3, 'admin', 'Administration')
    ON CONFLICT (email) DO NOTHING
  `, [adminEmail, adminName, passwordHash]);

  // Create admin employee record (single-tenant)
  await pool.query(`
    INSERT INTO employees (
      name, 
      email, 
      department, 
      job_title, 
      risk_score, 
      risk_level,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (email) DO NOTHING
  `, [
    adminName, 
    adminEmail, 
    'Administration', 
    'System Administrator', 
    20, 
    'Low',
    true
  ]);

  console.log(`  ✅ Admin user created: ${adminEmail}`);
  console.log(`  ✅ Admin employee record created: ${adminEmail}`);
}

async function initializeComplianceFramework(customerSlug) {
  const frameworks = [
    { framework: 'SOC2', requirement: 'Access Control', status: 'configured' },
    { framework: 'SOC2', requirement: 'Security Monitoring', status: 'active' },
    { framework: 'SOC2', requirement: 'Data Protection', status: 'configured' },
    { framework: 'SOC2', requirement: 'Incident Response', status: 'configured' },
    { framework: 'ISO27001', requirement: 'Risk Assessment', status: 'pending' }
  ];

  for (const comp of frameworks) {
    await pool.query(`
      INSERT INTO compliance_records (customer_slug, framework, requirement, status)
      VALUES ($1, $2, $3, $4)
    `, [customerSlug, comp.framework, comp.requirement, comp.status]);
  }

  console.log(`  ✅ Compliance framework initialized (SOC2, ISO27001)`);
}

async function initializeSampleData() {
  // Insert sample violations for dashboard (single-tenant)
  const sampleEmployees = await pool.query(`
    SELECT id FROM employees LIMIT 3
  `);

  if (sampleEmployees.rows.length > 0) {
    for (let i = 0; i < sampleEmployees.rows.length; i++) {
      const emp = sampleEmployees.rows[i];
      const violationTypes = ['Data Access', 'Email Policy', 'Security Breach'];
      const severities = ['Medium', 'Low', 'High'];
      const descriptions = [
        'Accessed sensitive files outside work hours',
        'Forwarded internal email to personal account', 
        'Multiple failed login attempts detected'
      ];
      const statuses = ['Active', 'Resolved', 'Investigating'];

      await pool.query(`
        INSERT INTO violations (employee_id, type, severity, description, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [emp.id, violationTypes[i], severities[i], descriptions[i], statuses[i]]);
    }
  }

  // Insert sample notifications (single-tenant)
  const adminUser = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
  const adminUserId = adminUser.rows.length > 0 ? adminUser.rows[0].id : null;

  if (adminUserId) {
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, read) VALUES
      ($1, 'critical', 'Security Alert', 'Unusual activity detected in system', false),
      ($1, 'warning', 'Policy Update', 'New security policy has been published', false),
      ($1, 'info', 'Training Due', 'Security training deadline approaching', true)
    `, [adminUserId]);
  }

  // Insert sample category keywords (single-tenant)
  const categoryIds = await pool.query(`
    SELECT id, name FROM threat_categories ORDER BY id LIMIT 3
  `);

  for (const cat of categoryIds.rows) {
    const keywords = cat.name === 'Data Exfiltration' ? 
      [['confidential', 0.8], ['download files', 0.9]] :
      cat.name === 'Phishing Attempt' ?
      [['click here', 0.7], ['verify account', 0.8]] :
      [['unauthorized', 0.6], ['suspicious access', 0.7]];

    for (const [keyword, weight] of keywords) {
      const isPhrase = keyword.includes(' ');
      await pool.query(`
        INSERT INTO category_keywords (category_id, keyword, weight, is_phrase)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [cat.id, keyword, weight, isPhrase]);
    }
  }

  // Insert sample employee metrics for dashboard analytics (single-tenant)
  const employees = await pool.query('SELECT id FROM employees LIMIT 10');
  for (const emp of employees.rows) {
    await pool.query(`
      INSERT INTO employee_metrics (employee_id, date, email_volume, external_contacts, after_hours_activity, security_events)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
      ON CONFLICT (employee_id, date) DO NOTHING
    `, [
      emp.id,
      Math.floor(Math.random() * 50) + 10, // 10-60 emails
      Math.floor(Math.random() * 10), // 0-10 external contacts  
      Math.floor(Math.random() * 30), // 0-30% after hours
      Math.floor(Math.random() * 3) // 0-3 security events
    ]);
  }

  console.log(`  ✅ Sample violations, notifications, keywords, and metrics created`);
}

module.exports = {
  initializeCustomerDatabase
}; 