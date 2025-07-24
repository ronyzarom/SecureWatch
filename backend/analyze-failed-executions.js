#!/usr/bin/env node

const { query } = require('./src/utils/database');

console.log('🔍 Investigating Failed Policy Executions');
console.log('========================================');

async function analyzeFailed() {
  try {
    const result = await query(`
      SELECT 
        pe.id,
        pe.policy_id,
        sp.name as policy_name,
        pe.employee_id,
        e.name as employee_name,
        pe.violation_id,
        pe.execution_status,
        pe.error_message,
        pe.execution_result,
        pe.created_at,
        pe.completed_at,
        -- Get policy actions for this policy
        pa.action_type,
        pa.action_config
      FROM policy_executions pe
      JOIN security_policies sp ON pe.policy_id = sp.id
      JOIN employees e ON pe.employee_id = e.id
      LEFT JOIN policy_actions pa ON pe.policy_id = pa.policy_id AND pa.is_enabled = true
      WHERE pe.execution_status = 'failed'
      ORDER BY pe.created_at DESC
    `);

    console.log(`❌ Found ${result.rows.length} failed policy executions:`);
    console.log('');
    
    // Group by policy for better analysis
    const failuresByPolicy = {};
    result.rows.forEach(row => {
      if (!failuresByPolicy[row.policy_name]) {
        failuresByPolicy[row.policy_name] = [];
      }
      failuresByPolicy[row.policy_name].push(row);
    });
    
    Object.keys(failuresByPolicy).forEach((policyName, index) => {
      const failures = failuresByPolicy[policyName];
      console.log(`${index + 1}. Policy: "${policyName}" (${failures.length} failures)`);
      
      failures.forEach((failure, i) => {
        console.log(`   ➤ Execution ${failure.id}: ${failure.employee_name}`);
        console.log(`     Created: ${failure.created_at}`);
        console.log(`     Action Type: ${failure.action_type || 'Unknown'}`);
        console.log(`     Error: ${failure.error_message || 'No error message'}`);
        if (failure.execution_result) {
          try {
            const result = typeof failure.execution_result === 'string' ? 
              JSON.parse(failure.execution_result) : failure.execution_result;
            console.log(`     Result: ${JSON.stringify(result, null, 6)}`);
          } catch (e) {
            console.log(`     Result: ${failure.execution_result}`);
          }
        }
        console.log('');
      });
    });
    
    console.log('🎯 Failure Analysis Summary:');
    Object.keys(failuresByPolicy).forEach(policyName => {
      console.log(`   📋 ${policyName}: ${failuresByPolicy[policyName].length} failures`);
    });

    // Let's also check what actions these failed policies were trying to execute
    console.log('\n🔧 Action Analysis:');
    const actionTypes = {};
    result.rows.forEach(row => {
      if (row.action_type) {
        actionTypes[row.action_type] = (actionTypes[row.action_type] || 0) + 1;
      }
    });
    
    Object.keys(actionTypes).forEach(actionType => {
      console.log(`   🔧 ${actionType}: ${actionTypes[actionType]} failures`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

analyzeFailed(); 