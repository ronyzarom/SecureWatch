const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (common in Render, Heroku, etc.)
  console.log('🔗 Using DATABASE_URL for database connection');
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // How long to wait for a connection
  };
} else {
  // Use individual environment variables
  console.log('🔧 Using individual DB environment variables');
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'securewatch',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // How long to wait for a connection
  };
}

console.log('📊 Database configuration:', {
  type: process.env.DATABASE_URL ? 'DATABASE_URL' : 'Individual variables',
  host: dbConfig.host || 'from DATABASE_URL',
  database: dbConfig.database || 'from DATABASE_URL',
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});

// Create connection pool
const pool = new Pool(dbConfig);

// Pool event handlers
pool.on('connect', (client) => {
  console.log('📀 New database client connected');
});

pool.on('error', (err, client) => {
  console.error('💥 Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log(`🔍 Query executed in ${duration}ms:`, text.substring(0, 50) + '...');
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('❌ Error getting database client:', error);
    throw error;
  }
};

// Helper function to execute transactions
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully at:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

// Note: Signal handlers removed for development to prevent premature pool closure
// In production, you may want to add graceful shutdown handlers

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  pool
}; 