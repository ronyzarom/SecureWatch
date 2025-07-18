const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');

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
   * Get Gmail messages for a specific user
   */
  async getUserGmailMessages(userEmail, options = {}) {
    try {
      const { daysBack = 7, maxMessages = 100 } = options;
      const fromDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
      const query = `after:${Math.floor(fromDate.getTime() / 1000)}`;

      console.log(`📧 Fetching Gmail messages for ${userEmail} since ${fromDate.toISOString()}...`);

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
        console.log(`No messages found for ${userEmail}`);
        return [];
      }

      console.log(`📬 Found ${listResponse.data.messages.length} messages for ${userEmail}`);

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

      console.log(`✅ Retrieved ${messages.length} detailed messages for ${userEmail}`);
      return messages;

    } catch (error) {
      console.error(`❌ Error fetching Gmail messages for ${userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Parse Gmail message to extract relevant data
   */
  parseGmailMessage(message, userEmail) {
    try {
      const headers = message.payload.headers || [];
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      // Extract message body
      let body = '';
      const extractBody = (payload) => {
        if (payload.body && payload.body.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        if (payload.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
              if (part.body && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
              }
            }
            const nested = extractBody(part);
            if (nested) return nested;
          }
        }
        return '';
      };

      body = extractBody(message.payload);

      // Parse recipients
      const toHeader = getHeader('To');
      const ccHeader = getHeader('Cc');
      const bccHeader = getHeader('Bcc');
      const recipients = [toHeader, ccHeader, bccHeader]
        .filter(r => r)
        .join(', ')
        .split(',')
        .map(r => r.trim())
        .filter(r => r);

      // Check for attachments
      const hasAttachments = message.payload.parts && 
        message.payload.parts.some(part => part.filename && part.filename.length > 0);

      return {
        messageId: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        cc: getHeader('Cc'),
        bcc: getHeader('Bcc'),
        recipients: recipients,
        body: body,
        bodyType: message.payload.mimeType || 'text/plain',
        timestamp: new Date(parseInt(message.internalDate)),
        hasAttachments: hasAttachments,
        attachmentCount: hasAttachments ? message.payload.parts.filter(p => p.filename && p.filename.length > 0).length : 0,
        labels: message.labelIds || [],
        userEmail: userEmail,
        rawData: message
      };

    } catch (error) {
      console.error('❌ Error parsing Gmail message:', error);
      return null;
    }
  }

  /**
   * Process Gmail message for security risks
   */
  async processGmailMessage(parsedMessage) {
    try {
      // Convert to format expected by email risk analyzer
      const emailForAnalysis = {
        subject: parsedMessage.subject || '',
        body: parsedMessage.body || '',
        bodyType: parsedMessage.bodyType,
        from: parsedMessage.from,
        fromEmail: parsedMessage.from,
        recipients: parsedMessage.recipients,
        timestamp: parsedMessage.timestamp.toISOString(),
        messageId: parsedMessage.messageId,
        attachments: [], // Gmail attachments need separate API calls
        hasAttachments: parsedMessage.hasAttachments
      };

      // Use existing email risk analyzer
      const riskAnalysis = await emailRiskAnalyzer.analyzeEmail(emailForAnalysis);

      return {
        ...riskAnalysis,
        messageType: 'gmail_message',
        source: 'google_workspace'
      };

    } catch (error) {
      console.error('❌ Error processing Gmail message:', error);
      return {
        riskScore: 0,
        category: 'unknown',
        isFlagged: false,
        analysis: {
          error: error.message
        }
      };
    }
  }

  /**
   * Store Gmail message in database
   */
  async storeGmailMessage(parsedMessage, riskAnalysis) {
    try {
      const result = await query(`
        INSERT INTO gmail_messages (
          message_id, thread_id, user_email, from_email, to_emails, cc_emails, bcc_emails,
          subject, body, body_type, sent_at, has_attachments, attachment_count,
          risk_score, category, is_flagged, analysis, labels, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (message_id) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          category = EXCLUDED.category,
          is_flagged = EXCLUDED.is_flagged,
          analysis = EXCLUDED.analysis,
          updated_at = NOW()
        RETURNING id
      `, [
        parsedMessage.messageId,
        parsedMessage.threadId,
        parsedMessage.userEmail,
        parsedMessage.from,
        parsedMessage.to || '',
        parsedMessage.cc || '',
        parsedMessage.bcc || '',
        parsedMessage.subject || '',
        parsedMessage.body || '',
        parsedMessage.bodyType,
        parsedMessage.timestamp,
        parsedMessage.hasAttachments,
        parsedMessage.attachmentCount,
        riskAnalysis.riskScore || 0,
        riskAnalysis.category || 'unknown',
        riskAnalysis.isFlagged || false,
        JSON.stringify(riskAnalysis.analysis || {}),
        JSON.stringify(parsedMessage.labels || []),
        JSON.stringify(parsedMessage.rawData)
      ]);

      return result.rows[0].id;

    } catch (error) {
      console.error('❌ Error storing Gmail message:', error);
      throw error;
    }
  }

  /**
   * Sync Gmail messages for all users
   */
  async syncAllGmailMessages(options = {}) {
    const { daysBack = 7, maxMessagesPerUser = 100, batchSize = 3 } = options;
    
    try {
      console.log(`🔄 Starting Google Workspace Gmail sync - ${daysBack} days back, max ${maxMessagesPerUser} messages per user...`);

      let totalUsers = 0;
      let totalMessages = 0;
      let processedMessages = 0;
      let flaggedMessages = 0;

      // Get all users in the domain
      const users = await this.getAllUsers();
      totalUsers = users.length;
      console.log(`📊 Found ${totalUsers} users to process`);

      // Process users in batches to avoid rate limiting
      for (let i = 0; i < users.length; i += batchSize) {
        const userBatch = users.slice(i, i + batchSize);
        
        await Promise.all(userBatch.map(async (user) => {
          try {
            console.log(`👤 Processing Gmail for user: ${user.primaryEmail}`);

            // Get Gmail messages for this user
            const messages = await this.getUserGmailMessages(user.primaryEmail, {
              daysBack,
              maxMessages: maxMessagesPerUser
            });

            totalMessages += messages.length;

            // Process each message
            for (const message of messages) {
              try {
                // Parse message
                const parsedMessage = this.parseGmailMessage(message, user.primaryEmail);
                if (!parsedMessage) continue;

                // Analyze for risks
                const riskAnalysis = await this.processGmailMessage(parsedMessage);
                
                // Store in database
                await this.storeGmailMessage(parsedMessage, riskAnalysis);
                
                processedMessages++;
                
                if (riskAnalysis.isFlagged) {
                  flaggedMessages++;
                }

              } catch (messageError) {
                console.error(`❌ Error processing message ${message.id} for ${user.primaryEmail}:`, messageError);
              }
            }

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
        syncedAt: new Date().toISOString()
      };

      console.log('✅ Google Workspace Gmail sync completed:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Google Workspace Gmail sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GoogleWorkspaceConnector(); 