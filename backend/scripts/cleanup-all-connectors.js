#!/usr/bin/env node

/**
 * COMPLETE CONNECTOR CLEANUP SCRIPT
 * 
 * This script removes ALL synced data and violations from ALL connectors:
 * - Teams (Microsoft)
 * - Google Workspace
 * - Slack
 * - Office 365
 * 
 * Use this for testing fresh syncs or resetting the system.
 * 
 * Usage: 
 *   node scripts/cleanup-all-connectors.js           # Clean connector data only
 *   node scripts/cleanup-all-connectors.js --nuclear # Clean EVERYTHING (employees, violations, all data)
 */

require('dotenv').config();
const { query } = require('../src/utils/database');

// Check for nuclear option
const isNuclearMode = process.argv.includes('--nuclear');

async function cleanupAllConnectors() {
  try {
    if (isNuclearMode) {
      console.log('💥 NUCLEAR MODE: COMPLETE SYSTEM RESET');
      console.log('======================================');
      console.log('⚠️  This will remove ALL DATA including employees and violations!');
      console.log('======================================\n');
    } else {
      console.log('🧹 COMPLETE CONNECTOR CLEANUP SCRIPT');
      console.log('=====================================');
      console.log('⚠️  This will remove ALL synced data from ALL connectors!');
      console.log('=====================================\n');
    }

    if (isNuclearMode) {
      // ============================================================================
      // NUCLEAR MODE: REMOVE EVERYTHING
      // ============================================================================
      
      // Remove ALL violations
      console.log('🚨 Removing ALL violations...');
      const deleteAllViolations = await query('DELETE FROM violations');
      console.log(`   ✅ Deleted ${deleteAllViolations.rowCount} violations`);
      
      // Remove ALL employees
      console.log('\n👥 Removing ALL employees...');
      const deleteAllEmployees = await query('DELETE FROM employees');
      console.log(`   ✅ Deleted ${deleteAllEmployees.rowCount} employees`);
      
      // Remove ALL email communications
      console.log('\n📨 Removing ALL email communications...');
      const deleteAllEmailComms = await query('DELETE FROM email_communications');
      console.log(`   ✅ Deleted ${deleteAllEmailComms.rowCount} email communications`);
      
      // Remove ALL sync jobs
      console.log('\n🔄 Removing ALL sync jobs...');
      const deleteAllSyncJobs = await query('DELETE FROM sync_jobs');
      console.log(`   ✅ Deleted ${deleteAllSyncJobs.rowCount} sync jobs`);
      
      // Remove ALL messages
      console.log('\n📧 Removing ALL Gmail messages...');
      const deleteAllGmail = await query('DELETE FROM gmail_messages');
      console.log(`   ✅ Deleted ${deleteAllGmail.rowCount} Gmail messages`);
      
      console.log('\n💬 Removing ALL Teams messages...');
      const deleteAllTeams = await query('DELETE FROM teams_messages');
      console.log(`   ✅ Deleted ${deleteAllTeams.rowCount} Teams messages`);
      
      console.log('\n💬 Removing ALL Slack messages...');
      const deleteAllSlack = await query('DELETE FROM slack_messages');
      console.log(`   ✅ Deleted ${deleteAllSlack.rowCount} Slack messages`);
      
    } else {
      // ============================================================================
      // NORMAL MODE: CONNECTOR DATA ONLY
      // ============================================================================

      // ============================================================================
      // 1. CLEAN GOOGLE WORKSPACE DATA
      // ============================================================================
      console.log('🔍 GOOGLE WORKSPACE CLEANUP');
      console.log('----------------------------');
      
      // Remove Google Workspace users
      const deleteGoogleUsersResult = await query(`
        DELETE FROM employees WHERE email LIKE '%@zaromh.com'
      `);
      console.log(`   👥 Deleted ${deleteGoogleUsersResult.rowCount} Google Workspace users`);
      
      // Remove Gmail messages
      const deleteGmailResult = await query('DELETE FROM gmail_messages');
      console.log(`   📧 Deleted ${deleteGmailResult.rowCount} Gmail messages`);
      
      // Remove Google Workspace sync jobs
      const deleteGoogleSyncJobs = await query(`
        DELETE FROM sync_jobs WHERE integration_type = 'google_workspace'
      `);
      console.log(`   🔄 Deleted ${deleteGoogleSyncJobs.rowCount} Google Workspace sync jobs`);

      // ============================================================================
      // 2. CLEAN TEAMS DATA
      // ============================================================================
      console.log('\n💬 MICROSOFT TEAMS CLEANUP');
      console.log('---------------------------');
      
      // Remove Teams messages
      const deleteTeamsMessagesResult = await query('DELETE FROM teams_messages');
      console.log(`   💬 Deleted ${deleteTeamsMessagesResult.rowCount} Teams messages`);
      
      // Remove Teams sync jobs
      const deleteTeamsSyncJobs = await query(`
        DELETE FROM sync_jobs WHERE integration_type = 'teams'
      `);
      console.log(`   🔄 Deleted ${deleteTeamsSyncJobs.rowCount} Teams sync jobs`);

      // ============================================================================
      // 3. CLEAN SLACK DATA
      // ============================================================================
      console.log('\n💬 SLACK CLEANUP');
      console.log('-----------------');
      
      // Remove Slack messages
      const deleteSlackMessagesResult = await query('DELETE FROM slack_messages');
      console.log(`   💬 Deleted ${deleteSlackMessagesResult.rowCount} Slack messages`);
      
      // Remove Slack sync jobs
      const deleteSlackSyncJobs = await query(`
        DELETE FROM sync_jobs WHERE integration_type = 'slack'
      `);
      console.log(`   🔄 Deleted ${deleteSlackSyncJobs.rowCount} Slack sync jobs`);

      // ============================================================================
      // 4. CLEAN OFFICE 365 DATA
      // ============================================================================
      console.log('\n📧 OFFICE 365 CLEANUP');
      console.log('----------------------');
      
      // Remove Office 365 email communications
      const deleteOffice365EmailsResult = await query(`
        DELETE FROM email_communications WHERE integration_source = 'office365'
      `);
      console.log(`   📧 Deleted ${deleteOffice365EmailsResult.rowCount} Office 365 emails`);
      
      // Remove Office 365 sync jobs
      const deleteOffice365SyncJobs = await query(`
        DELETE FROM sync_jobs WHERE integration_type = 'office365'
      `);
      console.log(`   🔄 Deleted ${deleteOffice365SyncJobs.rowCount} Office 365 sync jobs`);

      // ============================================================================
      // 5. CLEAN ALL VIOLATIONS FROM CONNECTORS
      // ============================================================================
      console.log('\n🚨 VIOLATIONS CLEANUP');
      console.log('---------------------');
      
      // Remove all connector-generated violations
      const deleteViolationsResult = await query(`
        DELETE FROM violations 
        WHERE source IN (
          'google_workspace_analysis',
          'teams_analysis', 
          'slack_analysis',
          'office365_analysis',
          'email_analysis'
        )
        OR metadata::text LIKE '%@zaromh.com%'
        OR metadata::text LIKE '%teams%'
        OR metadata::text LIKE '%slack%'
        OR metadata::text LIKE '%office365%'
      `);
      console.log(`   🚨 Deleted ${deleteViolationsResult.rowCount} connector-generated violations`);

      // ============================================================================
      // 6. CLEAN EMAIL COMMUNICATIONS (GENERIC)
      // ============================================================================
      console.log('\n📨 EMAIL COMMUNICATIONS CLEANUP');
      console.log('--------------------------------');
      
      // Check if email_communications table has the columns we expect
      try {
        const emailCommsStructure = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'email_communications'
        `);
        
        const columns = emailCommsStructure.rows.map(row => row.column_name);
        console.log(`   📋 Email communications table columns: ${columns.join(', ')}`);
        
        // Build delete query based on available columns
        let deleteConditions = [];
        
        if (columns.includes('sender_email')) {
          deleteConditions.push("sender_email LIKE '%@zaromh.com'");
        }
        if (columns.includes('integration_source')) {
          deleteConditions.push("integration_source IN ('google_workspace', 'teams', 'slack', 'office365')");
        }
        
        if (deleteConditions.length > 0) {
          const deleteEmailCommsResult = await query(`
            DELETE FROM email_communications 
            WHERE ${deleteConditions.join(' OR ')}
          `);
          console.log(`   📨 Deleted ${deleteEmailCommsResult.rowCount} email communications`);
        } else {
          console.log('   📨 No applicable email communications to delete');
        }
        
      } catch (emailError) {
        console.log(`   ⚠️  Could not clean email_communications: ${emailError.message}`);
      }
    }

    // ============================================================================
    // RESET ALL CONNECTOR CONFIGURATIONS (both modes)
    // ============================================================================
    console.log('\n⚙️ RESETTING ALL CONNECTOR CONFIGURATIONS');
    console.log('------------------------------------------');
    
    // Reset Google Workspace config
    const googleConfigResult = await query('SELECT value FROM app_settings WHERE key = $1', ['google_workspace_config']);
    if (googleConfigResult.rows.length > 0) {
      const config = googleConfigResult.rows[0].value;
      config.lastGmailSync = null;
      config.lastDriveSync = null;
      config.lastUserSync = null;
      config.lastSyncStatus = null;
      config.lastSyncError = null;
      config.totalUsers = 0;
      config.totalMessages = 0;
      
      await query('UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2', 
        [JSON.stringify(config), 'google_workspace_config']);
      
      console.log('   ⚙️  Reset Google Workspace configuration timestamps');
    }

    // Reset Teams config
    const teamsConfigResult = await query('SELECT value FROM app_settings WHERE key = $1', ['teams_config']);
    if (teamsConfigResult.rows.length > 0) {
      const config = teamsConfigResult.rows[0].value;
      config.lastSync = null;
      config.lastSyncStatus = null;
      config.lastSyncError = null;
      config.totalMessages = 0;
      
      await query('UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2', 
        [JSON.stringify(config), 'teams_config']);
      
      console.log('   ⚙️  Reset Teams configuration timestamps');
    }

    // Reset Slack config
    const slackConfigResult = await query('SELECT value FROM app_settings WHERE key = $1', ['slack_config']);
    if (slackConfigResult.rows.length > 0) {
      const config = slackConfigResult.rows[0].value;
      config.lastSync = null;
      config.lastSyncStatus = null;
      config.lastSyncError = null;
      config.totalMessages = 0;
      
      await query('UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2', 
        [JSON.stringify(config), 'slack_config']);
      
      console.log('   ⚙️  Reset Slack configuration timestamps');
    }

    // Reset Office 365 config
    const office365ConfigResult = await query('SELECT value FROM app_settings WHERE key = $1', ['office365_config']);
    if (office365ConfigResult.rows.length > 0) {
      const config = office365ConfigResult.rows[0].value;
      config.lastSync = null;
      config.lastSyncStatus = null;
      config.lastSyncError = null;
      config.totalEmails = 0;
      
      await query('UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2', 
        [JSON.stringify(config), 'office365_config']);
      
      console.log('   ⚙️  Reset Office 365 configuration timestamps');
    }

    // ============================================================================
    // 7. VERIFICATION
    // ============================================================================
    console.log('\n🔍 VERIFICATION - CURRENT DATABASE STATE');
    console.log('=========================================');
    
    // Count remaining data
    const googleUsers = await query("SELECT COUNT(*) as count FROM employees WHERE email LIKE '%@zaromh.com'");
    console.log(`   👥 Google Workspace Users: ${googleUsers.rows[0].count}`);
    
    const gmailMessages = await query('SELECT COUNT(*) as count FROM gmail_messages');
    console.log(`   📧 Gmail Messages: ${gmailMessages.rows[0].count}`);
    
    const teamsMessages = await query('SELECT COUNT(*) as count FROM teams_messages');
    console.log(`   💬 Teams Messages: ${teamsMessages.rows[0].count}`);
    
    const slackMessages = await query('SELECT COUNT(*) as count FROM slack_messages');
    console.log(`   💬 Slack Messages: ${slackMessages.rows[0].count}`);
    
    const totalSyncJobs = await query('SELECT COUNT(*) as count FROM sync_jobs');
    console.log(`   🔄 Total Sync Jobs: ${totalSyncJobs.rows[0].count}`);
    
    const totalViolations = await query('SELECT COUNT(*) as count FROM violations');
    console.log(`   🚨 Total Violations: ${totalViolations.rows[0].count}`);
    
    const totalEmployees = await query('SELECT COUNT(*) as count FROM employees');
    console.log(`   👥 Total Employees: ${totalEmployees.rows[0].count}`);

    // ============================================================================
    // 8. SUMMARY
    // ============================================================================
    if (isNuclearMode) {
      console.log('\n💥 NUCLEAR CLEANUP COMPLETE!');
      console.log('=============================');
      console.log('🗑️  ALL employees removed');
      console.log('🗑️  ALL violations removed');
      console.log('🗑️  ALL messages removed');
      console.log('🗑️  ALL sync jobs removed');
      console.log('🗑️  ALL email communications removed');
      console.log('🔄 ALL connector configs reset');
      console.log('🧪 System is completely empty - ready for fresh testing!');
    } else {
      console.log('\n✅ CLEANUP COMPLETE!');
      console.log('====================');
      console.log('🔄 ALL connector sync timestamps reset to NULL');
      console.log('📊 ALL connector counters reset to 0');
      console.log('🗑️  ALL synced messages and users removed');
      console.log('🚨 ALL connector violations removed');
      console.log('🧪 Ready for fresh connector testing!');
    }
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Go to SecureWatch → Settings → Integrations');
    console.log('   2. Test any connector sync (Teams, Google Workspace, Slack, Office 365)');
    console.log('   3. All syncs will run fresh from the beginning');
    console.log('   4. Check dashboard for new metrics after sync');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERROR during cleanup:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the cleanup
if (isNuclearMode) {
  console.log('💥 Starting NUCLEAR cleanup (removes EVERYTHING)...\n');
} else {
  console.log('🧹 Starting connector cleanup...\n');
}
cleanupAllConnectors(); 