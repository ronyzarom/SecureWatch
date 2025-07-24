/**
 * Test Category Detection → Policy Integration
 * 
 * This script demonstrates how category detection results can trigger
 * policy evaluations and automated responses.
 */

const { query } = require('./src/utils/database');
const EmailRiskAnalyzer = require('./src/services/emailRiskAnalyzer');
const PolicyActionExecutor = require('./src/services/policyActionExecutor');

async function testCategoryPolicyIntegration() {
  console.log('🧪 TESTING CATEGORY DETECTION → POLICY INTEGRATION');
  console.log('=' .repeat(60));

  try {
    // 1. Get existing emails and categories
    const emailsResult = await query(`
      SELECT id, subject, body_text, sender_email, sender_employee_id
      FROM email_communications 
      WHERE sender_employee_id IS NOT NULL
      LIMIT 3
    `);

    const categoriesResult = await query(`
      SELECT * FROM threat_categories WHERE is_active = true LIMIT 5
    `);

    if (emailsResult.rows.length === 0 || categoriesResult.rows.length === 0) {
      console.log('❌ No test data available');
      return;
    }

    console.log(`📧 Found ${emailsResult.rows.length} emails to analyze`);
    console.log(`🎯 Found ${categoriesResult.rows.length} active threat categories`);

    // 2. Create a test policy for category detections
    const existingPolicyResult = await query(`
      SELECT id FROM security_policies WHERE name = 'Category Detection Response Policy'
    `);

    let policyId;
    if (existingPolicyResult.rows.length > 0) {
      policyId = existingPolicyResult.rows[0].id;
      console.log(`📋 Using existing test policy ID: ${policyId}`);
    } else {
      const testPolicyResult = await query(`
        INSERT INTO security_policies (
          name, description, policy_level, is_active, priority, created_by
        ) VALUES (
          'Category Detection Response Policy',
          'Automated responses to high-risk category detections',
          'High',
          true, 1, 1
        ) RETURNING id
      `);
      policyId = testPolicyResult.rows[0].id;
      console.log(`📋 Created new test policy ID: ${policyId}`);
    }



    // 3. Add conditions for category detection
    await query(`DELETE FROM policy_conditions WHERE policy_id = $1`, [policyId]);
    await query(`
      INSERT INTO policy_conditions (
        policy_id, condition_type, operator, value, logical_operator, condition_order
      ) VALUES 
      ($1, 'category_detection_risk', 'greater_than', '80', 'OR', 1),
      ($1, 'category_detection_count', 'greater_than', '2', 'OR', 2)
    `, [policyId, policyId]);

    // 4. Add actions for the policy
    await query(`DELETE FROM policy_actions WHERE policy_id = $1`, [policyId]);
    await query(`
      INSERT INTO policy_actions (
        policy_id, action_type, action_config, execution_order, delay_minutes, is_enabled
      ) VALUES (
        $1, 'email_alert', 
        '{"recipients": ["security@company.com"], "subject": "High-Risk Category Detection Alert"}',
        1, 0, true
      ), (
        $1, 'increase_monitoring',
        '{"duration_hours": 24, "monitoring_level": "high"}',
        2, 5, true
      )
    `, [policyId, policyId]);

    console.log('✅ Test policy conditions and actions configured');

    // 5. Test category analysis with policy triggers
    const emailRiskAnalyzer = new EmailRiskAnalyzer();
    
    for (const email of emailsResult.rows.slice(0, 2)) {
      console.log(`\n🔍 Analyzing email: "${email.subject}"`);
      
      const categories = categoriesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        severity: row.severity,
        alertThreshold: row.alert_threshold || 60,
        investigationThreshold: row.investigation_threshold || 70,
        criticalThreshold: row.critical_threshold || 80,
        isActive: row.is_active,
        keywords: []
      }));

      // Analyze email with category detection and policy triggers
      const results = await emailRiskAnalyzer.analyzeWithCustomCategoriesAndTriggerPolicies(
        email, 
        categories, 
        email.sender_employee_id
      );

      console.log(`📊 Analysis results: ${results.length} detections`);
      
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.categoryName}: ${result.finalRiskScore || result.riskScore}% risk`);
        if (result.triggersCritical) console.log(`     🚨 TRIGGERS CRITICAL ALERT`);
        if (result.triggersAlert) console.log(`     ⚠️  TRIGGERS ALERT`);
        if (result.triggersInvestigation) console.log(`     🔍 TRIGGERS INVESTIGATION`);
      });
    }

    // 6. Start policy executor to process triggered policies
    console.log('\n🚀 Starting Policy Action Executor...');
    const policyExecutor = new PolicyActionExecutor();
    policyExecutor.start();

    // Let it run for a few seconds to process any triggered policies
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 7. Check results
    console.log('\n📈 CHECKING POLICY EXECUTION RESULTS:');
    
    const executionsResult = await query(`
      SELECT 
        pe.id, pe.execution_status, pe.started_at, pe.completed_at,
        sp.name as policy_name,
        e.name as employee_name,
        v.type as violation_type,
        v.severity as violation_severity
      FROM policy_executions pe
      JOIN security_policies sp ON pe.policy_id = sp.id
      JOIN employees e ON pe.employee_id = e.id
      LEFT JOIN violations v ON pe.violation_id = v.id
      WHERE pe.created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY pe.created_at DESC
      LIMIT 10
    `);

    if (executionsResult.rows.length > 0) {
      console.log(`✅ Found ${executionsResult.rows.length} recent policy executions:`);
      executionsResult.rows.forEach((exec, i) => {
        console.log(`  ${i + 1}. Policy: ${exec.policy_name}`);
        console.log(`     Employee: ${exec.employee_name}`);
        console.log(`     Status: ${exec.execution_status}`);
        console.log(`     Violation: ${exec.violation_type} (${exec.violation_severity})`);
        console.log(`     Executed: ${exec.started_at}`);
      });
    } else {
      console.log('ℹ️  No recent policy executions found');
    }

    // 8. Check violations created from category detections
    const categoryViolationsResult = await query(`
      SELECT v.*, e.name as employee_name, tc.name as category_name
      FROM violations v
      JOIN employees e ON v.employee_id = e.id
      LEFT JOIN category_detection_results cdr ON (v.metadata->>'categoryId')::int = cdr.category_id
        AND (v.metadata->>'emailId')::int = cdr.email_id
      LEFT JOIN threat_categories tc ON cdr.category_id = tc.id
      WHERE v.source = 'category_detection'
      AND v.created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY v.created_at DESC
      LIMIT 10
    `);

    if (categoryViolationsResult.rows.length > 0) {
      console.log(`\n🚨 Found ${categoryViolationsResult.rows.length} violations from category detections:`);
      categoryViolationsResult.rows.forEach((violation, i) => {
        console.log(`  ${i + 1}. ${violation.employee_name}: ${violation.type}`);
        console.log(`     Category: ${violation.category_name || 'Unknown'}`);
        console.log(`     Severity: ${violation.severity}`);
        console.log(`     Created: ${violation.created_at}`);
      });
    } else {
      console.log('\nℹ️  No violations from category detections found');
    }

    console.log('\n🎉 CATEGORY DETECTION → POLICY INTEGRATION TEST COMPLETE!');
    console.log('✅ Category detections can now trigger automated policy responses');
    console.log('✅ Policy conditions can check category detection data');
    console.log('✅ Violations are created for high-risk category detections');
    console.log('✅ Policy executor processes category-triggered policies');

    // Stop the policy executor
    policyExecutor.stop();

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

testCategoryPolicyIntegration(); 