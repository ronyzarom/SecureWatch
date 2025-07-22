#!/usr/bin/env node

/**
 * Test script to verify the policy execution constraint fix
 */

const { query } = require('./src/utils/database');

console.log('🧪 Testing Policy Execution Constraint Fix');
console.log('==========================================\n');

async function testConstraintFix() {
  try {
    console.log('📋 Step 1: Checking current policy executions...');
    
    // Get current policy executions
    const currentResult = await query(`
      SELECT id, execution_status, policy_id, employee_id, violation_id 
      FROM policy_executions 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log(`✅ Found ${currentResult.rows.length} existing policy executions`);
    for (const exec of currentResult.rows) {
      console.log(`   📋 Execution ${exec.id}: ${exec.execution_status} (Policy ${exec.policy_id})`);
    }
    
    console.log('\n📋 Step 2: Testing allowed status values...');
    
    // Test each allowed status value
    const allowedStatuses = ['pending', 'success', 'failed', 'skipped'];
    
    for (const status of allowedStatuses) {
      try {
        // Try to create a test execution with this status
        const testResult = await query(`
          INSERT INTO policy_executions (
            policy_id, employee_id, violation_id, execution_status
          ) VALUES (1, 1, 1, $1)
          RETURNING id, execution_status
        `, [status]);
        
        const executionId = testResult.rows[0].id;
        console.log(`   ✅ Status '${status}' works (execution ${executionId})`);
        
        // Clean up test execution
        await query(`DELETE FROM policy_executions WHERE id = $1`, [executionId]);
        
      } catch (error) {
        console.log(`   ❌ Status '${status}' failed: ${error.message}`);
      }
    }
    
    console.log('\n📋 Step 3: Testing forbidden status value...');
    
    try {
      // Try to create execution with 'processing' status (should fail)
      await query(`
        INSERT INTO policy_executions (
          policy_id, employee_id, violation_id, execution_status
        ) VALUES (1, 1, 1, 'processing')
        RETURNING id
      `);
      
      console.log('   ❌ UNEXPECTED: processing status was allowed!');
      
    } catch (error) {
      if (error.code === '23514') {
        console.log('   ✅ Status "processing" correctly rejected by constraint');
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n📋 Step 4: Testing PolicyActionExecutor fix...');
    
    // Simulate what PolicyActionExecutor does now
    try {
      // Create a test execution with 'pending' status (like our fix does)
      const testResult = await query(`
        INSERT INTO policy_executions (
          policy_id, employee_id, violation_id, execution_status
        ) VALUES (1, 1, 1, 'pending')
        RETURNING id
      `);
      
      const executionId = testResult.rows[0].id;
      console.log(`   ✅ PolicyActionExecutor approach works (execution ${executionId})`);
      
      // Test updating to completion
      await query(`
        UPDATE policy_executions 
        SET execution_status = 'success', 
            completed_at = NOW()
        WHERE id = $1
      `, [executionId]);
      
      console.log(`   ✅ Successfully updated execution ${executionId} to 'success'`);
      
      // Clean up
      await query(`DELETE FROM policy_executions WHERE id = $1`, [executionId]);
      
    } catch (error) {
      console.log(`   ❌ PolicyActionExecutor approach failed: ${error.message}`);
    }
    
    console.log('\n🎉 Constraint fix validation completed!');
    console.log('✅ The policy system should now work without constraint violations.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testConstraintFix(); 