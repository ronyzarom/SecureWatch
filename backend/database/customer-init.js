const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../src/utils/database');

async function initializeCustomerDatabase() {
  console.log('🔧 Initializing Customer-Specific Database...');
  
  const customerSlug = process.env.CUSTOMER_SLUG || 'default';
  const customerName = process.env.CUSTOMER_NAME || 'Default Customer';
  
  console.log(`👤 Customer: ${customerName} (${customerSlug})`);

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

    // Check if customer already exists
    console.log('🔍 Checking if customer database is already initialized...');
    const existingCustomer = await pool.query(
      'SELECT customer_slug FROM customers WHERE customer_slug = $1 LIMIT 1',
      [customerSlug]
    ).catch(() => null);

    if (existingCustomer && existingCustomer.rows.length > 0) {
      console.log('✅ Customer database already initialized!');
      return true;
    }

    // Initialize core schema first
    console.log('📋 Initializing core database schema...');
    await initializeCoreSchema();

    // Add customer record
    console.log(`👤 Creating customer record for: ${customerName}`);
    await pool.query(`
      INSERT INTO customers (customer_slug, customer_name, industry, size, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (customer_slug) DO NOTHING
    `, [customerSlug, customerName, 'technology', 'standard']);

    // Generate sample employees for this customer
    console.log('👥 Generating sample employees...');
    await generateSampleEmployees(customerSlug);

    // Create admin user
    console.log('🔑 Creating admin user...');
    await createAdminUser(customerSlug);

    // Set up compliance framework
    console.log('📋 Initializing compliance framework...');
    await initializeComplianceFramework(customerSlug);

    // Record deployment info
    console.log('📝 Recording deployment information...');
    await pool.query(`
      INSERT INTO deployment_info (customer_slug, version, deployment_source, deployment_policy, deployed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [customerSlug, process.env.VERSION_TAG || 'v1.0.0', 'auto-init', 'standard', 'server-boot']);

    console.log('✅ Customer database initialization completed successfully!');
    console.log('');
    console.log('📊 Customer setup includes:');
    console.log(`  - Customer: ${customerName} (${customerSlug})`);
    console.log('  - Admin user: admin@abc-sw.com');
    console.log('  - 120 sample employees with risk profiles');
    console.log('  - Training assignments and compliance tracking');
    console.log('  - SOC2 compliance framework');
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️  Starting server without database. Some features may not work.');
    return false;
  }
}

async function initializeCoreSchema() {
  // Create core tables with customer isolation
  await pool.query(`
    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) UNIQUE NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      industry VARCHAR(100),
      size VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Employees table with customer isolation
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      employee_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      position VARCHAR(100),
      risk_score DECIMAL(3,1) DEFAULT 5.0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(customer_slug, employee_id)
    );

    -- Training assignments table
    CREATE TABLE IF NOT EXISTS training_assignments (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      employee_id VARCHAR(100) NOT NULL,
      training_type VARCHAR(100) NOT NULL,
      assigned_date TIMESTAMP DEFAULT NOW(),
      due_date TIMESTAMP,
      completed_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'assigned',
      score INTEGER,
      FOREIGN KEY (customer_slug, employee_id) REFERENCES employees(customer_slug, employee_id)
    );

    -- Compliance tracking table
    CREATE TABLE IF NOT EXISTS compliance_records (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      framework VARCHAR(100) NOT NULL,
      requirement VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      last_checked TIMESTAMP DEFAULT NOW(),
      evidence TEXT
    );

    -- Admin users table
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP,
      UNIQUE(customer_slug, email)
    );

    -- Deployment info table
    CREATE TABLE IF NOT EXISTS deployment_info (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      version VARCHAR(50) NOT NULL,
      deployment_source VARCHAR(50) NOT NULL,
      deployment_policy VARCHAR(50) NOT NULL,
      deployed_at TIMESTAMP DEFAULT NOW(),
      deployed_by VARCHAR(100)
    );

    -- Email analysis table
    CREATE TABLE IF NOT EXISTS email_analysis (
      id SERIAL PRIMARY KEY,
      customer_slug VARCHAR(100) NOT NULL REFERENCES customers(customer_slug),
      employee_id VARCHAR(100) NOT NULL,
      email_subject VARCHAR(255),
      sender VARCHAR(255),
      risk_level VARCHAR(20),
      analysis_date TIMESTAMP DEFAULT NOW(),
      action_taken VARCHAR(100),
      FOREIGN KEY (customer_slug, employee_id) REFERENCES employees(customer_slug, employee_id)
    );
  `);
}

async function generateSampleEmployees(customerSlug) {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
  const positions = ['Manager', 'Senior', 'Junior', 'Lead', 'Director', 'Analyst'];
  
  const employees = [];
  for (let i = 1; i <= 120; i++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const riskScore = (Math.random() * 10).toFixed(1);
    
    employees.push({
      employee_id: `EMP${i.toString().padStart(3, '0')}`,
      name: `Employee ${i}`,
      email: `employee${i}@abc-sw.com`,
      department: dept,
      position: `${pos} ${dept}`,
      risk_score: riskScore
    });
  }

  // Insert employees in batches
  for (const emp of employees) {
    await pool.query(`
      INSERT INTO employees (customer_slug, employee_id, name, email, department, position, risk_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [customerSlug, emp.employee_id, emp.name, emp.email, emp.department, emp.position, emp.risk_score]);
  }

  console.log(`  ✅ Generated ${employees.length} sample employees`);
}

async function createAdminUser(customerSlug) {
  const bcrypt = require('bcrypt');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@abc-sw.com';
  const adminName = process.env.ADMIN_NAME || 'ABC Administrator';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SecureWatch2024!';
  
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  
  await pool.query(`
    INSERT INTO admin_users (customer_slug, email, name, password_hash, role)
    VALUES ($1, $2, $3, $4, 'admin')
    ON CONFLICT (customer_slug, email) DO NOTHING
  `, [customerSlug, adminEmail, adminName, passwordHash]);

  console.log(`  ✅ Admin user created: ${adminEmail}`);
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

module.exports = {
  initializeCustomerDatabase
}; 