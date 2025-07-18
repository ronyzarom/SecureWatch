const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { query } = require('../utils/database');
const emailRiskAnalyzer = require('./emailRiskAnalyzer');

/**
 * Microsoft Teams Connector Service
 * 
 * This service connects to Microsoft Teams via Microsoft Graph API to:
 * - Authenticate with Office 365 (same as email connector)
 * - Retrieve Teams messages from all teams and channels
 * - Monitor file sharing activities in Teams
 * - Process communications with AI for risk analysis
 * - Store processed Teams data in database
 * - Extract violations and security insights from team communications
 */
class TeamsConnector {
  constructor() {
    this.msalClient = null;
    this.graphClient = null;
    this.accessToken = null;
    this.isConfigured = false;
    this.config = null;
  }

  /**
   * Initialize Teams connection with app registration details
   * Uses same Office 365 configuration since it's the same tenant
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

      console.log('✅ Microsoft Teams Connector initialized');
      this.isConfigured = true;
      return true;

    } catch (error) {
      console.error('❌ Error initializing Teams Connector:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Authenticate with Microsoft Graph using client credentials flow
   * Same authentication as Office 365 connector
   */
  async authenticate() {
    if (!this.isConfigured) {
      throw new Error('Teams Connector not configured');
    }

    try {
      console.log('🔐 Authenticating with Microsoft Graph for Teams...');

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

      console.log('✅ Successfully authenticated with Microsoft Graph for Teams');
      return true;

    } catch (error) {
      console.error('❌ Teams authentication failed:', error);
      
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

        console.log('✅ Successfully acquired new Microsoft Graph token for Teams');
        return true;

      } catch (freshError) {
        console.error('❌ Failed to acquire fresh Microsoft Graph token for Teams:', freshError);
        return false;
      }
    }
  }

  /**
   * Test connection to Microsoft Teams
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Microsoft Teams connection...');

      if (!this.graphClient) {
        await this.authenticate();
      }

      // Test by getting a few teams
      const teams = await this.graphClient
        .api('/teams')
        .select('id,displayName,description')
        .top(5)
        .get();

      const teamsCount = teams.value ? teams.value.length : 0;
      
      console.log(`✅ Teams connection test successful - found ${teamsCount} teams`);
      
      return {
        success: true,
        message: `Successfully connected to Microsoft Teams. Found ${teamsCount} teams accessible.`,
        teamsFound: teamsCount
      };

    } catch (error) {
      console.error('❌ Teams connection test failed:', error);
      
      return {
        success: false,
        message: `Teams connection test failed: ${error.message}`,
        teamsFound: 0
      };
    }
  }

  /**
   * Get all Teams in the organization
   */
  async getAllTeams() {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      console.log('👥 Fetching all Teams from Microsoft Teams...');

      const teams = await this.graphClient
        .api('/teams')
        .select('id,displayName,description,createdDateTime,memberSettings,guestSettings')
        .get();

      console.log(`✅ Retrieved ${teams.value.length} teams from Microsoft Teams`);
      return teams.value;

    } catch (error) {
      console.error('❌ Error fetching teams from Microsoft Teams:', error);
      throw error;
    }
  }

  /**
   * Get all channels for a specific team
   */
  async getTeamChannels(teamId) {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      console.log(`📂 Fetching channels for team ${teamId}...`);

      const channels = await this.graphClient
        .api(`/teams/${teamId}/channels`)
        .select('id,displayName,description,membershipType,createdDateTime')
        .get();

      console.log(`✅ Retrieved ${channels.value.length} channels for team ${teamId}`);
      return channels.value;

    } catch (error) {
      console.error(`❌ Error fetching channels for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get messages from a specific channel
   */
  async getChannelMessages(teamId, channelId, options = {}) {
    if (!this.graphClient) {
      await this.authenticate();
    }

    try {
      const { daysBack = 7, maxMessages = 100 } = options;
      const fromDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)).toISOString();

      console.log(`💬 Fetching messages from team ${teamId}, channel ${channelId} since ${fromDate}...`);

      const messages = await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .select('id,createdDateTime,lastModifiedDateTime,subject,body,from,attachments,mentions')
        .filter(`createdDateTime ge ${fromDate}`)
        .orderby('createdDateTime desc')
        .top(maxMessages)
        .get();

      console.log(`✅ Retrieved ${messages.value.length} messages from channel ${channelId}`);
      return messages.value;

    } catch (error) {
      console.error(`❌ Error fetching messages from channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Process and analyze Teams message for security risks
   */
  async processTeamsMessage(message, teamInfo, channelInfo) {
    try {
      // Convert Teams message to email-like format for risk analysis
      const emailLikeMessage = {
        subject: message.subject || `Teams message in ${channelInfo.displayName}`,
        body: message.body?.content || '',
        bodyType: message.body?.contentType || 'text',
        from: message.from?.user?.displayName || 'Unknown User',
        fromEmail: message.from?.user?.mail || message.from?.user?.userPrincipalName || 'unknown@domain.com',
        recipients: [], // Teams messages don't have traditional recipients
        timestamp: message.createdDateTime,
        messageId: message.id,
        attachments: message.attachments || [],
        mentions: message.mentions || [],
        teamId: teamInfo.id,
        teamName: teamInfo.displayName,
        channelId: channelInfo.id,
        channelName: channelInfo.displayName
      };

      // Use email risk analyzer (it works for any text content)
      const riskAnalysis = await emailRiskAnalyzer.analyzeEmail(emailLikeMessage);

      return {
        ...riskAnalysis,
        messageType: 'teams_message',
        teamContext: {
          teamId: teamInfo.id,
          teamName: teamInfo.displayName,
          channelId: channelInfo.id,
          channelName: channelInfo.displayName
        }
      };

    } catch (error) {
      console.error('❌ Error processing Teams message:', error);
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
   * Store Teams message in database
   */
  async storeTeamsMessage(message, teamInfo, channelInfo, riskAnalysis) {
    try {
      const result = await query(`
        INSERT INTO teams_messages (
          message_id, team_id, team_name, channel_id, channel_name,
          from_user_name, from_user_email, subject, body, body_type,
          created_at, risk_score, category, is_flagged, analysis,
          attachments, mentions, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (message_id) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          category = EXCLUDED.category,
          is_flagged = EXCLUDED.is_flagged,
          analysis = EXCLUDED.analysis,
          updated_at = NOW()
        RETURNING id
      `, [
        message.id,
        teamInfo.id,
        teamInfo.displayName,
        channelInfo.id,
        channelInfo.displayName,
        message.from?.user?.displayName || 'Unknown User',
        message.from?.user?.mail || message.from?.user?.userPrincipalName || 'unknown@domain.com',
        message.subject || `Message in ${channelInfo.displayName}`,
        message.body?.content || '',
        message.body?.contentType || 'text',
        message.createdDateTime,
        riskAnalysis.riskScore || 0,
        riskAnalysis.category || 'unknown',
        riskAnalysis.isFlagged || false,
        JSON.stringify(riskAnalysis.analysis || {}),
        JSON.stringify(message.attachments || []),
        JSON.stringify(message.mentions || []),
        JSON.stringify(message)
      ]);

      return result.rows[0].id;

    } catch (error) {
      console.error('❌ Error storing Teams message:', error);
      throw error;
    }
  }

  /**
   * Sync messages from all teams and channels
   */
  async syncAllTeamsMessages(options = {}) {
    const { daysBack = 7, maxMessagesPerChannel = 100, batchSize = 5 } = options;
    
    try {
      console.log(`🔄 Starting Teams sync - ${daysBack} days back, max ${maxMessagesPerChannel} messages per channel...`);

      let totalMessages = 0;
      let processedMessages = 0;
      let flaggedMessages = 0;

      // Get all teams
      const teams = await this.getAllTeams();
      console.log(`📊 Found ${teams.length} teams to process`);

      // Process teams in batches
      for (let i = 0; i < teams.length; i += batchSize) {
        const teamBatch = teams.slice(i, i + batchSize);
        
        await Promise.all(teamBatch.map(async (team) => {
          try {
            console.log(`🏢 Processing team: ${team.displayName}`);

            // Get channels for this team
            const channels = await this.getTeamChannels(team.id);
            
            for (const channel of channels) {
              try {
                console.log(`📂 Processing channel: ${channel.displayName} in team ${team.displayName}`);

                // Get messages from this channel
                const messages = await this.getChannelMessages(team.id, channel.id, {
                  daysBack,
                  maxMessages: maxMessagesPerChannel
                });

                totalMessages += messages.length;

                // Process each message
                for (const message of messages) {
                  try {
                    // Analyze message for risks
                    const riskAnalysis = await this.processTeamsMessage(message, team, channel);
                    
                    // Store in database
                    await this.storeTeamsMessage(message, team, channel, riskAnalysis);
                    
                    processedMessages++;
                    
                    if (riskAnalysis.isFlagged) {
                      flaggedMessages++;
                    }

                  } catch (messageError) {
                    console.error(`❌ Error processing message ${message.id}:`, messageError);
                  }
                }

              } catch (channelError) {
                console.error(`❌ Error processing channel ${channel.displayName}:`, channelError);
              }
            }

          } catch (teamError) {
            console.error(`❌ Error processing team ${team.displayName}:`, teamError);
          }
        }));

        // Log progress
        console.log(`📈 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(teams.length/batchSize)}`);
      }

      const summary = {
        totalTeams: teams.length,
        totalMessages,
        processedMessages,
        flaggedMessages,
        syncedAt: new Date().toISOString()
      };

      console.log('✅ Teams sync completed:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Teams sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TeamsConnector(); 