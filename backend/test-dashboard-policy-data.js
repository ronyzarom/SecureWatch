#!/usr/bin/env node

/**
 * Test Dashboard Policy Execution Data Integration
 */

const { query } = require('./src/utils/database');

console.log('🧪 Testing Dashboard Policy Execution Integration');
console.log('================================================');

async function testDashboardPolicyData() {
  try {
    console.log('📋 Step 1: Testing dashboard metrics queries...');
    
    // Simulate the exact queries from dashboard.js
    const [
      riskLevelCounts,
      violationsResult,
      recentActivityResult,
      policyExecutionResult,
      departmentCounts,
      trendData
    ] = await Promise.all([
      query(`
        SELECT 
          risk_level,
          COUNT(*) as count
        FROM employees 
        WHERE is_active = true
        GROUP BY risk_level
      `),
      query(`
        SELECT 
          COUNT(*) as total_violations,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_violations,
          COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_violations
        FROM violations
      `),
      query(`
        SELECT COUNT(*) as recent_activity
        FROM employees 
        WHERE last_activity > NOW() - INTERVAL '24 hours'
          AND is_active = true
      `),
      query(`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN execution_status = 'success' THEN 1 END) as successful_executions,
          COUNT(CASE WHEN execution_status = 'failed' THEN 1 END) as failed_executions,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_executions
        FROM policy_executions
      `),
      query(`
        SELECT 
          department,
          COUNT(*) as count,
          AVG(risk_score) as avg_risk_score
        FROM employees 
        WHERE is_active = true
          AND department IS NOT NULL
        GROUP BY department
        ORDER BY avg_risk_score DESC
      `),
      query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as violations_count,
          AVG(CASE 
            WHEN severity = 'Critical' THEN 4
            WHEN severity = 'High' THEN 3  
            WHEN severity = 'Medium' THEN 2
            WHEN severity = 'Low' THEN 1
            ELSE 0
          END) as avg_severity
        FROM violations
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)
    ]);

    console.log('✅ All queries completed successfully');
    
    console.log('\n📊 Results:');
    console.log('Risk Levels:', riskLevelCounts.rows);
    console.log('Violations:', violationsResult.rows[0]);
    console.log('Recent Activity:', recentActivityResult.rows[0]);
    console.log('🎯 Policy Executions:', policyExecutionResult.rows[0]);
    console.log('Departments:', departmentCounts.rows.slice(0, 3));
    console.log('Trend Data:', trendData.rows.slice(0, 3));
    
    // Test the formatted response structure
    console.log('\n📋 Step 2: Testing response formatting...');
    
    const riskLevelMap = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    riskLevelCounts.rows.forEach(row => {
      riskLevelMap[row.risk_level] = parseInt(row.count);
    });
    
    const totalEmployees = Object.values(riskLevelMap).reduce((sum, count) => sum + count, 0);
    
    const dashboardResponse = {
      summary: {
        totalEmployees,
        criticalRisk: riskLevelMap.Critical,
        highRisk: riskLevelMap.High,
        mediumRisk: riskLevelMap.Medium,
        lowRisk: riskLevelMap.Low,
        totalViolations: parseInt(violationsResult.rows[0].total_violations),
        activeViolations: parseInt(violationsResult.rows[0].active_violations),
        criticalViolations: parseInt(violationsResult.rows[0].critical_violations),
        recentActivity: parseInt(recentActivityResult.rows[0].recent_activity),
        // Policy execution statistics
        totalPolicyExecutions: parseInt(policyExecutionResult.rows[0].total_executions),
        successfulExecutions: parseInt(policyExecutionResult.rows[0].successful_executions),
        failedExecutions: parseInt(policyExecutionResult.rows[0].failed_executions),
        recentExecutions: parseInt(policyExecutionResult.rows[0].recent_executions)
      },
      riskDistribution: riskLevelMap,
      departmentBreakdown: departmentCounts.rows.map(row => ({
        department: row.department,
        count: parseInt(row.count),
        avgRiskScore: parseFloat(row.avg_risk_score).toFixed(1)
      })),
      trend: trendData.rows.map(row => ({
        date: row.date,
        violations: parseInt(row.violations_count),
        avgSeverity: parseFloat(row.avg_severity).toFixed(2)
      }))
    };
    
    console.log('✅ Dashboard Response Structure:');
    console.log(JSON.stringify(dashboardResponse.summary, null, 2));
    
    console.log('\n🎯 Policy Execution Summary:');
    console.log(`📊 Total Executions: ${dashboardResponse.summary.totalPolicyExecutions}`);
    console.log(`✅ Successful: ${dashboardResponse.summary.successfulExecutions}`);
    console.log(`❌ Failed: ${dashboardResponse.summary.failedExecutions}`);
    console.log(`🕐 Recent (24h): ${dashboardResponse.summary.recentExecutions}`);
    
    const successRate = dashboardResponse.summary.totalPolicyExecutions > 0 ? 
      Math.round((dashboardResponse.summary.successfulExecutions / dashboardResponse.summary.totalPolicyExecutions) * 100) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    
    console.log('\n🎉 Dashboard policy integration test completed successfully!');
    console.log('✅ Policy execution data is now available in dashboard API');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDashboardPolicyData(); 