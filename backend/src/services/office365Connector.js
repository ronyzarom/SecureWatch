const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');
const OptimizedEmailProcessor = require('./optimizedEmailProcessor');
const { syncComplianceAnalyzer } = require('./syncComplianceAnalyzer');

/**
 * Office 365 Email Connector Service
 * 
 * This service connects to Office 365 via Microsoft Graph API to:
 * - Authenticate with Office 365
 * - Retrieve emails from all users
 * - Process emails with AI for risk analysis
 * - Store processed emails in database
 * - Extract violations and security insights
 * - Assign compliance profiles and track regulatory status
 */
class Office365Connector {
  constructor() {
    this.msalClient = null;
    this.graphClient = null;
    this.accessToken = null;
    this.isConfigured = false;
    this.config = null;
    this.complianceEnabled = false;
    this.optimizedProcessor = new OptimizedEmailProcessor();
  }

  /**
   * Initialize Office 365 connection with app registration details
   */
  async initialize(config) {
    try {
      this.config = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tenantId: config.tenantId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`
      };

      // Create MSAL instance for authentication
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          authority: this.config.authority
        }
      });

      console.log('✅ Office 365 Connector initialized');
      this.isConfigured = true;
      return true;

    } catch (error) {
      console.error('❌ Error initializing Office 365 Connector:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Authenticate with Office 365 using client credentials flow
   */
  async authenticate() {
    if (!this.isConfigured) {
      throw new Error('Office 365 Connector not configured');
    }

    try {
      console.log('🔐 Authenticating with Office 365...');

      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default']
      };

      const response = await this.msalClient.acquireTokenSilent(clientCredentialRequest);
      this.accessToken = response.accessToken;

      // Initialize Graph client
      this.graphClient = Client.init({
        authProvider: async (done) => {
          done(null, this.accessToken);
        }
      });

      console.log('✅ Successfully authenticated with Office 365');
      return true;

    } catch (error) {
      console.error('❌ Office 365 authentication failed:', error);
      
      // Try fresh token acquisition
      try {
        const clientCredentialRequest = {
          scopes: ['https://graph.microsoft.com/.default']
        };

        const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
        this.accessToken = response.accessToken;

        this.graphClient = Client.init({
          authProvider: async (done) => {
            done(null, this.accessToken);
          }
        });

        console.log('✅ Successfully acquired new Office 365 token');
        return true;

      } catch (freshError) {
        console.error('❌ Failed to acquire fresh Office 365 token:', freshError);
        return false;
      }
    }
  }

  /**
   * Get all users in the organization
   */
  async getAllUsers() {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      console.log('👥 Fetching all users from Office 365...');

      const users = await this.graphClient
        .api('/users')
        .select('id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled,userType')
        .get();

      console.log(`✅ Retrieved ${users.value.length} users from Office 365`);
      return users.value;

    } catch (error) {
      console.error('❌ Error fetching users from Office 365:', error);
      throw error;
    }
  }

  /**
   * Get user profile photos
   */
  async getUserPhoto(userId) {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const photo = await this.graphClient
        .api(`/users/${userId}/photo/$value`)
        .get();

      return photo;

    } catch (error) {
      console.error(`❌ Error fetching photo for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Generate avatar URL for user - only real photos, no fallbacks
   */
  async generateAvatarUrl(user) {
    const email = user.mail || user.userPrincipalName;
    const name = user.displayName || email.split('@')[0];
    
    // Create consistent filename for local storage
    const crypto = require('crypto');
    const emailHash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    const filename = `${emailHash}.jpg`;
    const path = require('path');
    const filepath = path.join(__dirname, '../../public/avatars', filename);
    
    // Check if avatar already exists locally
    const fs = require('fs');
    if (fs.existsSync(filepath)) {
      console.log(`✅ Using existing real photo for ${name}: ${filename}`);
      return `/api/integrations/avatars/${filename}`;
    }
    
    try {
      // Try to get real Office 365 profile photo
      const photo = await this.getUserPhoto(user.id);
      if (photo) {
        // Save the real photo to local filesystem
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Save the photo
        fs.writeFileSync(filepath, photo);
        
        console.log(`✅ Saved real Office 365 photo for ${name}: ${filename}`);
        return `/api/integrations/avatars/${filename}`;
      }
    } catch (error) {
      console.log(`ℹ️ No real photo available for ${name} in Office 365`);
    }

    // No real photo available - return null and let frontend handle colored initials
    console.log(`📝 No photo for ${name} - frontend will show colored initials`);
    return null;
  }

  /**
   * Get emails for a specific user from a specific folder
   */
  async getUserEmails(userId, options = {}) {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const {
        top = 50,           // Number of emails to retrieve
        skip = 0,           // Number of emails to skip
        fromDate = null,    // Start date for email retrieval
        toDate = null,      // End date for email retrieval
        folder = 'inbox'    // 'inbox' or 'sentitems'
      } = options;

      console.log(`📧 Fetching emails for user ${userId} from ${folder}...`);

      // Determine API endpoint based on folder
      let apiUrl;
      if (folder === 'sentitems' || folder === 'sent') {
        apiUrl = `/users/${userId}/mailFolders/sentitems/messages`;
      } else {
        apiUrl = `/users/${userId}/messages`;
      }

      let filters = [];

      if (fromDate) {
        filters.push(`receivedDateTime ge ${fromDate.toISOString()}`);
      }

      if (toDate) {
        filters.push(`receivedDateTime le ${toDate.toISOString()}`);
      }

      if (filters.length > 0) {
        apiUrl += `?$filter=${filters.join(' and ')}`;
      }

      const emails = await this.graphClient
        .api(apiUrl)
        .select('id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments,attachments,internetMessageId')
        .top(top)
        .skip(skip)
        .orderby('receivedDateTime desc')
        .get();

      console.log(`✅ Retrieved ${emails.value.length} emails for user ${userId} from ${folder}`);
      return emails.value.map(email => ({ ...email, _folder: folder }));

    } catch (error) {
      console.error(`❌ Error fetching emails for user ${userId} from ${folder}:`, error);
      throw error;
    }
  }

  /**
   * Get email attachments
   */
  async getEmailAttachments(userId, messageId) {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const attachments = await this.graphClient
        .api(`/users/${userId}/messages/${messageId}/attachments`)
        .get();

      return attachments.value;

    } catch (error) {
      console.error(`❌ Error fetching attachments for email ${messageId}:`, error);
      return [];
    }
  }

  /**
   * Process and analyze a single email - ADVANCED VERSION with direction awareness
   * Uses OptimizedEmailProcessor for automatic violation creation and policy evaluation
   */
  async processEmail(email, user, userId, messageType = 'received') {
    try {
      // Determine sender and recipients based on message direction
      let senderEmail, senderName, recipients;
      let messageDirection;
      
      if (messageType === 'sent') {
        // For sent emails: user is sender, recipients are in TO field
        senderEmail = user.mail;
        senderName = user.displayName;
        recipients = this.extractRecipients(email);
        messageDirection = 'outbound';
      } else {
        // For received emails: sender is in FROM field, user is recipient
        senderEmail = email.from?.emailAddress?.address || 'unknown@unknown.com';
        senderName = email.from?.emailAddress?.name || 'Unknown';
        recipients = [{ email: user.mail, name: user.displayName }];
        messageDirection = 'inbound';
      }

      // Extract email data with direction awareness
      const emailData = {
        messageId: email.internetMessageId || email.id,
        subject: email.subject || '',
        bodyText: email.body?.content || email.bodyPreview || '',
        bodyHtml: email.body?.contentType === 'html' ? email.body.content : null,
        sender: {
          email: senderEmail,
          name: senderName
        },
        recipients: recipients,
        sentAt: new Date(email.sentDateTime || email.receivedDateTime),
        hasAttachments: email.hasAttachments || false,
        attachments: [],
        messageType: messageType,
        messageDirection: messageDirection,
        userEmail: user.mail // Office365 account owner
      };

      // Get attachments if they exist
      if (emailData.hasAttachments) {
        try {
          const attachments = await this.getEmailAttachments(userId, email.id);
          emailData.attachments = attachments.map(att => ({
            filename: att.name,
            size: att.size,
            type: att.contentType
          }));
        } catch (attachError) {
          console.warn(`⚠️ Could not fetch attachments for email ${email.id}:`, attachError.message);
        }
      }

      // Find employee in database
      const employeeResult = await query(`
        SELECT id, name, department 
        FROM employees 
        WHERE email = $1
      `, [emailData.sender.email]);

      let employeeId = null;
      if (employeeResult.rows.length > 0) {
        employeeId = employeeResult.rows[0].id;
        console.log(`👤 Found employee: ${employeeResult.rows[0].name} (${emailData.sender.email})`);
      } else {
        console.warn(`⚠️ Employee not found for email: ${emailData.sender.email}`);
      }

      // 🚀 ADVANCED: Use OptimizedEmailProcessor (same as Gmail) - handles all violation types automatically
      const result = await this.optimizedProcessor.processEmail(emailData, employeeId, 'office365');

      // Queue employee for AI compliance analysis (sync-triggered)
      if (employeeId && result.success) {
        await syncComplianceAnalyzer.queueEmployeeForAnalysis(employeeId, 'office365_email_sync');
      }

      return result;

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      return {
        success: false,
        emailId: email.id,
        error: error.message,
        optimized: true
      };
    }
  }

  /**
   * Extract recipients from email
   */
  extractRecipients(email) {
    const recipients = [];

    // To recipients
    if (email.toRecipients) {
      email.toRecipients.forEach(recipient => {
        recipients.push({
          email: recipient.emailAddress.address,
          name: recipient.emailAddress.name,
          type: 'to'
        });
      });
    }

    // CC recipients
    if (email.ccRecipients) {
      email.ccRecipients.forEach(recipient => {
        recipients.push({
          email: recipient.emailAddress.address,
          name: recipient.emailAddress.name,
          type: 'cc'
        });
      });
    }

    // BCC recipients
    if (email.bccRecipients) {
      email.bccRecipients.forEach(recipient => {
        recipients.push({
          email: recipient.emailAddress.address,
          name: recipient.emailAddress.name,
          type: 'bcc'
        });
      });
    }

    return recipients;
  }

  /**
   * Store processed email in database
   */
  async storeEmailInDatabase(emailData, analysis, employeeId) {
    try {
      // Check if email already exists
      const existingEmail = await query(`
        SELECT id FROM email_communications 
        WHERE message_id = $1
      `, [emailData.messageId]);

      if (existingEmail.rows.length > 0) {
        console.log(`📧 Email ${emailData.messageId} already exists, skipping...`);
        return;
      }

      // Determine risk category
      let category = 'internal';
      if (analysis.riskScore >= 80) category = 'policy_violation';
      else if (analysis.riskScore >= 60) category = 'suspicious';
      else if (analysis.riskFactors.some(f => f.includes('external'))) category = 'external';

      // Store email
      await query(`
        INSERT INTO email_communications (
          message_id, integration_source, sender_employee_id, sender_email,
          recipients, subject, body_text, body_html, attachments,
          sent_at, risk_score, risk_flags, category, is_flagged, 
          is_analyzed, analyzed_at, analyzer_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        emailData.messageId,
        'office365',
        employeeId,
        emailData.sender.email,
        JSON.stringify(emailData.recipients),
        emailData.subject,
        emailData.bodyText,
        emailData.bodyHtml,
        JSON.stringify(emailData.attachments),
        emailData.sentAt,
        analysis.riskScore, // Already validated by emailRiskAnalyzer
        JSON.stringify({
          ai_analysis: {
            riskFactors: analysis.riskFactors,
            patterns: analysis.patterns,
            confidence: analysis.confidence,
            recommendations: analysis.recommendations
          }
        }),
        category,
        analysis.riskScore >= 60,
        true,
        new Date(),
        '1.0.0'
      ]);

      console.log(`✅ Stored email ${emailData.messageId} in database`);

    } catch (error) {
      console.error('❌ Error storing email in database:', error);
      throw error;
    }
  }

  /**
   * Sync emails for all users - BOTH INBOX AND SENT (DEFAULT)
   */
  async syncAllUserEmails(options = {}) {
    try {
      const {
        daysBack = 7,       // How many days back to sync
        maxEmailsPerUser = 100,
        batchSize = 10,     // Process users in batches
        syncSentEmails = true
      } = options;

      console.log('🔄 Starting Office 365 email sync for all users...');
      console.log(`📧 Syncing: ${syncSentEmails ? 'INBOX + SENT' : 'INBOX only'} emails`);

      // Get all users
      const users = await this.getAllUsers();
      const results = {
        totalUsers: users.length,
        processedUsers: 0,
        totalEmails: 0,
        processedEmails: 0,
        receivedEmails: 0,
        sentEmails: 0,
        errors: [],
        violations: 0
      };

      // Calculate date range
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      // Process users in batches
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            console.log(`👤 Processing emails for ${user.displayName} (${user.mail})`);

            // 📥 Get RECEIVED emails (inbox)
            const inboxEmails = await this.getUserEmails(user.id, {
              top: Math.floor(maxEmailsPerUser / (syncSentEmails ? 2 : 1)),
              fromDate: fromDate,
              folder: 'inbox'
            });

            // 📤 Get SENT emails if enabled
            let sentEmails = [];
            if (syncSentEmails) {
              sentEmails = await this.getUserEmails(user.id, {
                top: Math.floor(maxEmailsPerUser / 2),
                fromDate: fromDate,
                folder: 'sentitems'
              });
            }

            const allEmails = [...inboxEmails, ...sentEmails];
            results.totalEmails += allEmails.length;
            results.receivedEmails += inboxEmails.length;
            results.sentEmails += sentEmails.length;

            console.log(`📧 Found ${inboxEmails.length} inbox + ${sentEmails.length} sent = ${allEmails.length} total emails for ${user.mail}`);

            // Process each email
            for (const email of allEmails) {
              // Determine message type based on folder
              const messageType = email._folder === 'sentitems' ? 'sent' : 'received';
              
              const result = await this.processEmail(email, user, user.id, messageType);
              
              if (result.success) {
                results.processedEmails++;
                if (result.violationsFound > 0) {
                  results.violations++;
                }
              } else {
                results.errors.push({
                  user: user.mail,
                  emailId: result.emailId,
                  error: result.error
                });
              }
            }

            results.processedUsers++;
            console.log(`✅ Completed ${user.displayName}: ${allEmails.length} emails processed (${inboxEmails.length} received, ${sentEmails.length} sent)`);

          } catch (userError) {
            console.error(`❌ Error processing user ${user.mail}:`, userError);
            results.errors.push({
              user: user.mail,
              error: userError.message
            });
          }
        }));

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('🎉 Office 365 email sync completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Error during email sync:', error);
      throw error;
    }
  }

  /**
   * Test connection to Office 365
   */
  async testConnection() {
    try {
      await this.authenticate();
      
      // Try to get a few users to test the connection
      const testUsers = await this.graphClient
        .api('/users')
        .select('id,displayName,mail')
        .top(5)
        .get();

      return {
        success: true,
        message: 'Office 365 connection successful',
        usersFound: testUsers.value.length
      };

    } catch (error) {
      return {
        success: false,
        message: 'Office 365 connection failed',
        error: error.message
      };
    }
  }

  /**
   * Get the configured company domain for filtering employees
   */
  async getCompanyDomain() {
    try {
      // First, check if domain is configured in Office 365 settings
      const configResult = await query(
        'SELECT value FROM app_settings WHERE key = $1',
        ['office365_config']
      );

      if (configResult.rows.length > 0) {
        const config = JSON.parse(configResult.rows[0].value);
        if (config.companyDomain) {
          console.log(`📋 Using configured company domain: ${config.companyDomain}`);
          return config.companyDomain;
        }
      }

      // Auto-detect domain from existing employees
      const domainResult = await query(`
        SELECT 
          SUBSTRING(email FROM '@(.*)$') as domain,
          COUNT(*) as count
        FROM employees 
        WHERE email LIKE '%@%'
        GROUP BY SUBSTRING(email FROM '@(.*)$')
        ORDER BY count DESC
        LIMIT 1
      `);

      if (domainResult.rows.length > 0) {
        const domain = domainResult.rows[0].domain;
        console.log(`🔍 Auto-detected company domain: ${domain} (${domainResult.rows[0].count} employees)`);
        return domain;
      }

      // Fallback: extract from tenant info or use default
      console.log('⚠️  No domain configured or detected, using cyfox.com as default');
      return 'cyfox.com';

    } catch (error) {
      console.error('❌ Error getting company domain:', error);
      return 'cyfox.com'; // Safe fallback
    }
  }

  /**
   * Filter users to only include employees from the company domain
   */
  async filterEmployeesByDomain(users) {
    const companyDomain = await this.getCompanyDomain();
    console.log(`🔍 Filtering users for company domain: ${companyDomain}`);

    const filtered = users.filter(user => {
      const email = user.mail || user.userPrincipalName;
      const name = user.displayName || '';
      
      // Skip if no email
      if (!email) {
        console.log(`❌ Skipping user with no email: ${name}`);
        return false;
      }

      // Skip if account is disabled
      if (user.accountEnabled === false) {
        console.log(`❌ Skipping disabled account: ${name} (${email})`);
        return false;
      }

      // Skip if user type indicates non-employee (guest, etc.)
      if (user.userType && user.userType.toLowerCase() !== 'member') {
        console.log(`❌ Skipping non-member user: ${name} (${email}) - Type: ${user.userType}`);
        return false;
      }

      // Main filter: Only include users from company domain
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (emailDomain !== companyDomain.toLowerCase()) {
        console.log(`❌ Skipping external domain user: ${name} (${email}) - Domain: ${emailDomain}`);
        return false;
      }

      // Additional quality filters for company domain users
      
      // Skip obvious service accounts (even within company domain)
      const emailLocalPart = email.split('@')[0].toLowerCase();
      const servicePatterns = [
        /^(noreply|donotreply|no-reply|do-not-reply)$/i,
        /^(admin|system|service|api|bot|automated)$/i,
        /^(alerts?|notifications?|reports?)$/i,
        /^(support|help|contact|info)$/i
      ];

      for (const pattern of servicePatterns) {
        if (pattern.test(emailLocalPart)) {
          console.log(`❌ Skipping service account in company domain: ${name} (${email})`);
          return false;
        }
      }

      // Skip if name is clearly not a person
      if (!name || name.length < 2) {
        console.log(`❌ Skipping user with invalid name: ${name} (${email})`);
        return false;
      }

      console.log(`✅ Including company employee: ${name} (${email})`);
      return true;
    });

    console.log(`📊 Domain filtering results:`);
    console.log(`   📥 Total users: ${users.length}`);
    console.log(`   ✅ Company domain (${companyDomain}): ${filtered.length}`);
    console.log(`   🚫 Excluded (external/service): ${users.length - filtered.length}`);
    
    return filtered;
  }

  /**
   * Sync Office 365 users to employees table
   */
  async syncUsersToEmployees() {
    try {
      console.log('👥 Starting Office 365 user sync to employees table...');

      // Get all users from Office 365
      const allOffice365Users = await this.getAllUsers();
      console.log(`📥 Retrieved ${allOffice365Users.length} total users from Office 365`);

      // Filter to only include real employees
      const office365Users = await this.filterEmployeesByDomain(allOffice365Users);
      
      const results = {
        totalUsers: allOffice365Users.length,
        filteredUsers: office365Users.length,
        excludedUsers: allOffice365Users.length - office365Users.length,
        newEmployees: 0,
        updatedEmployees: 0,
        errors: []
      };

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
          const photoUrl = await this.generateAvatarUrl(user);

          // Check if employee already exists
          const existingEmployee = await query(
            'SELECT id FROM employees WHERE email = $1',
            [email]
          );

          if (existingEmployee.rows.length > 0) {
            // Update existing employee
            await query(`
              UPDATE employees 
              SET name = $1, department = $2, job_title = $3, photo_url = $4, updated_at = NOW()
              WHERE email = $5
            `, [name, department, jobTitle, photoUrl, email]);
            
            results.updatedEmployees++;
            console.log(`✅ Updated employee: ${name} (${email}) with avatar`);
          } else {
            // Create new employee
            await query(`
              INSERT INTO employees (name, email, department, job_title, photo_url, risk_score, risk_level, is_active, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, 0, 'Low', true, NOW(), NOW())
            `, [name, email, department, jobTitle, photoUrl]);
            
            results.newEmployees++;
            console.log(`✅ Created employee: ${name} (${email}) with avatar`);
          }

        } catch (userError) {
          console.error(`❌ Error processing user ${user.displayName}:`, userError);
          results.errors.push({
            user: user.displayName,
            error: userError.message
          });
        }
      }

      // Now link existing emails to the synced employees
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

      console.log(`✅ Office 365 user sync completed:
        - Total users: ${results.totalUsers}
        - New employees: ${results.newEmployees}
        - Updated employees: ${results.updatedEmployees}
        - Linked emails: ${results.linkedEmails}
        - Errors: ${results.errors.length}`);

      return results;

    } catch (error) {
      console.error('❌ Error syncing Office 365 users to employees:', error);
      throw error;
    }
  }

  /**
   * Get optimized processing statistics
   */
  getOptimizedStats() {
    return this.optimizedProcessor.getProcessingStats();
  }

  /**
   * Reset optimized processing statistics
   */
  resetOptimizedStats() {
    this.optimizedProcessor.resetStats();
  }
}

module.exports = new Office365Connector(); 