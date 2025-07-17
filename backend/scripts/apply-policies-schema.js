const fs = require('fs');
const path = require('path');
const { query } = require('../src/utils/database');

async function applyPoliciesSchema() {
  try {
    console.log('🚀 Applying Security Policies Schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/policies-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Clean and prepare the SQL
    let cleanSql = schemaSql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/^\s*$/gm, '') // Remove empty lines
      .trim();
    
    // Execute the entire schema as one transaction for consistency
    console.log('⚡ Executing complete schema...');
    await query(cleanSql);
    console.log('✅ Schema executed successfully');
    
    const statements = ['Schema Applied'];
    
    console.log(`📝 Schema execution completed`);
    
    console.log('🎉 Security Policies Schema applied successfully!');
    
    // Verify the tables were created
    console.log('\n🔍 Verifying schema creation...');
    const verification = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%polic%'
      ORDER BY table_name;
    `);
    
    console.log('📊 Policy-related tables created:');
    verification.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Show sample data
    console.log('\n📋 Sample policies created:');
    const samplePolicies = await query(`
      SELECT id, name, policy_level, is_active, priority 
      FROM security_policies 
      ORDER BY priority DESC, id
    `);
    
    samplePolicies.rows.forEach(policy => {
      console.log(`  ${policy.policy_level.toUpperCase()}: ${policy.name} (Priority: ${policy.priority}, Active: ${policy.is_active})`);
    });
    
    console.log('\n✨ Policy Management System database ready!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Failed to apply policies schema:', error);
    process.exit(1);
  }
}

// Run the schema application
applyPoliciesSchema(); 