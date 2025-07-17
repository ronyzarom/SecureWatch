const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'securewatch',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration for policies table...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrate-policies-target-id.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Changes applied:');
    console.log('   - Changed target_id from INTEGER to VARCHAR(255)');
    console.log('   - Updated existing data to use department names and emails');
    console.log('   - Updated constraints and utility functions');
    
    // Verify the changes
    const result = await client.query('SELECT id, name, policy_level, target_id, target_type FROM security_policies ORDER BY id');
    console.log('\n📋 Current policies:');
    result.rows.forEach(row => {
      console.log(`   ${row.id}: ${row.name} (${row.policy_level}, target: ${row.target_id || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 