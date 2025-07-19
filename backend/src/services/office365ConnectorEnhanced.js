/**
 * Enhanced Office 365 Connector with Compliance Integration
 * This file extends the base Office 365 connector with compliance features
 */

const office365ComplianceEnhancer = require('./office365ComplianceEnhancer');
const { query } = require('../utils/database');

/**
 * Enhanced syncUsersToEmployees method with compliance features
 * This method replaces the original syncUsersToEmployees in Office365Connector
 */
async function syncUsersToEmployeesWithCompliance(office365Connector) {
  try {
    console.log('👥 Starting enhanced Office 365 user sync with compliance features...');

    // Initialize compliance enhancer
    await office365ComplianceEnhancer.initialize();

    // Get all users from Office 365
    const allOffice365Users = await office365Connector.getAllUsers();
    console.log(`📥 Retrieved ${allOffice365Users.length} total users from Office 365`);

    // Filter to only include real employees
    const office365Users = await office365Connector.filterEmployeesByDomain(allOffice365Users);
    
    const results = {
      totalUsers: allOffice365Users.length,
      filteredUsers: office365Users.length,
      excludedUsers: allOffice365Users.length - office365Users.length,
      newEmployees: 0,
      updatedEmployees: 0,
      complianceEnhanced: 0,
      errors: [],
      complianceProfiles: {}
    };

    console.log(`🔒 Processing ${office365Users.length} users with compliance enhancement...`);

    for (const user of office365Users) {
      try {
        // Skip users without email addresses
        if (!user.mail && !user.userPrincipalName) {
          results.errors.push({
            user: user.displayName,
            error: 'No email address found'
          });
          continue;
        }

        const email = user.mail || user.userPrincipalName;
        const name = user.displayName || email.split('@')[0];
        const department = user.department || 'General';
        const jobTitle = user.jobTitle || 'Employee';

        // Generate avatar URL for the user
        console.log(`🖼️ Generating avatar for ${name}...`);
        const photoUrl = await office365Connector.generateAvatarUrl(user);

        // **NEW: Generate compliance enhancement data**
        console.log(`🔒 Enhancing compliance data for ${name}...`);
        const complianceData = await office365ComplianceEnhancer.enhanceEmployeeWithCompliance(user);

        // Track compliance profile usage
        const profileName = complianceData.complianceProfileId ? 
          (await getProfileName(complianceData.complianceProfileId)) : 'None';
        results.complianceProfiles[profileName] = (results.complianceProfiles[profileName] || 0) + 1;

        // Check if employee already exists
        const existingEmployee = await query(
          'SELECT id FROM employees WHERE email = $1',
          [email]
        );

        if (existingEmployee.rows.length > 0) {
          // **ENHANCED: Update existing employee with compliance data**
          await query(`
            UPDATE employees 
            SET name = $1, 
                department = $2, 
                job_title = $3, 
                photo_url = $4,
                compliance_profile_id = $5,
                regulatory_status = $6,
                data_retention_until = $7,
                compliance_notes = $8,
                last_compliance_review = $9,
                updated_at = NOW()
            WHERE email = $10
          `, [
            name, 
            department, 
            jobTitle, 
            photoUrl,
            complianceData.complianceProfileId,
            complianceData.regulatoryStatus,
            complianceData.dataRetentionUntil,
            complianceData.complianceNotes,
            complianceData.lastComplianceReview,
            email
          ]);
          
          results.updatedEmployees++;
          results.complianceEnhanced++;
          console.log(`✅ Updated employee with compliance: ${name} (${email}) - Profile: ${profileName}`);
        } else {
          // **ENHANCED: Create new employee with compliance data**
          await query(`
            INSERT INTO employees (
              name, email, department, job_title, photo_url, 
              compliance_profile_id, regulatory_status, data_retention_until, 
              compliance_notes, last_compliance_review,
              risk_score, risk_level, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 'Low', true, NOW(), NOW())
          `, [
            name, 
            email, 
            department, 
            jobTitle, 
            photoUrl,
            complianceData.complianceProfileId,
            complianceData.regulatoryStatus,
            complianceData.dataRetentionUntil,
            complianceData.complianceNotes,
            complianceData.lastComplianceReview
          ]);
          
          results.newEmployees++;
          results.complianceEnhanced++;
          console.log(`✅ Created employee with compliance: ${name} (${email}) - Profile: ${profileName}`);
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${user.displayName}:`, userError);
        results.errors.push({
          user: user.displayName,
          error: userError.message
        });
      }
    }

    // Link existing emails to the synced employees
    console.log('🔗 Linking existing emails to synced employees...');
    await query(`
      UPDATE email_communications 
      SET sender_employee_id = employees.id
      FROM employees 
      WHERE email_communications.sender_email = employees.email
      AND email_communications.sender_employee_id IS NULL
    `);

    const linkedEmails = await query(`
      SELECT COUNT(*) as linked_count 
      FROM email_communications 
      WHERE sender_employee_id IS NOT NULL
    `);

    results.linkedEmails = linkedEmails.rows[0].linked_count;

    // **NEW: Generate compliance summary**
    console.log('📊 Generating compliance summary...');
    const complianceSummary = await office365ComplianceEnhancer.generateComplianceSummary();
    results.complianceSummary = complianceSummary;

    console.log(`✅ Enhanced Office 365 user sync with compliance completed:
      - Total users: ${results.totalUsers}
      - Filtered users: ${results.filteredUsers} 
      - New employees: ${results.newEmployees}
      - Updated employees: ${results.updatedEmployees}
      - Compliance enhanced: ${results.complianceEnhanced}
      - Linked emails: ${results.linkedEmails}
      - Errors: ${results.errors.length}
      
      🔒 Compliance Profile Distribution:
      ${Object.entries(results.complianceProfiles)
        .map(([profile, count]) => `      - ${profile}: ${count} employees`)
        .join('\n')}`);

    return results;

  } catch (error) {
    console.error('❌ Error during enhanced Office 365 user sync:', error);
    throw error;
  }
}

/**
 * Helper function to get compliance profile name by ID
 */
async function getProfileName(profileId) {
  if (!profileId) return 'None';
  
  try {
    const result = await query(
      'SELECT profile_name FROM compliance_profiles WHERE id = $1',
      [profileId]
    );
    return result.rows.length > 0 ? result.rows[0].profile_name : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Bulk update existing employees with compliance profiles
 */
async function bulkAddComplianceToExistingEmployees() {
  try {
    console.log('🔄 Adding compliance profiles to existing employees...');
    
    await office365ComplianceEnhancer.initialize();
    const result = await office365ComplianceEnhancer.bulkUpdateComplianceProfiles();
    
    console.log(`✅ Bulk compliance update: ${result.updated} employees updated, ${result.errors} errors`);
    return result;
    
  } catch (error) {
    console.error('❌ Error during bulk compliance update:', error);
    throw error;
  }
}

/**
 * Enhanced Office 365 sync with compliance - main entry point
 */
async function performEnhancedSync(office365Connector, options = {}) {
  try {
    console.log('🚀 Starting comprehensive Office 365 sync with compliance...');
    
    // Perform user sync with compliance
    const userSyncResults = await syncUsersToEmployeesWithCompliance(office365Connector);
    
    // Optionally sync emails if requested
    let emailSyncResults = null;
    if (options.includeEmails) {
      console.log('📧 Including email sync...');
      emailSyncResults = await office365Connector.syncAllUserEmails({
        maxUsers: options.maxUsers || 50,
        maxEmailsPerUser: options.maxEmailsPerUser || 100,
        fromDate: options.fromDate
      });
    }

    // Generate final compliance report
    const complianceSummary = await office365ComplianceEnhancer.generateComplianceSummary();

    const finalResults = {
      userSync: userSyncResults,
      emailSync: emailSyncResults,
      compliance: complianceSummary,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Enhanced Office 365 sync with compliance completed successfully!');
    
    return finalResults;

  } catch (error) {
    console.error('❌ Enhanced Office 365 sync failed:', error);
    throw error;
  }
}

module.exports = {
  syncUsersToEmployeesWithCompliance,
  bulkAddComplianceToExistingEmployees,
  performEnhancedSync
}; 