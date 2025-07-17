const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');

/**
 * Office 365 Email Connector Service
 * 
 * This service connects to Office 365 via Microsoft Graph API to:
 * - Authenticate with Office 365
 * - Retrieve emails from all users
 * - Process emails with AI for risk analysis
 * - Store processed emails in database
 * - Extract violations and security insights
 */
class Office365Connector {
  constructor() {
    this.msalClient = null;
    this.graphClient = null;
    this.accessToken = null;
    this.isConfigured = false;
    this.config = null;
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
        .select('id,displayName,mail,userPrincipalName,department,jobTitle')
        .get();

      console.log(`✅ Retrieved ${users.value.length} users from Office 365`);
      return users.value;

    } catch (error) {
      console.error('❌ Error fetching users from Office 365:', error);
      throw error;
    }
  }

  /**
   * Get emails for a specific user
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
        toDate = null       // End date for email retrieval
      } = options;

      console.log(`📧 Fetching emails for user ${userId}...`);

      let apiUrl = `/users/${userId}/messages`;
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

      console.log(`✅ Retrieved ${emails.value.length} emails for user ${userId}`);
      return emails.value;

    } catch (error) {
      console.error(`❌ Error fetching emails for user ${userId}:`, error);
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
   * Process and analyze a single email
   */
  async processEmail(email, user, userId) {
    try {
      // Extract email data
      const emailData = {
        messageId: email.internetMessageId || email.id,
        subject: email.subject || '',
        bodyText: email.body?.content || email.bodyPreview || '',
        bodyHtml: email.body?.contentType === 'html' ? email.body.content : null,
        sender: {
          email: email.from?.emailAddress?.address || user.mail,
          name: email.from?.emailAddress?.name || user.displayName
        },
        recipients: this.extractRecipients(email),
        sentAt: new Date(email.sentDateTime || email.receivedDateTime),
        hasAttachments: email.hasAttachments || false,
        attachments: []
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
      } else {
        console.warn(`⚠️ Employee not found for email: ${emailData.sender.email}`);
      }

      // Run AI analysis
      console.log(`🤖 Analyzing email: ${emailData.subject}`);
      const analysis = await emailRiskAnalyzer.analyzeEmail({
        id: emailData.messageId,
        subject: emailData.subject,
        bodyText: emailData.bodyText,
        recipients: emailData.recipients,
        attachments: emailData.attachments,
        sentAt: emailData.sentAt,
        sender: {
          employeeId: employeeId,
          email: emailData.sender.email,
          name: emailData.sender.name,
          department: employeeResult.rows[0]?.department
        }
      });

      // Store email in database
      await this.storeEmailInDatabase(emailData, analysis, employeeId);

      // Check for violations and create alerts
      await this.checkForViolations(emailData, analysis, employeeId);

      return {
        success: true,
        emailId: emailData.messageId,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        violationsFound: analysis.riskFactors.length
      };

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
      return {
        success: false,
        emailId: email.id,
        error: error.message
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
        Math.round(analysis.riskScore),
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
      console.error(`❌ Error storing email in database:`, error);
      throw error;
    }
  }

  /**
   * Check for policy violations and create alerts
   */
  async checkForViolations(emailData, analysis, employeeId) {
    try {
      // Create violations for high-risk emails
      if (analysis.riskScore >= 70) {
        const violationType = this.determineViolationType(analysis);
        
        await query(`
          INSERT INTO violations (
            employee_id, type, severity, description, 
            source, metadata, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          employeeId,
          violationType,
          analysis.riskScore >= 90 ? 'Critical' :
          analysis.riskScore >= 80 ? 'High' : 'Medium',
          `Email violation detected: ${emailData.subject}`,
          'email_analysis',
          JSON.stringify({
            emailId: emailData.messageId,
            riskScore: analysis.riskScore,
            riskFactors: analysis.riskFactors,
            recipients: emailData.recipients.length
          }),
          'Active'
        ]);

        console.log(`🚨 Created violation for high-risk email: ${emailData.subject}`);
      }

    } catch (error) {
      console.error(`❌ Error creating violation:`, error);
    }
  }

  /**
   * Determine violation type based on analysis
   */
  determineViolationType(analysis) {
    const factors = analysis.riskFactors.join(' ').toLowerCase();
    
    if (factors.includes('data') || factors.includes('exfiltration')) {
      return 'Data Exfiltration';
    } else if (factors.includes('external') || factors.includes('unauthorized')) {
      return 'Unauthorized Communication';
    } else if (factors.includes('financial') || factors.includes('confidential')) {
      return 'Information Disclosure';
    } else if (factors.includes('policy') || factors.includes('violation')) {
      return 'Policy Violation';
    } else {
      return 'Suspicious Activity';
    }
  }

  /**
   * Sync emails for all users
   */
  async syncAllUserEmails(options = {}) {
    try {
      const {
        daysBack = 7,       // How many days back to sync
        maxEmailsPerUser = 100,
        batchSize = 10      // Process users in batches
      } = options;

      console.log('🔄 Starting Office 365 email sync for all users...');

      // Get all users
      const users = await this.getAllUsers();
      const results = {
        totalUsers: users.length,
        processedUsers: 0,
        totalEmails: 0,
        processedEmails: 0,
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

            // Get user emails
            const emails = await this.getUserEmails(user.id, {
              top: maxEmailsPerUser,
              fromDate: fromDate
            });

            results.totalEmails += emails.length;

            // Process each email
            for (const email of emails) {
              const result = await this.processEmail(email, user, user.id);
              
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
            console.log(`✅ Completed ${user.displayName}: ${emails.length} emails processed`);

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
}

module.exports = new Office365Connector(); 