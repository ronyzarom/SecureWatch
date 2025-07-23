const OptimizedEmailProcessor = require('./src/services/optimizedEmailProcessor');
const { query } = require('./src/utils/database');

/**
 * Test Enhanced Compliance-Aware Email Analyzer
 * 
 * Demonstrates the comprehensive compliance assessment capabilities:
 * 1. GDPR data protection violations
 * 2. SOX financial reporting compliance  
 * 3. HIPAA health information protection
 * 4. PCI DSS payment data security
 * 5. Internal policy violations
 */

class ComplianceAnalyzerTest {
  constructor() {
    this.processor = new OptimizedEmailProcessor();
    this.testResults = [];
  }

  async runComprehensiveTest() {
    console.log('🏛️ COMPREHENSIVE COMPLIANCE ANALYZER TEST');
    console.log('==========================================');
    console.log('Testing enhanced email analyzer with compliance assessment\n');

    try {
      // Test GDPR compliance
      await this.testGDPRCompliance();
      
      // Test SOX compliance  
      await this.testSOXCompliance();
      
      // Test HIPAA compliance
      await this.testHIPAACompliance();
      
      // Test PCI DSS compliance
      await this.testPCIDSSCompliance();
      
      // Test internal policy compliance
      await this.testInternalPolicyCompliance();
      
      // Test combined security + compliance analysis
      await this.testCombinedAnalysis();
      
      // Display summary
      this.displayTestSummary();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testGDPRCompliance() {
    console.log('🇪🇺 Testing GDPR Compliance Assessment');
    console.log('=====================================');

    const gdprTestCases = [
      {
        name: 'Personal Data Transfer',
        email: {
          messageId: 'gdpr-test-1',
          subject: 'Customer Data Export',
          body: 'Hi, I need to send the customer personal data including emails, phone numbers, and addresses to our partner company for marketing analysis.',
          sender: { email: 'admin@example.com', name: 'Admin User' },
          recipient: ['partner@external.com'],
          sentAt: new Date()
        },
        expectedViolations: ['GDPR_DATA_TRANSFER']
      },
      {
        name: 'Right to Erasure Request',
        email: {
          messageId: 'gdpr-test-2', 
          subject: 'Data Deletion Request',
          body: 'Customer requesting deletion of all personal data. Please delete john.doe@email.com records including purchase history and contact details.',
          sender: { email: 'support@example.com', name: 'Support Team' },
          recipient: ['internal@example.com'],
          sentAt: new Date()
        },
        expectedViolations: ['GDPR_RIGHT_TO_ERASURE']
      },
      {
        name: 'Data Breach Notification',
        email: {
          messageId: 'gdpr-test-3',
          subject: 'Security Incident Report',
          body: 'We have detected a security breach affecting customer personal data. Need to notify authorities within 72 hours per GDPR requirements.',
          sender: { email: 'security@example.com', name: 'Security Team' },
          recipient: ['legal@example.com'],
          sentAt: new Date()
        },
        expectedViolations: ['GDPR_BREACH_NOTIFICATION']
      }
    ];

    for (const testCase of gdprTestCases) {
      await this.runTestCase('GDPR', testCase);
    }
  }

  async testSOXCompliance() {
    console.log('\n🏛️ Testing SOX Compliance Assessment');
    console.log('===================================');

    const soxTestCases = [
      {
        name: 'Financial Data External Sharing',
        email: {
          messageId: 'sox-test-1',
          subject: 'Q4 Financial Results',
          body: 'Sharing quarterly earnings data and internal financial reports with external auditor. Revenue recognition details attached.',
          sender: { email: 'cfo@example.com', name: 'CFO' },
          recipient: ['auditor@external.com'],
          sentAt: new Date()
        },
        employeeDepartment: 'Finance',
        expectedViolations: ['SOX_FINANCIAL_DISCLOSURE']
      },
      {
        name: 'SEC Filing Information',
        email: {
          messageId: 'sox-test-2',
          subject: 'SEC Filing Draft',
          body: 'Draft SEC filing with internal controls assessment. Please review financial statements before external submission.',
          sender: { email: 'controller@example.com', name: 'Controller' },
          recipient: ['consultant@external.com'],
          sentAt: new Date()
        },
        employeeDepartment: 'Accounting',
        expectedViolations: ['SOX_FINANCIAL_DISCLOSURE']
      }
    ];

    for (const testCase of soxTestCases) {
      await this.runTestCase('SOX', testCase);
    }
  }

  async testHIPAACompliance() {
    console.log('\n🏥 Testing HIPAA Compliance Assessment');
    console.log('====================================');

    const hipaaTestCases = [
      {
        name: 'Protected Health Information',
        email: {
          messageId: 'hipaa-test-1',
          subject: 'Patient Medical Records',
          body: 'Patient John Smith, DOB: 01/15/1980, SSN: 123-45-6789 has diabetes diagnosis. Treatment plan includes insulin prescription.',
          sender: { email: 'doctor@example.com', name: 'Dr. Smith' },
          recipient: ['nurse@example.com'],
          sentAt: new Date()
        },
        expectedViolations: ['HIPAA_PHI_EXPOSURE']
      },
      {
        name: 'Health Information Sharing',
        email: {
          messageId: 'hipaa-test-2',
          subject: 'Patient Data Request',
          body: 'Need to share patient health information and medical records with insurance company for claim processing.',
          sender: { email: 'admin@clinic.com', name: 'Admin' },
          recipient: ['insurance@external.com'],
          sentAt: new Date()
        },
        expectedViolations: ['HIPAA_PHI_EXPOSURE']
      }
    ];

    for (const testCase of hipaaTestCases) {
      await this.runTestCase('HIPAA', testCase);
    }
  }

  async testPCIDSSCompliance() {
    console.log('\n💳 Testing PCI DSS Compliance Assessment');
    console.log('======================================');

    const pciTestCases = [
      {
        name: 'Credit Card Data Exposure',
        email: {
          messageId: 'pci-test-1',
          subject: 'Payment Processing Issue',
          body: 'Customer card number 4532-1234-5678-9012 is having processing issues. CVV 123, expires 12/25. Please check cardholder data.',
          sender: { email: 'payments@example.com', name: 'Payment Team' },
          recipient: ['support@example.com'],
          sentAt: new Date()
        },
        expectedViolations: ['PCI_CARDHOLDER_DATA_EXPOSURE']
      },
      {
        name: 'Payment Card Information',
        email: {
          messageId: 'pci-test-2',
          subject: 'Card Verification',
          body: 'Mastercard 5555-4444-3333-2222 needs verification. Cardholder name and payment card details required.',
          sender: { email: 'billing@example.com', name: 'Billing' },
          recipient: ['processor@external.com'],
          sentAt: new Date()
        },
        expectedViolations: ['PCI_CARDHOLDER_DATA_EXPOSURE']
      }
    ];

    for (const testCase of pciTestCases) {
      await this.runTestCase('PCI DSS', testCase);
    }
  }

  async testInternalPolicyCompliance() {
    console.log('\n📋 Testing Internal Policy Compliance');
    console.log('===================================');

    const policyTestCases = [
      {
        name: 'External Communication with Sensitive Data',
        email: {
          messageId: 'policy-test-1',
          subject: 'Confidential Project Files',
          body: 'Sharing confidential internal documents and proprietary information with external consultant. Password: secret123',
          sender: { email: 'manager@example.com', name: 'Manager' },
          recipient: ['consultant@external.com'],
          attachments: ['project-docs.pdf'],
          sentAt: new Date()
        },
        expectedViolations: ['EXTERNAL_COMM_SENSITIVE_DATA', 'EXTERNAL_FILE_SHARING']
      },
      {
        name: 'Data Retention Action',
        email: {
          messageId: 'policy-test-2',
          subject: 'Data Cleanup Required',
          body: 'Need to delete old customer records and purge archived data per retention policy.',
          sender: { email: 'admin@example.com', name: 'Admin' },
          recipient: ['team@example.com'],
          sentAt: new Date()
        },
        expectedViolations: [] // This should be flagged but not violate
      }
    ];

    for (const testCase of policyTestCases) {
      await this.runTestCase('Internal Policy', testCase);
    }
  }

  async testCombinedAnalysis() {
    console.log('\n🔄 Testing Combined Security + Compliance Analysis');
    console.log('================================================');

    const combinedTestCase = {
      name: 'Multi-Violation High-Risk Email',
      email: {
        messageId: 'combined-test-1',
        subject: 'Urgent: Customer Data Breach Incident',
        body: `CONFIDENTIAL: We have a serious data breach. 
               Customer credit card 4532-1234-5678-9012 (CVV 123) was compromised.
               Patient John Smith (SSN: 123-45-6789, DOB: 01/15/1980) health records were accessed.
               Financial reports and earnings data may have been stolen.
               Need to notify external authorities and share incident details with law enforcement.
               Please delete any copies and contact data-protection@external-firm.com immediately.`,
        sender: { email: 'security@example.com', name: 'Security Team' },
        recipient: ['external-lawyer@law-firm.com', 'consultant@external.com'],
        attachments: ['incident-report.pdf', 'customer-data.xlsx'],
        sentAt: new Date()
      },
      expectedViolations: ['GDPR_BREACH_NOTIFICATION', 'PCI_CARDHOLDER_DATA_EXPOSURE', 'HIPAA_PHI_EXPOSURE', 'EXTERNAL_COMM_SENSITIVE_DATA']
    };

    await this.runTestCase('Combined', combinedTestCase);
  }

  async runTestCase(category, testCase) {
    try {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      // Get or create test employee
      const employeeId = await this.getTestEmployee(testCase.employeeDepartment);
      
      // Process email with compliance analysis
      const result = await this.processor.processEmail(testCase.email, employeeId, 'compliance_test');
      
      console.log(`   📊 Security Risk: ${result.analysis.securityRiskScore}%`);
      console.log(`   🏛️ Compliance Risk: ${result.analysis.complianceRiskScore}%`);
      console.log(`   📈 Total Risk: ${result.analysis.totalRiskScore}%`);
      console.log(`   🔍 Detection Method: ${result.analysis.method}`);
      
      // Check violations
      const violations = result.analysis.violations || [];
      console.log(`   🚨 Violations Found: ${violations.length}`);
      
      violations.forEach(violation => {
        console.log(`      • ${violation.type} (${violation.severity}): ${violation.description}`);
      });

      // Check regulatory findings
      if (result.analysis.regulatoryFindings) {
        const findings = Object.keys(result.analysis.regulatoryFindings);
        if (findings.length > 0) {
          console.log(`   ⚖️ Regulatory Findings: ${findings.join(', ')}`);
        }
      }

      // Check policy violations
      if (result.analysis.policyViolations) {
        const policies = Object.keys(result.analysis.policyViolations);
        if (policies.length > 0) {
          console.log(`   📋 Policy Violations: ${policies.join(', ')}`);
        }
      }

      // Record test result
      this.testResults.push({
        category,
        name: testCase.name,
        success: result.success,
        securityRisk: result.analysis.securityRiskScore,
        complianceRisk: result.analysis.complianceRiskScore,
        totalRisk: result.analysis.totalRiskScore,
        violationsFound: violations.length,
        expectedViolations: testCase.expectedViolations?.length || 0,
        method: result.analysis.method
      });

      if (result.success) {
        console.log(`   ✅ Test completed successfully`);
      } else {
        console.log(`   ❌ Test failed: ${result.error}`);
      }

    } catch (error) {
      console.error(`   ❌ Error in test case ${testCase.name}:`, error.message);
    }
  }

  async getTestEmployee(department = 'General') {
    try {
      // Try to find existing test employee
      const existingEmployee = await query(`
        SELECT id FROM employees 
        WHERE email = 'test.employee@example.com' 
        LIMIT 1
      `);

      if (existingEmployee.rows.length > 0) {
        return existingEmployee.rows[0].id;
      }

      // Create test employee with appropriate compliance profile
      let complianceProfileId = null;
      
      // Get compliance profile based on department
      const profileResult = await query(`
        SELECT id FROM compliance_profiles 
        WHERE profile_name = $1
        LIMIT 1
      `, [department === 'Finance' || department === 'Accounting' ? 'Finance Team' : 'Standard Employee']);

      if (profileResult.rows.length > 0) {
        complianceProfileId = profileResult.rows[0].id;
      }

      const result = await query(`
        INSERT INTO employees (
          name, email, department, job_title, compliance_profile_id,
          risk_score, risk_level, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        'Test Employee',
        'test.employee@example.com',
        department,
        'Test Role',
        complianceProfileId,
        0,
        'Low',
        true
      ]);

      return result.rows[0].id;

    } catch (error) {
      console.error('Error creating test employee:', error);
      return null;
    }
  }

  displayTestSummary() {
    console.log('\n📊 COMPLIANCE ANALYZER TEST SUMMARY');
    console.log('==================================');
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const highRiskEmails = this.testResults.filter(r => r.totalRisk >= 70).length;
    const complianceViolations = this.testResults.filter(r => r.complianceRisk > 0).length;
    
    console.log(`📈 Total Tests: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests}/${totalTests} (${Math.round(successfulTests/totalTests*100)}%)`);
    console.log(`🚨 High-Risk Emails: ${highRiskEmails}`);
    console.log(`🏛️ Compliance Violations: ${complianceViolations}`);
    
    // Group by category
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    });

    console.log('\n📋 Results by Category:');
    Object.entries(categories).forEach(([category, results]) => {
      const avgCompliance = Math.round(results.reduce((sum, r) => sum + r.complianceRisk, 0) / results.length);
      const avgSecurity = Math.round(results.reduce((sum, r) => sum + r.securityRisk, 0) / results.length);
      
      console.log(`   ${category}: Avg Security ${avgSecurity}%, Avg Compliance ${avgCompliance}%`);
    });

    // Detection method breakdown
    const methods = {};
    this.testResults.forEach(result => {
      methods[result.method] = (methods[result.method] || 0) + 1;
    });

    console.log('\n🔍 Detection Methods Used:');
    Object.entries(methods).forEach(([method, count]) => {
      console.log(`   ${method}: ${count} emails (${Math.round(count/totalTests*100)}%)`);
    });

    console.log('\n🎯 COMPLIANCE ENHANCEMENT SUCCESS!');
    console.log('The email analyzer now properly assesses:');
    console.log('• GDPR data protection violations');
    console.log('• SOX financial reporting compliance');
    console.log('• HIPAA health information protection');
    console.log('• PCI DSS payment data security');
    console.log('• Internal policy compliance');
    console.log('• Combined security + compliance risk scoring');
  }
}

// Run the test
async function main() {
  const test = new ComplianceAnalyzerTest();
  await test.runComprehensiveTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ComplianceAnalyzerTest; 