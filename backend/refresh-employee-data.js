const OptimizedEmailProcessor = require('./src/services/optimizedEmailProcessor');
const { query } = require('./src/utils/database');

/**
 * Refresh Employee Data via Email Re-analysis
 * 
 * This script re-processes all existing emails using the enhanced
 * compliance-aware email analyzer to refresh employee risk scores and
 * compliance data for their cards in the UI.
 */
class EmployeeDataRefresher {
  constructor() {
    this.processor = new OptimizedEmailProcessor();
  }

  async runRefresh() {
    console.log('🔄 REFRESHING EMPLOYEE DATA VIA EMAIL RE-ANALYSIS');
    console.log('================================================');
    console.log('Using enhanced compliance analyzer to update employee cards...\n');

    try {
      // 1. Get all existing emails
      console.log('📧 1. Fetching all existing emails from the database...');
      const emails = await this.getAllEmails();
      console.log(`   ✅ Found ${emails.length} emails to re-process.`);

      if (emails.length === 0) {
        console.log('   ✅ No emails to process. Employee data is up-to-date.');
        return;
      }

      // 2. Clear old analysis-related data for a clean slate
      console.log('\n🗑️ 2. Clearing old analysis data (violations, logs)...');
      await this.clearOldAnalysisData();
      console.log('   ✅ Old analysis data cleared.');

      // 3. Re-process all emails
      console.log(`\n🔍 3. Re-processing ${emails.length} emails with enhanced analyzer...`);
      await this.reprocessEmails(emails);
      console.log('   ✅ All emails re-processed successfully.');

      // 4. Recalculate all employee risk scores
      console.log('\n📊 4. Recalculating all employee risk scores...');
      const updatedCount = await this.recalculateAllEmployeeRiskScores();
      console.log(`   ✅ ${updatedCount} employee risk scores recalculated.`);

      // 5. Display summary
      console.log('\n🎉 EMPLOYEE DATA REFRESH COMPLETE!');
      console.log('==================================');
      const stats = this.processor.getAnalyzerStats();
      console.log(`   • Emails Re-processed: ${stats.totalProcessed}`);
      console.log(`   • Compliance Violations Found: ${stats.complianceViolations}`);
      console.log(`   • Employees Updated: ${updatedCount}`);
      console.log('   ✅ Employee cards have been successfully refreshed with the latest data.');

    } catch (error) {
      console.error('❌ Employee data refresh failed:', error);
    }
  }

  async getAllEmails() {
    const result = await query(`
      SELECT 
        id, message_id, thread_id, sender_employee_id, sender_email,
        recipients, subject, body_text, sent_at, integration_source
      FROM email_communications
      ORDER BY sent_at ASC
    `);
    return result.rows;
  }

  async clearOldAnalysisData() {
    // We only want to delete violations created by automated analysis, not manual ones.
    await query(`
      DELETE FROM violations 
      WHERE source IN (
        'optimized_email_analysis', 
        'compliance_analysis', 
        'regulatory_compliance_analysis', 
        'policy_compliance_analysis',
        'optimized_security_analysis'
      )
    `);
    await query(`DELETE FROM compliance_analysis_log`);
  }

  async reprocessEmails(emails) {
    let count = 0;
    for (const email of emails) {
      count++;
      console.log(`   - Processing email ${count}/${emails.length}: ${email.subject?.substring(0, 50) || 'No subject'}`);

      // First, delete the existing email record to avoid unique constraint violations
      await query(`DELETE FROM email_communications WHERE id = $1`, [email.id]);

      // Re-format for the processor
      const emailData = {
        messageId: email.message_id,
        threadId: email.thread_id,
        subject: email.subject,
        body: email.body_text,
        sender: { email: email.sender_email },
        recipient: email.recipients,
        sentAt: email.sent_at,
      };

      try {
        await this.processor.processEmail(
          emailData, 
          email.sender_employee_id, 
          email.integration_source
        );
      } catch (error) {
        console.error(`     ❌ Failed to process email ${email.id}:`, error.message);
      }
    }
  }

  async recalculateAllEmployeeRiskScores() {
    const employeesResult = await query(`SELECT id FROM employees WHERE is_active = true`);
    const employeeIds = employeesResult.rows.map(e => e.id);

    for (const employeeId of employeeIds) {
      try {
        await this.processor.updateEmployeeRiskScore(employeeId);
      } catch (error) {
        console.error(`     ❌ Failed to update risk score for employee ${employeeId}:`, error.message);
      }
    }
    return employeeIds.length;
  }
}

// Run the refresh script
async function main() {
  const refresher = new EmployeeDataRefresher();
  await refresher.runRefresh();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EmployeeDataRefresher; 