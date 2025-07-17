const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function applyIntegrationsSchema() {
  console.log('🔧 Applying Office 365 Integrations Schema...');

  try {
    // Read the integrations schema
    const schemaPath = path.join(__dirname, '../database/integrations-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🏗️  Creating sync_jobs table and indexes...');
    await pool.query(schemaSQL);

    console.log('✅ Integrations schema applied successfully!');
    console.log('');
    console.log('📊 Created tables:');
    console.log('  - sync_jobs (for tracking email synchronization jobs)');
    console.log('  - Added indexes for performance optimization');
    console.log('');
    console.log('🔗 Office 365 integration is now ready to be configured!');

  } catch (error) {
    console.error('❌ Error applying integrations schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the schema application
applyIntegrationsSchema(); 