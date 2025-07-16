const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../src/utils/database');

async function initializeDatabase() {
  console.log('🔧 Initializing SecureWatch Database...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionSuccess = await testConnection();
    
    if (!connectionSuccess) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }

    // Read and execute schema
    console.log('📋 Loading database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🏗️  Creating tables and inserting sample data...');
    await pool.query(schemaSQL);

    console.log('✅ Database initialization completed successfully!');
    console.log('');
    console.log('📊 Sample data includes:');
    console.log('  - Default admin user: admin@company.com (password: admin123)');
    console.log('  - 6 sample employees with various risk levels');
    console.log('  - Sample violations and metrics data');
    console.log('  - Company settings and configuration');
    console.log('');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error('   Schema file not found. Please ensure schema.sql exists.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Please ensure PostgreSQL is running.');
    } else if (error.code === '3D000') {
      console.error('   Database "securewatch" does not exist. Please create it first:');
      console.error('   createdb securewatch');
    } else if (error.code === '28P01') {
      console.error('   Authentication failed. Please check database credentials.');
    }
    
    process.exit(1);
  }
}

// Helper function to check if database exists
async function checkDatabaseExists() {
  try {
    const result = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'securewatch'
    `);
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

// Create database if it doesn't exist (requires connecting to 'postgres' database)
async function createDatabaseIfNeeded() {
  const { Pool } = require('pg');
  
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔍 Checking if database exists...');
    
    const result = await adminPool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'securewatch'
    `);

    if (result.rows.length === 0) {
      console.log('🔨 Creating securewatch database...');
      await adminPool.query('CREATE DATABASE securewatch');
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database already exists.');
    }

  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Main initialization function
async function main() {
  try {
    await createDatabaseIfNeeded();
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
    console.log('🔒 Database connection closed.');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeDatabase,
  createDatabaseIfNeeded
}; 