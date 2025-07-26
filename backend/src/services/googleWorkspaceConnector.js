const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');
const OptimizedEmailProcessor = require('./optimizedEmailProcessor');
const { syncComplianceAnalyzer } = require('./syncComplianceAnalyzer');

/**
 * Google Workspace Connector Service
 * 
 * This service connects to Google Workspace via Google APIs to:
 * - Authenticate with Google Workspace using Service Account
 * - Retrieve Gmail messages from all users
 * - Monitor Google Drive file sharing activities
 * - Process emails and files with AI for risk analysis
 * - Store processed data in database
 * - Extract violations and security insights
 */
class GoogleWorkspaceConnector {
  constructor() {
    this.auth = null;
    this.gmail = null;
    this.drive = null;
    this.admin = null; // Google Admin SDK
    this.isConfigured = false;
    this.config = null;
    this.optimizedProcessor = new OptimizedEmailProcessor();
  }

  /**
   * Initialize Google Workspace connection with Service Account
   */
  async initialize(config) {
    try {
      console.log('🔧 Initializing Google Workspace Connector...');
      
      this.config = {
        serviceAccountEmail: config.serviceAccountEmail,
        serviceAccountKey: config.serviceAccountKey,
        delegatedAdminEmail: config.delegatedAdminEmail, // Admin email for domain-wide delegation
        domain: config.domain // Your organization's domain
      };

      // Parse service account key (JSON string or object)
      let serviceAccountKey;
      if (typeof this.config.serviceAccountKey === 'string') {
        serviceAccountKey = JSON.parse(this.config.serviceAccountKey);
      } else {
        serviceAccountKey = this.config.serviceAccountKey;
      }

      // Create JWT client for service account authentication
      this.auth = new JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/admin.reports.audit.readonly'
        ],
        subject: this.config.delegatedAdminEmail // Impersonate admin for domain-wide access
      });

      console.log('✅ Google Workspace Connector initialized');
      this.isConfigured = true;
      return true;

    } catch (error) {
      console.error('❌ Error initializing Google Workspace Connector:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Authenticate and initialize Google API clients
   */
  async authenticate() {
    if (!this.isConfigured) {
      throw new Error('Google Workspace Connector not configured');
    }

    try {
      console.log('🔐 Authenticating with Google Workspace...');

      // Authorize the JWT client
      await this.auth.authorize();

      // Initialize API clients
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.admin = google.admin({ version: 'directory_v1', auth: this.auth });

      console.log('✅ Successfully authenticated with Google Workspace');
      return true;

    } catch (error) {
      console.error('❌ Google Workspace authentication failed:', error);
      return false;
    }
  }

  /**
   * Test connection to Google Workspace
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Google Workspace connection...');

      if (!this.admin) {
        await this.authenticate();
      }

      // Test by getting a few users from the domain
      const response = await this.admin.users.list({
        domain: this.config.domain,
        maxResults: 5
      });

      const userCount = response.data.users ? response.data.users.length : 0;
      
      console.log(`✅ Google Workspace connection test successful - found ${userCount} users`);
      
      return {
        success: true,
        message: `Successfully connected to Google Workspace. Found ${userCount} users in domain ${this.config.domain}.`,
        usersFound: userCount,
        domain: this.config.domain
      };

    } catch (error) {
      console.error('❌ Google Workspace connection test failed:', error);
      
      return {
        success: false,
        message: `Google Workspace connection test failed: ${error.message}`,
        usersFound: 0
      };
    }
  }

  /**
   * Get all users in the Google Workspace domain
   */
  async getAllUsers() {
    if (!this.admin) {
      await this.authenticate();
    }

    try {
      console.log(`👥 Fetching all users from Google Workspace domain ${this.config.domain}...`);

      const users = [];
      let pageToken = null;

      do {
        const response = await this.admin.users.list({
          domain: this.config.domain,
          maxResults: 500,
          pageToken: pageToken
        });

        if (response.data.users) {
          users.push(...response.data.users);
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      console.log(`✅ Retrieved ${users.length} users from Google Workspace`);
      return users;

    } catch (error) {
      console.error('❌ Error fetching users from Google Workspace:', error);
      throw error;
    }
  }

  /**
   * Get Gmail messages for a specific user from a specific folder/label
   */
  async getUserGmailMessages(userEmail, options = {}) {
    try {
      const { daysBack = 7, maxMessages = 100, folder = 'inbox' } = options;
      const fromDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
      
      // Build query based on folder type
      let query = `after:${Math.floor(fromDate.getTime() / 1000)}`;
      
      if (folder === 'sent') {
        query += ' in:sent';
      } else if (folder === 'inbox') {
        query += ' in:inbox';
      } else {
        query += ` label:${folder}`;
      }

      console.log(`📧 Fetching Gmail messages for ${userEmail} from ${folder} since ${fromDate.toISOString()}...`);

      // Create new auth client impersonating the user
      const userAuth = new JWT({
        email: this.auth.email,
        key: this.auth.key,
        scopes: this.auth.scopes,
        subject: userEmail // Impersonate this user
      });

      await userAuth.authorize();

      const userGmail = google.gmail({ version: 'v1', auth: userAuth });

      // Get message IDs
      const listResponse = await userGmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxMessages
      });

      if (!listResponse.data.messages) {
        console.log(`No messages found for ${userEmail} in ${folder}`);
        return [];
      }

      console.log(`📬 Found ${listResponse.data.messages.length} messages for ${userEmail} in ${folder}`);

      // Get detailed message data (in batches)
      const messages = [];
      const batchSize = 10;

      for (let i = 0; i < listResponse.data.messages.length; i += batchSize) {
        const batch = listResponse.data.messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (message) => {
          try {
            const messageDetail = await userGmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });
            return messageDetail.data;
          } catch (error) {
            console.error(`Error fetching message ${message.id} for ${userEmail}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        messages.push(...batchResults.filter(msg => msg !== null));

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < listResponse.data.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Retrieved ${messages.length} detailed messages for ${userEmail} from ${folder}`);
      return messages;

    } catch (error) {
      console.error(`❌ Error fetching Gmail messages for ${userEmail} from ${folder}:`, error);
      throw error;
    }
  }

  /**
   * Parse Gmail message and determine direction (inbox/sent)
   */
  parseGmailMessage(message, userEmail, messageType = 'received') {
    try {
      const headers = message.payload.headers;
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

      // Extract basic info
      const messageId = message.id;
      const threadId = message.threadId;
      const subject = getHeader('Subject') || '';
      const from = getHeader('From') || '';
      const to = getHeader('To') || '';
      const cc = getHeader('Cc') || '';
      const bcc = getHeader('Bcc') || '';
      const date = getHeader('Date');
      const receivedDate = new Date(parseInt(message.internalDate));

      // Extract body
      let body = '';
      let bodyHtml = '';
      let hasAttachments = false;

      const extractBody = (part) => {
        if (part.body?.data) {
          const decodedData = Buffer.from(part.body.data, 'base64').toString('utf-8');
          if (part.mimeType === 'text/plain') {
            body = decodedData;
          } else if (part.mimeType === 'text/html') {
            bodyHtml = decodedData;
          }
        }

        if (part.parts) {
          part.parts.forEach(extractBody);
        }

        if (part.filename && part.filename.length > 0) {
          hasAttachments = true;
        }
      };

      if (message.payload) {
        extractBody(message.payload);
      }

      // Parse email addresses
      const parseEmail = (emailStr) => {
        const match = emailStr.match(/([^<]+)?<([^>]+)>/) || emailStr.match(/([^<>\s]+@[^<>\s]+)/);
        return {
          name: match && match[1] ? match[1].trim() : '',
          email: match ? (match[2] || match[1]).trim() : emailStr.trim()
        };
      };

      const fromParsed = parseEmail(from);
      const toParsed = to.split(',').map(email => parseEmail(email.trim()));

      // Determine direction and set appropriate fields
      let senderEmail, recipientEmails, messageDirection;
      
      if (messageType === 'sent') {
        // For sent emails: user is sender, recipients are in TO field
        senderEmail = userEmail;
        recipientEmails = toParsed.map(r => r.email);
        messageDirection = 'outbound';
      } else {
        // For received emails: sender is in FROM field, user is recipient
        senderEmail = fromParsed.email;
        recipientEmails = [userEmail];
        messageDirection = 'inbound';
      }

      return {
        messageId,
        threadId,
        subject,
        body,
        bodyHtml,
        senderEmail,
        senderName: messageType === 'sent' ? userEmail : fromParsed.name,
        recipientEmails,
        userEmail, // Gmail account owner
        from: fromParsed,
        to: toParsed,
        cc,
        bcc,
        sentAt: receivedDate,
        hasAttachments,
        messageType, // 'received' or 'sent'
        messageDirection, // 'inbound' or 'outbound'
        rawHeaders: headers
      };

    } catch (error) {
      console.error('Error parsing Gmail message:', error);
      return null;
    }
  }

  /**
   * Process Gmail message for security risks - OPTIMIZED VERSION (like Office 365)
   */
  async processGmailMessage(parsedMessage) {
    try {
      // Convert to format expected by OptimizedEmailProcessor (same as Office 365)
      const emailData = {
        messageId: parsedMessage.messageId,
        subject: parsedMessage.subject || '',
        bodyText: parsedMessage.body || '',
        bodyHtml: parsedMessage.bodyType === 'html' ? parsedMessage.body : null,
        sender: {
          email: parsedMessage.from,
          name: parsedMessage.fromName || parsedMessage.from
        },
        recipients: parsedMessage.recipients || [],
        sentAt: parsedMessage.timestamp,
        hasAttachments: parsedMessage.hasAttachments || false,
        attachments: [] // Gmail attachments would need separate API calls
      };

      // Find employee in database by Gmail account OWNER (not sender)
      const employeeResult = await query(`
        SELECT id, name, department 
        FROM employees 
        WHERE email = $1
      `, [parsedMessage.userEmail]); // ✅ FIXED: Use userEmail instead of from

      let employeeId = null;
      if (employeeResult.rows.length > 0) {
        employeeId = employeeResult.rows[0].id;
        console.log(`👤 Found employee: ${employeeResult.rows[0].name} (${parsedMessage.userEmail})`);
      } else {
        console.warn(`⚠️ Employee not found for Gmail user: ${parsedMessage.userEmail}`);
        // Still process the email even if employee not found
      }

      // 🚀 OPTIMIZED: Use the same advanced processor as Office 365
      const result = await this.optimizedProcessor.processEmail(emailData, employeeId, 'google_workspace');

      return {
        riskScore: result.analysis?.totalRiskScore || result.analysis?.securityRiskScore || 0,
        securityRiskScore: result.analysis?.securityRiskScore || 0,
        complianceRiskScore: result.analysis?.complianceRiskScore || 0,
        category: 'gmail_message',
        isFlagged: result.analysis?.totalRiskScore >= 70,
        analysis: result.analysis,
        violations: result.analysis?.violations || [],
        messageType: 'gmail_message',
        source: 'google_workspace',
        success: result.success,
        violationCreated: result.violationCreated,
        optimized: true
      };

    } catch (error) {
      console.error('❌ Error processing Gmail message:', error);
      return {
        riskScore: 0,
        category: 'unknown',
        isFlagged: false,
        analysis: {
          error: error.message
        },
        success: false
      };
    }
  }

  /**
   * Store Gmail message with direction awareness
   */
  async storeGmailMessage(parsedMessage, riskAnalysis) {
    try {
      // Store in gmail_messages table with direction info
      const result = await query(`
        INSERT INTO gmail_messages (
          message_id, user_email, from_email, to_emails, subject, body, sent_at,
          has_attachments, risk_score, is_flagged, message_type, message_direction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (message_id, user_email) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          is_flagged = EXCLUDED.is_flagged,
          message_type = EXCLUDED.message_type,
          message_direction = EXCLUDED.message_direction
        RETURNING id
      `, [
        parsedMessage.messageId,
        parsedMessage.userEmail,
        parsedMessage.senderEmail,
        JSON.stringify(parsedMessage.recipientEmails),
        parsedMessage.subject,
        parsedMessage.body,
        parsedMessage.sentAt,
        parsedMessage.hasAttachments,
        riskAnalysis.riskScore || 0,
        riskAnalysis.isFlagged || false,
        parsedMessage.messageType,
        parsedMessage.messageDirection
      ]);

      console.log(`📧 Stored Gmail message: ${parsedMessage.subject} (${parsedMessage.messageDirection})`);
      return result.rows[0];

    } catch (error) {
      // Handle duplicate message gracefully
      if (error.code === '23505') {
        console.log(`📧 Message already exists: ${parsedMessage.messageId}`);
        return null;
      }
      console.error('Error storing Gmail message:', error);
      throw error;
    }
  }

  /**
   * Sync Gmail messages for all users - BOTH INBOX AND SENT (DEFAULT)
   */
  async syncAllGmailMessages(options = {}) {
    const { daysBack = 7, maxMessagesPerUser = 100, batchSize = 3, syncSentEmails = true } = options;
    
    try {
      console.log(`🔄 Starting Google Workspace Gmail sync - ${daysBack} days back, max ${maxMessagesPerUser} messages per user...`);
      console.log(`📧 Syncing: ${syncSentEmails ? 'INBOX + SENT' : 'INBOX only'} emails`);

      let totalUsers = 0;
      let totalMessages = 0;
      let processedMessages = 0;
      let flaggedMessages = 0;
      let sentMessages = 0;
      let receivedMessages = 0;

      // Get all users in the domain
      const users = await this.getAllUsers();
      totalUsers = users.length;
      console.log(`📊 Found ${totalUsers} users to process`);

      // 🆕 Sync users to employees table first
      console.log('👥 Syncing users to employees table...');
      const userSyncResults = await this.syncUsersToEmployees();
      console.log(`✅ User sync completed: ${userSyncResults.newEmployees} new, ${userSyncResults.updatedEmployees} updated`);

      // Process users in batches to avoid rate limiting
      for (let i = 0; i < users.length; i += batchSize) {
        const userBatch = users.slice(i, i + batchSize);
        
        await Promise.all(userBatch.map(async (user) => {
          try {
            console.log(`👤 Processing Gmail for user: ${user.primaryEmail}`);

            // 📥 Sync RECEIVED emails (inbox)
            const inboxMessages = await this.getUserGmailMessages(user.primaryEmail, {
              daysBack,
              maxMessages: Math.floor(maxMessagesPerUser / (syncSentEmails ? 2 : 1)),
              folder: 'inbox'
            });

            // 📤 Sync SENT emails if enabled
            let sentEmailMessages = [];
            if (syncSentEmails) {
              sentEmailMessages = await this.getUserGmailMessages(user.primaryEmail, {
                daysBack,
                maxMessages: Math.floor(maxMessagesPerUser / 2),
                folder: 'sent'
              });
            }

            const allMessages = [...inboxMessages, ...sentEmailMessages];
            totalMessages += allMessages.length;
            receivedMessages += inboxMessages.length;
            sentMessages += sentEmailMessages.length;

            console.log(`📧 Found ${inboxMessages.length} inbox + ${sentEmailMessages.length} sent = ${allMessages.length} total messages for ${user.primaryEmail}`);

            // Process each message
            for (const message of allMessages) {
              try {
                // Determine message type based on which batch it came from
                const messageType = inboxMessages.includes(message) ? 'received' : 'sent';
                
                // Parse message with direction awareness
                const parsedMessage = this.parseGmailMessage(message, user.primaryEmail, messageType);
                if (!parsedMessage) continue;

                // Analyze for risks using OptimizedEmailProcessor (violations created automatically)
                const riskAnalysis = await this.processGmailMessage(parsedMessage);
                
                // Store in database with direction info
                await this.storeGmailMessage(parsedMessage, riskAnalysis);
                
                // Note: Violations are now created automatically by OptimizedEmailProcessor
                // No need for separate checkForGmailViolations call
                
                // 🆕 Queue employee for AI compliance analysis (sync-triggered)
                if (parsedMessage.userEmail) {
                  try {
                    // Find employee by Gmail account owner (not sender)
                    const employeeResult = await query(`
                      SELECT id FROM employees WHERE email = $1
                    `, [parsedMessage.userEmail]); // ✅ FIXED: Use userEmail instead of from

                    if (employeeResult.rows.length > 0) {
                      const employeeId = employeeResult.rows[0].id;
                      await syncComplianceAnalyzer.queueEmployeeForAnalysis(employeeId, 'google_workspace_sync');
                    }
                  } catch (employeeError) {
                    console.warn(`⚠️ Could not queue employee for compliance analysis: ${employeeError.message}`);
                  }
                }
                
                processedMessages++;
                
                if (riskAnalysis.isFlagged) {
                  flaggedMessages++;
                }

              } catch (messageError) {
                console.error(`❌ Error processing message ${message.id} for ${user.primaryEmail}:`, messageError);
              }
            }

            console.log(`✅ Completed ${user.primaryEmail}: ${allMessages.length} messages processed (${inboxMessages.length} received, ${sentEmailMessages.length} sent)`);

          } catch (userError) {
            console.error(`❌ Error processing user ${user.primaryEmail}:`, userError);
          }
        }));

        // Log progress
        console.log(`📈 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)}`);
        
        // Delay between batches to respect rate limits
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const summary = {
        totalUsers,
        totalMessages,
        processedMessages,
        flaggedMessages,
        receivedMessages,
        sentMessages,
        syncedUsers: userSyncResults.newEmployees + userSyncResults.updatedEmployees,
        newEmployees: userSyncResults.newEmployees,
        updatedEmployees: userSyncResults.updatedEmployees,
        syncedAt: new Date().toISOString()
      };

      console.log('✅ Google Workspace Gmail sync completed:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Google Workspace Gmail sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync Google Workspace users to employees table
   */
  async syncUsersToEmployees() {
    try {
      console.log('👥 Starting Google Workspace user sync to employees table...');

      // Get all users from Google Workspace
      const googleWorkspaceUsers = await this.getAllUsers();
      
      const results = {
        totalUsers: googleWorkspaceUsers.length,
        newEmployees: 0,
        updatedEmployees: 0,
        errors: []
      };

      for (const user of googleWorkspaceUsers) {
        try {
          const email = user.primaryEmail;
          const name = user.name?.fullName || user.name?.givenName + ' ' + user.name?.familyName || email.split('@')[0];
          const department = user.orgUnitPath || 'General';
          const jobTitle = user.organizations?.[0]?.title || 'Employee';

          if (!email) {
            results.errors.push({
              user: name || user.id,
              error: 'No email address found'
            });
            continue;
          }

          // Check if employee already exists
          const existingEmployee = await query(
            'SELECT id FROM employees WHERE email = $1',
            [email]
          );

          if (existingEmployee.rows.length > 0) {
            // Update existing employee
            await query(`
              UPDATE employees 
              SET name = $1, department = $2, job_title = $3, updated_at = NOW()
              WHERE email = $4
            `, [name, department, jobTitle, email]);
            
            results.updatedEmployees++;
            console.log(`✅ Updated employee: ${name} (${email})`);
          } else {
            // Create new employee
            await query(`
              INSERT INTO employees (name, email, department, job_title, risk_score, risk_level, is_active, created_at, updated_at)
              VALUES ($1, $2, $3, $4, 0, 'Low', true, NOW(), NOW())
            `, [name, email, department, jobTitle]);
            
            results.newEmployees++;
            console.log(`✅ Created employee: ${name} (${email})`);
          }

        } catch (userError) {
          console.error(`❌ Error processing user ${user.primaryEmail}:`, userError);
          results.errors.push({
            user: user.primaryEmail,
            error: userError.message
          });
        }
      }

      console.log('🎉 Google Workspace user sync completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Error during Google Workspace user sync:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GoogleWorkspaceConnector(); 