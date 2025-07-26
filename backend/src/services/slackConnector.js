const { WebClient } = require('@slack/web-api');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');
const { syncComplianceAnalyzer } = require('./syncComplianceAnalyzer');

/**
 * Slack Connector Service
 * 
 * This service connects to Slack via Slack Web API to:
 * - Authenticate with Slack using Bot Token
 * - Retrieve messages from all channels the bot has access to
 * - Monitor file sharing activities in Slack
 * - Process messages with AI for risk analysis
 * - Store processed messages in database
 * - Extract violations and security insights
 * - Assign compliance profiles and track regulatory status
 */
class SlackConnector {
  constructor() {
    this.client = null;
    this.botToken = null;
    this.userToken = null;
    this.isConfigured = false;
    this.config = null;
    this.complianceEnabled = false;
  }

  /**
   * Initialize Slack connection with app credentials
   */
  async initialize(config) {
    try {
      this.config = {
        botToken: config.botToken,
        userToken: config.userToken, // Optional: for enhanced access
        appId: config.appId,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        signingSecret: config.signingSecret,
        workspaceId: config.workspaceId
      };

      // Create Slack Web API client
      this.client = new WebClient(this.config.botToken);
      this.botToken = this.config.botToken;

      console.log('✅ Slack Connector initialized');
      this.isConfigured = true;
      return true;

    } catch (error) {
      console.error('❌ Error initializing Slack Connector:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Test authentication with Slack
   */
  async authenticate() {
    if (!this.isConfigured) {
      throw new Error('Slack Connector not configured');
    }

    try {
      console.log('🔐 Testing Slack authentication...');

      // Test bot token authentication
      const authResult = await this.client.auth.test();
      
      if (!authResult.ok) {
        throw new Error(`Slack auth failed: ${authResult.error}`);
      }

      console.log('✅ Successfully authenticated with Slack');
      console.log(`   Bot User: ${authResult.user} (${authResult.user_id})`);
      console.log(`   Team: ${authResult.team} (${authResult.team_id})`);
      console.log(`   Workspace: ${authResult.url}`);

      return {
        success: true,
        botUser: authResult.user,
        botUserId: authResult.user_id,
        team: authResult.team,
        teamId: authResult.team_id,
        url: authResult.url
      };

    } catch (error) {
      console.error('❌ Slack authentication failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all public channels in the workspace
   */
  async getAllChannels() {
    if (!this.client) {
      await this.authenticate();
    }

    try {
      console.log('📺 Fetching all channels from Slack...');

      const channelsResult = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000
      });

      if (!channelsResult.ok) {
        throw new Error(`Failed to fetch channels: ${channelsResult.error}`);
      }

      console.log(`✅ Retrieved ${channelsResult.channels.length} channels from Slack`);
      return channelsResult.channels;

    } catch (error) {
      console.error('❌ Error fetching channels from Slack:', error);
      throw error;
    }
  }

  /**
   * Get all users in the workspace
   */
  async getAllUsers() {
    if (!this.client) {
      await this.authenticate();
    }

    try {
      console.log('👥 Fetching all users from Slack...');

      const usersResult = await this.client.users.list({
        limit: 1000
      });

      if (!usersResult.ok) {
        throw new Error(`Failed to fetch users: ${usersResult.error}`);
      }

      // Filter out bots and deleted users
      const realUsers = usersResult.members.filter(user => 
        !user.is_bot && 
        !user.deleted && 
        user.id !== 'USLACKBOT' &&
        user.profile?.email // Only users with email addresses
      );

      console.log(`✅ Retrieved ${realUsers.length} real users from Slack (${usersResult.members.length} total members)`);
      return realUsers;

    } catch (error) {
      console.error('❌ Error fetching users from Slack:', error);
      throw error;
    }
  }

  /**
   * Get messages from a specific channel
   */
  async getChannelMessages(channelId, options = {}) {
    if (!this.client) {
      await this.authenticate();
    }

    try {
      const {
        limit = 100,
        oldest = null,     // Unix timestamp
        latest = null      // Unix timestamp
      } = options;

      console.log(`💬 Fetching messages from channel ${channelId}...`);

      const messagesResult = await this.client.conversations.history({
        channel: channelId,
        limit: limit,
        oldest: oldest,
        latest: latest,
        inclusive: true
      });

      if (!messagesResult.ok) {
        throw new Error(`Failed to fetch messages: ${messagesResult.error}`);
      }

      console.log(`✅ Retrieved ${messagesResult.messages.length} messages from channel ${channelId}`);
      return messagesResult.messages;

    } catch (error) {
      console.error(`❌ Error fetching messages from channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get user information by user ID
   */
  async getUserInfo(userId) {
    if (!this.client) {
      await this.authenticate();
    }

    try {
      const userResult = await this.client.users.info({
        user: userId
      });

      if (!userResult.ok) {
        throw new Error(`Failed to fetch user info: ${userResult.error}`);
      }

      return userResult.user;

    } catch (error) {
      console.error(`❌ Error fetching user info for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Process and analyze a single Slack message
   */
  async processMessage(message, channel, channelUsers) {
    try {
      // Skip bot messages and system messages
      if (message.bot_id || message.subtype === 'bot_message' || !message.user) {
        return {
          success: false,
          reason: 'Bot or system message',
          messageId: message.ts
        };
      }

      // Get user information
      const user = await this.getUserInfo(message.user);
      if (!user || !user.profile?.email) {
        return {
          success: false,
          reason: 'User not found or no email',
          messageId: message.ts
        };
      }

      // Extract message data for analysis
      const messageData = {
        messageId: message.ts,
        text: message.text || '',
        sender: {
          email: user.profile.email,
          name: user.profile.real_name || user.name || user.profile.display_name,
          userId: user.id
        },
        channel: {
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private || false
        },
        timestamp: new Date(parseFloat(message.ts) * 1000),
        hasAttachments: !!(message.files && message.files.length > 0),
        attachments: [],
        mentions: this.extractMentions(message.text || ''),
        reactions: message.reactions || [],
        threadTs: message.thread_ts || null,
        isThreadReply: !!message.thread_ts && message.thread_ts !== message.ts
      };

      // Process attachments if they exist
      if (messageData.hasAttachments && message.files) {
        messageData.attachments = message.files.map(file => ({
          id: file.id,
          name: file.name,
          filetype: file.filetype,
          size: file.size,
          mimetype: file.mimetype,
          url: file.url_private || file.permalink,
          isExternal: file.external_type !== undefined
        }));
      }

      // Find employee in database
      const employeeResult = await query(`
        SELECT id, name, department 
        FROM employees 
        WHERE email = $1
      `, [messageData.sender.email]);

      let employeeId = null;
      if (employeeResult.rows.length > 0) {
        employeeId = employeeResult.rows[0].id;
      } else {
        console.warn(`⚠️ Employee not found for Slack user: ${messageData.sender.email}`);
      }

      // Analyze message content for risks
      const riskAnalysis = await this.analyzeMessageRisk(messageData);

      // Store message in database
      await this.storeMessageInDatabase(messageData, riskAnalysis, employeeId);

      // Create violations for high-risk messages (like other connectors)
      let violationsCreated = 0;
      if (employeeId && riskAnalysis.riskScore >= 70) {
        const violationId = await this.checkForSlackViolations(messageData, riskAnalysis, employeeId);
        if (violationId) {
          violationsCreated = 1;
        }
      }

      // Queue employee for AI compliance analysis (sync-triggered)
      if (employeeId && riskAnalysis.riskScore > 50) {
        await syncComplianceAnalyzer.queueEmployeeForAnalysis(employeeId, 'slack_message_sync');
      }

      return {
        success: true,
        messageId: message.ts,
        riskScore: riskAnalysis.riskScore,
        violationsFound: violationsCreated
      };

    } catch (error) {
      console.error(`❌ Error processing Slack message ${message.ts}:`, error);
      return {
        success: false,
        messageId: message.ts,
        error: error.message
      };
    }
  }

  /**
   * Analyze message content for security risks
   */
  async analyzeMessageRisk(messageData) {
    try {
      // Use existing email risk analyzer for content analysis
      // Adapt the email format to work with Slack messages
      const emailLikeData = {
        messageId: messageData.messageId,
        subject: `Slack message in #${messageData.channel.name}`,
        bodyText: messageData.text,
        bodyHtml: null,
        sender: messageData.sender,
        recipients: messageData.mentions.map(mention => ({ email: mention })),
        sentAt: messageData.timestamp,
        hasAttachments: messageData.hasAttachments,
        attachments: messageData.attachments
      };

      const analysis = await emailRiskAnalyzer.analyzeRisk(emailLikeData);

      // Add Slack-specific risk factors
      const slackRiskFactors = [];
      
      // Private channel risks
      if (messageData.channel.isPrivate) {
        slackRiskFactors.push('Private channel communication');
        analysis.riskScore += 10;
      }

      // External file sharing risks
      if (messageData.attachments.some(att => att.isExternal)) {
        slackRiskFactors.push('External file sharing detected');
        analysis.riskScore += 15;
      }

      // Thread reply context
      if (messageData.isThreadReply) {
        slackRiskFactors.push('Thread reply - context dependent');
        analysis.riskScore += 5;
      }

      // Combine risk factors
      analysis.riskFactors = [...(analysis.riskFactors || []), ...slackRiskFactors];

      // Cap risk score at 100
      analysis.riskScore = Math.min(analysis.riskScore, 100);

      return analysis;

    } catch (error) {
      console.error('❌ Error analyzing Slack message risk:', error);
      return {
        riskScore: 0,
        riskFactors: ['Analysis failed'],
        confidence: 0,
        violationsDetected: 0
      };
    }
  }

  /**
   * Check for violations in Slack messages and create violation records
   */
  async checkForSlackViolations(messageData, riskAnalysis, employeeId) {
    try {
      // Create violations for high-risk Slack messages
      const violationType = this.determineSlackViolationType(riskAnalysis, messageData);
      
      const violationResult = await query(`
        INSERT INTO violations (
          employee_id, type, severity, description, 
          source, metadata, status, workflow_status, discovered_at,
          incident_type, requires_notification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        employeeId,
        violationType,
        riskAnalysis.riskScore >= 90 ? 'Critical' :
        riskAnalysis.riskScore >= 80 ? 'High' : 'Medium',
        `Slack violation detected in #${messageData.channel.name}: ${messageData.text?.substring(0, 100)}...`,
        'slack_analysis',
        JSON.stringify({
          messageId: messageData.messageId,
          channelId: messageData.channel.id,
          channelName: messageData.channel.name,
          isPrivateChannel: messageData.channel.isPrivate,
          riskScore: riskAnalysis.riskScore,
          riskFactors: riskAnalysis.riskFactors || [],
          hasAttachments: messageData.hasAttachments,
          mentionsCount: messageData.mentions?.length || 0,
          isThreadReply: messageData.isThreadReply
        }),
        'Active',
        'open',
        new Date(),
        'slack_security_violation',
        riskAnalysis.riskScore >= 90
      ]);

      const violationId = violationResult.rows[0].id;
      console.log(`🚨 Created Slack violation ${violationId} for high-risk message in #${messageData.channel.name}`);

      // 🆕 AUTO-TRIGGER ENHANCED POLICY EVALUATION
      try {
        const policyEvaluationEngine = require('./policyEvaluationEngine');
        const policiesTriggered = await policyEvaluationEngine.evaluatePoliciesForViolation(violationId, employeeId);
        if (policiesTriggered > 0) {
          console.log(`🔥 Slack policy evaluation triggered ${policiesTriggered} policies for violation ${violationId}`);
        } else {
          console.log(`📋 No Slack policies triggered for violation ${violationId} (employee ${employeeId})`);
        }
      } catch (policyError) {
        console.error(`⚠️ Policy evaluation failed for Slack violation ${violationId}:`, policyError.message);
      }

      return violationId;

    } catch (error) {
      console.error(`❌ Error creating Slack violation for message ${messageData.messageId}:`, error);
      return null;
    }
  }

  /**
   * Determine violation type based on Slack message analysis
   */
  determineSlackViolationType(riskAnalysis, messageData) {
    const riskFactors = riskAnalysis.riskFactors || [];
    
    // Check for specific violation types
    if (riskFactors.some(factor => factor.toLowerCase().includes('external file'))) {
      return 'Slack External File Sharing';
    }
    
    if (riskFactors.some(factor => factor.toLowerCase().includes('private channel'))) {
      return 'Slack Private Channel Risk';
    }
    
    if (riskFactors.some(factor => factor.toLowerCase().includes('suspicious'))) {
      return 'Slack Suspicious Content';
    }
    
    if (riskFactors.some(factor => factor.toLowerCase().includes('policy'))) {
      return 'Slack Policy Violation';
    }
    
    if (messageData.hasAttachments) {
      return 'Slack File Sharing Risk';
    }
    
    if (messageData.mentions?.length > 5) {
      return 'Slack Mass Mention';
    }
    
    // Default violation type
    return 'Slack Security Risk';
  }

  /**
   * Extract @mentions from message text
   */
  extractMentions(text) {
    const mentionRegex = /<@([UW][A-Z0-9]+)>/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Store processed message in database
   */
  async storeMessageInDatabase(messageData, analysis, employeeId) {
    try {
      // Check if message already exists
      const existingMessage = await query(`
        SELECT id FROM slack_messages 
        WHERE message_ts = $1
      `, [messageData.messageId]);

      if (existingMessage.rows.length > 0) {
        console.log(`💬 Slack message ${messageData.messageId} already exists, skipping...`);
        return;
      }

      // Determine category
      let category = 'internal';
      if (analysis.riskScore >= 80) category = 'policy_violation';
      else if (analysis.riskScore >= 60) category = 'suspicious';
      else if (messageData.channel.isPrivate) category = 'private_channel';

      // Store message
      await query(`
        INSERT INTO slack_messages (
          message_ts, channel_id, channel_name, sender_employee_id, sender_email,
          sender_name, sender_user_id, message_text, mentions, attachments,
          sent_at, risk_score, risk_flags, category, is_flagged, 
          is_analyzed, analyzed_at, analyzer_version, is_private_channel,
          thread_ts, is_thread_reply, reactions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        messageData.messageId,
        messageData.channel.id,
        messageData.channel.name,
        employeeId,
        messageData.sender.email,
        messageData.sender.name,
        messageData.sender.userId,
        messageData.text,
        JSON.stringify(messageData.mentions),
        JSON.stringify(messageData.attachments),
        messageData.timestamp,
        analysis.riskScore,
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
        '1.0.0',
        messageData.channel.isPrivate,
        messageData.threadTs,
        messageData.isThreadReply,
        JSON.stringify(messageData.reactions)
      ]);

      console.log(`✅ Stored Slack message ${messageData.messageId} with risk score ${analysis.riskScore}`);

    } catch (error) {
      console.error(`❌ Error storing Slack message ${messageData.messageId}:`, error);
      throw error;
    }
  }

  /**
   * Sync messages from all accessible channels
   */
  async syncAllChannelMessages(options = {}) {
    try {
      const {
        daysBack = 7,
        maxMessagesPerChannel = 200,
        batchSize = 5
      } = options;

      console.log('🔄 Starting Slack message sync for all channels...');

      // Get all channels
      const channels = await this.getAllChannels();
      const results = {
        totalChannels: channels.length,
        processedChannels: 0,
        totalMessages: 0,
        processedMessages: 0,
        errors: [],
        violations: 0
      };

      // Calculate date range
      const oldest = Math.floor((Date.now() - (daysBack * 24 * 60 * 60 * 1000)) / 1000);

      // Get all users for reference
      const allUsers = await this.getAllUsers();
      const userMap = new Map(allUsers.map(user => [user.id, user]));

      // Process channels in batches
      for (let i = 0; i < channels.length; i += batchSize) {
        const batch = channels.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (channel) => {
          try {
            console.log(`📺 Processing messages from #${channel.name}...`);

            // Get channel messages
            const messages = await this.getChannelMessages(channel.id, {
              limit: maxMessagesPerChannel,
              oldest: oldest.toString()
            });

            results.totalMessages += messages.length;

            // Process each message
            for (const message of messages) {
              const result = await this.processMessage(message, channel, userMap);
              
              if (result.success) {
                results.processedMessages++;
                if (result.violationsFound > 0) {
                  results.violations++;
                }
              } else {
                if (result.error) {
                  results.errors.push({
                    channel: channel.name,
                    messageId: result.messageId,
                    error: result.error
                  });
                }
              }
            }

            results.processedChannels++;
            console.log(`✅ Completed #${channel.name}: ${messages.length} messages processed`);

          } catch (channelError) {
            console.error(`❌ Error processing channel #${channel.name}:`, channelError);
            results.errors.push({
              channel: channel.name,
              error: channelError.message
            });
          }
        }));

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('🎉 Slack message sync completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Error during Slack message sync:', error);
      throw error;
    }
  }

  /**
   * Sync Slack users to employees table
   */
  async syncUsersToEmployees() {
    try {
      console.log('👥 Starting Slack user sync to employees table...');

      // Get all users from Slack
      const slackUsers = await this.getAllUsers();
      
      const results = {
        totalUsers: slackUsers.length,
        newEmployees: 0,
        updatedEmployees: 0,
        errors: []
      };

      for (const user of slackUsers) {
        try {
          const email = user.profile?.email;
          const name = user.profile?.real_name || user.profile?.display_name || user.name;
          const title = user.profile?.title || 'Slack User';
          const department = user.profile?.department || 'General';
          const phone = user.profile?.phone || '';
          const photoUrl = user.profile?.image_192 || user.profile?.image_72 || null;

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
              SET name = $1, department = $2, job_title = $3, photo_url = $4, updated_at = NOW()
              WHERE email = $5
            `, [name, department, title, photoUrl, email]);
            
            results.updatedEmployees++;
            console.log(`✅ Updated employee: ${name} (${email})`);
          } else {
            // Create new employee
            await query(`
              INSERT INTO employees (name, email, department, job_title, photo_url, risk_score, risk_level, is_active, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, 0, 'Low', true, NOW(), NOW())
            `, [name, email, department, title, photoUrl]);
            
            results.newEmployees++;
            console.log(`✅ Created employee: ${name} (${email})`);
          }

        } catch (userError) {
          console.error(`❌ Error processing user ${user.name}:`, userError);
          results.errors.push({
            user: user.name,
            error: userError.message
          });
        }
      }

      console.log('🎉 Slack user sync completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Error during Slack user sync:', error);
      throw error;
    }
  }

  /**
   * Test connection to Slack
   */
  async testConnection() {
    try {
      const authResult = await this.authenticate();
      
      if (authResult.success) {
        // Try to get a few channels to test permissions
        const testChannels = await this.client.conversations.list({
          types: 'public_channel',
          limit: 5
        });

        return {
          success: true,
          message: 'Slack connection successful',
          team: authResult.team,
          botUser: authResult.botUser,
          channelsFound: testChannels.channels?.length || 0
        };
      } else {
        return {
          success: false,
          message: 'Slack connection failed',
          error: authResult.error
        };
      }

    } catch (error) {
      return {
        success: false,
        message: 'Slack connection failed',
        error: error.message
      };
    }
  }
}

module.exports = new SlackConnector(); 