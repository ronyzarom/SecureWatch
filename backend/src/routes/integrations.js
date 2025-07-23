const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query } = require('../utils/database');
const office365Connector = require('../services/office365Connector');
const teamsConnector = require('../services/teamsConnector');
const googleWorkspaceConnector = require('../services/googleWorkspaceConnector');
const slackConnector = require('../services/slackConnector');

/**
 * @swagger
 * tags:
 *   name: Integrations
 *   description: External system integrations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Office365Config:
 *       type: object
 *       properties:
 *         clientId:
 *           type: string
 *           description: Office 365 Application (client) ID
 *         clientSecret:
 *           type: string
 *           description: Office 365 Client secret
 *         tenantId:
 *           type: string
 *           description: Office 365 Tenant ID
 *         isActive:
 *           type: boolean
 *           description: Whether the integration is active
 */

// =============================================================================
// OFFICE 365 CONFIGURATION
// =============================================================================

/**
 * @swagger
 * /api/integrations/office365/config:
 *   get:
 *     summary: Get Office 365 configuration
 *     description: Retrieve current Office 365 integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 config:
 *                   $ref: '#/components/schemas/Office365Config'
 */
router.get('/office365/config', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (result.rows.length === 0) {
      // Return default/empty config instead of 404
      return res.json({
        isConfigured: false,
        isActive: false,
        hasClientSecret: false,
        clientId: '',
        tenantId: '',
        status: 'not_configured'
      });
    }

    // Don't send client secret in response for security
    const config = { ...result.rows[0].value };
    const hasClientSecret = Boolean(config.clientSecret && config.clientSecret.trim());
    
    // Remove client secret from response entirely
    delete config.clientSecret;

    // Determine status based on configuration and active state
    let status = 'disconnected';
    if (config.isConfigured) {
      if (config.isActive) {
        status = 'connected';
      } else {
        status = 'disabled';
      }
    }

    res.json({
      isConfigured: Boolean(config.isConfigured),
      isActive: Boolean(config.isActive),
      hasClientSecret,
      ...config,
      status
    });
  } catch (error) {
    console.error('Get Office 365 config error:', error);
    res.status(500).json({
      error: 'Failed to fetch Office 365 configuration',
      code: 'O365_CONFIG_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/office365/config:
 *   put:
 *     summary: Update Office 365 configuration
 *     description: Configure Office 365 integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Office365Config'
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/office365/config', requireAdmin, async (req, res) => {
  try {
    const { clientId, clientSecret, tenantId, isActive = true } = req.body;

    if (!clientId || !tenantId) {
      return res.status(400).json({
        error: 'Client ID and Tenant ID are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Prepare configuration object
    const config = {
      clientId: clientId.trim(),
      clientSecret: clientSecret ? clientSecret.trim() : undefined,
      tenantId: tenantId.trim(),
      isActive: Boolean(isActive),
      isConfigured: true,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };

    // Only update client secret if provided (for security)
    if (!clientSecret && req.body.clientSecret !== '') {
      // If clientSecret is not provided, keep existing one
      const existingResult = await query(`
        SELECT value FROM app_settings WHERE key = 'office365_config'
      `);
      
      if (existingResult.rows.length > 0) {
        const existingConfig = existingResult.rows[0].value;
        config.clientSecret = existingConfig.clientSecret;
      }
    }

    // Save configuration
    await query(`
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES ('office365_config', $1, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = NOW()
    `, [JSON.stringify(config)]);

    // Don't return client secret in response
    const responseConfig = { ...config };
    if (responseConfig.clientSecret) {
      responseConfig.clientSecret = '********';
    }

    res.json({
      message: 'Office 365 configuration updated successfully',
      config: responseConfig
    });

  } catch (error) {
    console.error('Update Office 365 config error:', error);
    res.status(500).json({
      error: 'Failed to update Office 365 configuration',
      code: 'O365_CONFIG_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// CONNECTION TESTING
// =============================================================================

/**
 * @swagger
 * /api/integrations/office365/test:
 *   post:
 *     summary: Test Office 365 connection
 *     description: Test the Office 365 configuration and connectivity
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Connection test results
 */
router.post('/office365/test', requireAdmin, async (req, res) => {
  try {
    // Load current configuration
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0].value;

    // Check if configuration has required fields (regardless of isActive status)
    if (!config.clientId || !config.clientSecret || !config.tenantId) {
      return res.status(400).json({
        error: 'Office 365 configuration incomplete. Please ensure Client ID, Client Secret, and Tenant ID are all configured.',
        code: 'O365_INCOMPLETE_CONFIG'
      });
    }

    // Initialize and test connection
    await office365Connector.initialize(config);
    const testResult = await office365Connector.testConnection();

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: {
        usersFound: testResult.usersFound,
        testedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Office 365 connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message,
      code: 'O365_TEST_ERROR'
    });
  }
});

// =============================================================================
// EMAIL SYNCHRONIZATION
// =============================================================================

/**
 * @swagger
 * /api/integrations/office365/sync:
 *   post:
 *     summary: Start Office 365 email synchronization
 *     description: Synchronize emails from Office 365 with AI analysis
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysBack:
 *                 type: integer
 *                 description: Number of days to sync back
 *                 default: 7
 *               maxEmailsPerUser:
 *                 type: integer
 *                 description: Maximum emails per user
 *                 default: 100
 *               batchSize:
 *                 type: integer
 *                 description: Users to process in parallel
 *                 default: 10
 *     responses:
 *       200:
 *         description: Synchronization started successfully
 */
router.post('/office365/sync', requireAdmin, async (req, res) => {
  try {
    const { daysBack = 7, maxEmailsPerUser = 100, batchSize = 10 } = req.body;

    // Load current configuration
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0].value;

    if (!config.isConfigured) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    if (!config.isActive) {
      return res.status(400).json({
        error: 'Office 365 integration is disabled',
        code: 'O365_DISABLED'
      });
    }

    // Initialize connector
    await office365Connector.initialize(config);

    // Start synchronization (run in background)
    const syncPromise = office365Connector.syncAllUserEmails({
      daysBack,
      maxEmailsPerUser,
      batchSize
    });

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO sync_jobs (
        integration_type, status, parameters, started_at, started_by
      ) VALUES ($1, $2, $3, NOW(), $4)
      RETURNING id
    `, [
      'office365',
      'running',
      JSON.stringify({ daysBack, maxEmailsPerUser, batchSize }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Handle sync completion (don't await)
    syncPromise.then(async (results) => {
      await query(`
        UPDATE sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          results = $2
        WHERE id = $3
      `, ['completed', JSON.stringify(results), syncJobId]);

      console.log('✅ Office 365 sync job completed:', results);
    }).catch(async (error) => {
      await query(`
        UPDATE sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          error_message = $2
        WHERE id = $3
      `, ['failed', error.message, syncJobId]);

      console.error('❌ Office 365 sync job failed:', error);
    });

    res.json({
      message: 'Office 365 email synchronization started',
      syncJobId: syncJobId,
      parameters: { daysBack, maxEmailsPerUser, batchSize },
      startedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Office 365 sync error:', error);
    res.status(500).json({
      error: 'Failed to start synchronization',
      message: error.message,
      code: 'O365_SYNC_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/office365/sync/users:
 *   post:
 *     summary: Sync Office 365 users to employees table
 *     description: Fetch all users from Office 365 directory and sync them to the employees table
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User synchronization completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     newEmployees:
 *                       type: integer
 *                     updatedEmployees:
 *                       type: integer
 *                     linkedEmails:
 *                       type: integer
 *                     errors:
 *                       type: array
 */
router.post('/office365/sync/users', requireAdmin, async (req, res) => {
  try {
    // Load current configuration
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0].value;

    if (!config.isConfigured) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    if (!config.isActive) {
      return res.status(400).json({
        error: 'Office 365 integration is disabled',
        code: 'O365_DISABLED'
      });
    }

    // Initialize connector
    await office365Connector.initialize(config);

    // Start user synchronization (run in background)
    const syncPromise = office365Connector.syncUsersToEmployees();

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO sync_jobs (
        integration_type, status, parameters, started_at, started_by
      ) VALUES ($1, $2, $3, NOW(), $4)
      RETURNING id
    `, [
      'office365_users',
      'running',
      JSON.stringify({ syncType: 'users' }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Handle sync completion (don't await)
    syncPromise.then(async (results) => {
      await query(`
        UPDATE sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          results = $2
        WHERE id = $3
      `, ['completed', JSON.stringify(results), syncJobId]);

      console.log('✅ Office 365 user sync job completed:', results);
    }).catch(async (error) => {
      await query(`
        UPDATE sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          error_message = $2
        WHERE id = $3
      `, ['failed', error.message, syncJobId]);

      console.error('❌ Office 365 user sync job failed:', error);
    });

    res.json({
      message: 'Office 365 user synchronization started',
      syncJobId: syncJobId,
      syncType: 'users',
      startedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Office 365 user sync error:', error);
    res.status(500).json({
      error: 'Failed to start Office 365 user sync',
      message: error.message,
      code: 'O365_USER_SYNC_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/office365/toggle:
 *   post:
 *     summary: Toggle Office 365 integration active state
 *     description: Enable or disable Office 365 integration without changing configuration
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Whether to enable or disable the integration
 *     responses:
 *       200:
 *         description: Integration status updated successfully
 *       400:
 *         description: Integration not configured
 */
router.post('/office365/toggle', requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;

    // Load current configuration
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0].value;

    if (!config.isConfigured) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    // Update only the active state
    const updatedConfig = {
      ...config,
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };

    // Save updated configuration
    await query(`
      UPDATE app_settings 
      SET value = $1, updated_at = NOW() 
      WHERE key = 'office365_config'
    `, [JSON.stringify(updatedConfig)]);

    // Determine new status
    let status = updatedConfig.isActive ? 'connected' : 'disabled';

    res.json({
      message: `Office 365 integration ${updatedConfig.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: updatedConfig.isActive,
      status
    });

  } catch (error) {
    console.error('Toggle Office 365 status error:', error);
    res.status(500).json({
      error: 'Failed to toggle Office 365 status',
      code: 'O365_TOGGLE_ERROR'
    });
  }
});

// =============================================================================
// SYNC STATUS AND HISTORY
// =============================================================================

/**
 * @swagger
 * /api/integrations/office365/sync/status:
 *   get:
 *     summary: Get synchronization status
 *     description: Retrieve current and recent sync job statuses
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 */
router.get('/office365/sync/status', requireAuth, async (req, res) => {
  try {
    // First check if Office 365 is configured
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.json({
        isRunning: false,
        status: 'not_configured',
        lastSync: null,
        error: null,
        progress: null
      });
    }

    const config = configResult.rows[0].value;
    if (!config.isConfigured || !config.isActive) {
      return res.json({
        isRunning: false,
        status: 'disabled',
        lastSync: null,
        error: null,
        progress: null
      });
    }

    // Get the latest sync job - handle case where table might not exist or be empty
    try {
      const result = await query(`
        SELECT 
          status,
          started_at,
          completed_at,
          error_message,
          results
        FROM sync_jobs 
        WHERE integration_type = 'office365' 
        ORDER BY started_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({
          isRunning: false,
          status: 'never_synced',
          lastSync: null,
          error: null,
          progress: null
        });
      }

      const job = result.rows[0];
      return res.json({
        isRunning: job.status === 'running',
        status: job.status,
        lastSync: job.completed_at || job.started_at,
        error: job.error_message,
        progress: job.results ? JSON.parse(job.results) : null
      });

    } catch (tableError) {
      // sync_jobs table might not exist yet
      console.log('sync_jobs table not found or empty, returning default status');
      return res.json({
        isRunning: false,
        status: 'never_synced',
        lastSync: null,
        error: null,
        progress: null
      });
    }

  } catch (error) {
    console.error('Office 365 sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch sync status',
      code: 'SYNC_STATUS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/office365/sync/users/status:
 *   get:
 *     summary: Get Office 365 user sync status
 *     description: Get the status of the latest Office 365 user synchronization job
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User sync status retrieved successfully
 */
router.get('/office365/sync/users/status', requireAuth, async (req, res) => {
  try {
    // First check if Office 365 is configured
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.json({
        isRunning: false,
        status: 'not_configured',
        lastSync: null,
        error: null,
        results: null
      });
    }

    const config = configResult.rows[0].value;
    if (!config.isConfigured || !config.isActive) {
      return res.json({
        isRunning: false,
        status: 'disabled',
        lastSync: null,
        error: null,
        results: null
      });
    }

    // Get the latest user sync job
    try {
      const result = await query(`
        SELECT 
          status,
          started_at,
          completed_at,
          error_message,
          results
        FROM sync_jobs 
        WHERE integration_type = 'office365_users' 
        ORDER BY started_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({
          isRunning: false,
          status: 'never_synced',
          lastSync: null,
          error: null,
          results: null
        });
      }

      const job = result.rows[0];
      return res.json({
        isRunning: job.status === 'running',
        status: job.status,
        lastSync: job.completed_at || job.started_at,
        error: job.error_message,
        results: job.results ? JSON.parse(job.results) : null
      });

    } catch (tableError) {
      console.log('sync_jobs table not found or empty, returning default status');
      return res.json({
        isRunning: false,
        status: 'never_synced',
        lastSync: null,
        error: null,
        results: null
      });
    }

  } catch (error) {
    console.error('Office 365 user sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch user sync status',
      code: 'USER_SYNC_STATUS_ERROR'
    });
  }
});

// =============================================================================
// MICROSOFT TEAMS CONFIGURATION
// =============================================================================

/**
 * @swagger
 * /api/integrations/teams/config:
 *   get:
 *     summary: Get Microsoft Teams configuration
 *     description: Retrieve current Teams integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Teams configuration retrieved successfully
 */
router.get('/teams/config', requireAdmin, async (req, res) => {
  try {
    // Teams uses the same Office 365 configuration for authentication
    const office365Result = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    const teamsResult = await query(`
      SELECT * FROM teams_config WHERE tenant_id = 'default' LIMIT 1
    `);

    if (office365Result.rows.length === 0) {
      return res.json({
        isConfigured: false,
        isActive: false,
        status: 'not_configured',
        message: 'Office 365 must be configured first before enabling Teams'
      });
    }

    const office365Config = office365Result.rows[0].value;
    const teamsConfig = teamsResult.rows.length > 0 ? teamsResult.rows[0] : {
      is_active: false,
      sync_enabled: true,
      sync_frequency_hours: 24,
      max_messages_per_channel: 100,
      days_back_to_sync: 7
    };

    // Determine status
    let status = 'disconnected';
    if (office365Config.isConfigured) {
      if (teamsConfig.is_active) {
        status = 'connected';
      } else {
        status = 'disabled';
      }
    } else {
      status = 'not_configured';
    }

    res.json({
      isConfigured: Boolean(office365Config.isConfigured),
      isActive: Boolean(teamsConfig.is_active),
      syncEnabled: Boolean(teamsConfig.sync_enabled),
      syncFrequencyHours: teamsConfig.sync_frequency_hours,
      maxMessagesPerChannel: teamsConfig.max_messages_per_channel,
      daysBackToSync: teamsConfig.days_back_to_sync,
      lastSync: teamsConfig.last_sync_at,
      lastSyncStatus: teamsConfig.last_sync_status,
      status,
      // Include Office 365 auth info (without secrets)
      tenantId: office365Config.tenantId,
      clientId: office365Config.clientId,
      hasClientSecret: Boolean(office365Config.clientSecret)
    });
  } catch (error) {
    console.error('Get Teams config error:', error);
    res.status(500).json({
      error: 'Failed to fetch Teams configuration',
      code: 'TEAMS_CONFIG_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/teams/config:
 *   put:
 *     summary: Update Microsoft Teams configuration
 *     description: Update Teams integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Teams configuration updated successfully
 */
router.put('/teams/config', requireAdmin, async (req, res) => {
  try {
    const {
      isActive,
      syncEnabled,
      syncFrequencyHours,
      maxMessagesPerChannel,
      daysBackToSync
    } = req.body;

    // Verify Office 365 is configured first
    const office365Result = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (office365Result.rows.length === 0 || !office365Result.rows[0].value.isConfigured) {
      return res.status(400).json({
        error: 'Office 365 must be configured and active before enabling Teams',
        code: 'OFFICE365_REQUIRED'
      });
    }

    // Update Teams configuration
    await query(`
      INSERT INTO teams_config (
        tenant_id, is_active, sync_enabled, sync_frequency_hours,
        max_messages_per_channel, days_back_to_sync, updated_at
      ) VALUES ('default', $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        sync_enabled = EXCLUDED.sync_enabled,
        sync_frequency_hours = EXCLUDED.sync_frequency_hours,
        max_messages_per_channel = EXCLUDED.max_messages_per_channel,
        days_back_to_sync = EXCLUDED.days_back_to_sync,
        updated_at = NOW()
    `, [
      Boolean(isActive),
      Boolean(syncEnabled),
      parseInt(syncFrequencyHours) || 24,
      parseInt(maxMessagesPerChannel) || 100,
      parseInt(daysBackToSync) || 7
    ]);

    res.json({
      success: true,
      message: 'Teams configuration updated successfully'
    });

  } catch (error) {
    console.error('Update Teams config error:', error);
    res.status(500).json({
      error: 'Failed to update Teams configuration',
      code: 'TEAMS_CONFIG_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/teams/test:
 *   post:
 *     summary: Test Microsoft Teams connection
 *     description: Test the Teams configuration and connectivity
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Teams connection test results
 */
router.post('/teams/test', requireAdmin, async (req, res) => {
  try {
    // Load Office 365 configuration (Teams uses same auth)
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured. Configure Office 365 first.',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0].value;

    if (!config.clientId || !config.clientSecret || !config.tenantId) {
      return res.status(400).json({
        error: 'Office 365 configuration incomplete. Teams requires complete Office 365 setup.',
        code: 'O365_INCOMPLETE_CONFIG'
      });
    }

    // Initialize and test Teams connection
    await teamsConnector.initialize(config);
    const testResult = await teamsConnector.testConnection();

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: {
        teamsFound: testResult.teamsFound,
        testedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Teams connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Teams connection test failed',
      message: error.message,
      code: 'TEAMS_TEST_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/teams/sync:
 *   post:
 *     summary: Start Teams message synchronization
 *     description: Sync Teams messages for security analysis
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Teams sync started successfully
 */
router.post('/teams/sync', requireAdmin, async (req, res) => {
  try {
    const { daysBack = 7, maxMessagesPerChannel = 100, batchSize = 5 } = req.body;

    // Check Teams configuration
    const teamsConfigResult = await query(`
      SELECT * FROM teams_config WHERE tenant_id = 'default' LIMIT 1
    `);

    if (teamsConfigResult.rows.length === 0 || !teamsConfigResult.rows[0].is_active) {
      return res.status(400).json({
        error: 'Teams integration not active',
        code: 'TEAMS_NOT_ACTIVE'
      });
    }

    // Load Office 365 configuration for authentication
    const office365ConfigResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (office365ConfigResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Office 365 not configured',
        code: 'O365_NOT_CONFIGURED'
      });
    }

    const config = office365ConfigResult.rows[0].value;

    if (!config.isConfigured || !config.isActive) {
      return res.status(400).json({
        error: 'Office 365 integration must be active',
        code: 'O365_NOT_ACTIVE'
      });
    }

    // Initialize connector
    await teamsConnector.initialize(config);

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO teams_sync_jobs (
        status, parameters, started_at, started_by
      ) VALUES ('running', $1, NOW(), $2)
      RETURNING id
    `, [
      JSON.stringify({ daysBack, maxMessagesPerChannel, batchSize }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Start synchronization (run in background)
    const syncPromise = teamsConnector.syncAllTeamsMessages({
      daysBack,
      maxMessagesPerChannel,
      batchSize
    });

    // Handle sync completion/error in background
    syncPromise.then(async (result) => {
      try {
        await query(`
          UPDATE teams_sync_jobs SET
            status = 'completed',
            completed_at = NOW(),
            total_teams = $1,
            total_messages = $2,
            processed_messages = $3,
            flagged_messages = $4
          WHERE id = $5
        `, [
          result.totalTeams,
          result.totalMessages,
          result.processedMessages,
          result.flaggedMessages,
          syncJobId
        ]);

        // Update Teams config with last sync info
        await query(`
          UPDATE teams_config SET
            last_sync_at = NOW(),
            last_sync_status = 'success',
            last_sync_error = NULL
          WHERE tenant_id = 'default'
        `);

        console.log('✅ Teams sync job completed successfully:', result);

      } catch (error) {
        console.error('❌ Error updating Teams sync job completion:', error);
      }
    }).catch(async (error) => {
      try {
        await query(`
          UPDATE teams_sync_jobs SET
            status = 'failed',
            completed_at = NOW(),
            error_message = $1
          WHERE id = $2
        `, [error.message, syncJobId]);

        // Update Teams config with error info
        await query(`
          UPDATE teams_config SET
            last_sync_at = NOW(),
            last_sync_status = 'error',
            last_sync_error = $1
          WHERE tenant_id = 'default'
        `, [error.message]);

        console.error('❌ Teams sync job failed:', error);

      } catch (updateError) {
        console.error('❌ Error updating Teams sync job failure:', updateError);
      }
    });

    res.json({
      success: true,
      message: 'Teams synchronization started',
      syncJobId: syncJobId,
      parameters: {
        daysBack,
        maxMessagesPerChannel,
        batchSize
      }
    });

  } catch (error) {
    console.error('Teams sync start error:', error);
    res.status(500).json({
      error: 'Failed to start Teams synchronization',
      message: error.message,
      code: 'TEAMS_SYNC_START_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/teams/sync/status:
 *   get:
 *     summary: Get Teams sync status
 *     description: Get current Teams synchronization status and progress
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Teams sync status retrieved successfully
 */
router.get('/teams/sync/status', requireAuth, async (req, res) => {
  try {
    // Get latest sync job
    const syncJobResult = await query(`
      SELECT * FROM teams_sync_jobs
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Get Teams config for last sync info
    const configResult = await query(`
      SELECT last_sync_at, last_sync_status, last_sync_error
      FROM teams_config
      WHERE tenant_id = 'default'
    `);

    const syncJob = syncJobResult.rows.length > 0 ? syncJobResult.rows[0] : null;
    const config = configResult.rows.length > 0 ? configResult.rows[0] : null;

    res.json({
      lastSync: config?.last_sync_at || null,
      status: config?.last_sync_status || 'never',
      error: config?.last_sync_error || null,
      currentJob: syncJob ? {
        id: syncJob.id,
        status: syncJob.status,
        startedAt: syncJob.started_at,
        completedAt: syncJob.completed_at,
        totalTeams: syncJob.total_teams,
        totalMessages: syncJob.total_messages,
        processedMessages: syncJob.processed_messages,
        flaggedMessages: syncJob.flagged_messages,
        parameters: syncJob.parameters
      } : null
    });

  } catch (error) {
    console.error('Get Teams sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch Teams sync status',
      code: 'TEAMS_SYNC_STATUS_ERROR'
    });
  }
});

// =============================================================================
// GOOGLE WORKSPACE CONFIGURATION
// =============================================================================

/**
 * @swagger
 * /api/integrations/google-workspace/config:
 *   get:
 *     summary: Get Google Workspace configuration
 *     description: Retrieve current Google Workspace integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Google Workspace configuration retrieved successfully
 */
router.get('/google-workspace/config', requireAdmin, async (req, res) => {
  try {
    const configResult = await query(`
      SELECT * FROM google_workspace_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      return res.json({
        isConfigured: false,
        isActive: false,
        gmailSyncEnabled: true,
        driveSyncEnabled: true,
        syncFrequencyHours: 24,
        maxMessagesPerUser: 100,
        daysBackToSync: 7,
        status: 'not_configured',
        domain: '',
        serviceAccountEmail: '',
        delegatedAdminEmail: ''
      });
    }

    const config = configResult.rows[0];

    // Determine status
    let status = 'not_configured';
    if (config.service_account_email && config.delegated_admin_email && config.domain) {
      if (config.is_active) {
        status = 'connected';
      } else {
        status = 'disabled';
      }
    }

    res.json({
      isConfigured: Boolean(config.service_account_email && config.delegated_admin_email && config.domain),
      isActive: Boolean(config.is_active),
      gmailSyncEnabled: Boolean(config.gmail_sync_enabled),
      driveSyncEnabled: Boolean(config.drive_sync_enabled),
      syncFrequencyHours: config.sync_frequency_hours,
      maxMessagesPerUser: config.max_messages_per_user,
      daysBackToSync: config.days_back_to_sync,
      lastGmailSync: config.last_gmail_sync_at,
      lastDriveSync: config.last_drive_sync_at,
      lastSyncStatus: config.last_sync_status,
      status,
      domain: config.domain || '',
      serviceAccountEmail: config.service_account_email || '',
      delegatedAdminEmail: config.delegated_admin_email || '',
      hasServiceAccountKey: Boolean(config.service_account_key)
    });

  } catch (error) {
    console.error('Get Google Workspace config error:', error);
    res.status(500).json({
      error: 'Failed to fetch Google Workspace configuration',
      code: 'GOOGLE_WORKSPACE_CONFIG_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/google-workspace/config:
 *   put:
 *     summary: Update Google Workspace configuration
 *     description: Update Google Workspace integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Google Workspace configuration updated successfully
 */
router.put('/google-workspace/config', requireAdmin, async (req, res) => {
  try {
    const {
      domain,
      serviceAccountEmail,
      serviceAccountKey,
      delegatedAdminEmail,
      isActive,
      gmailSyncEnabled,
      driveSyncEnabled,
      syncFrequencyHours,
      maxMessagesPerUser,
      daysBackToSync
    } = req.body;

    // Validate required fields
    if (!domain || !serviceAccountEmail || !serviceAccountKey || !delegatedAdminEmail) {
      return res.status(400).json({
        error: 'Domain, Service Account Email, Service Account Key, and Delegated Admin Email are required',
        code: 'GOOGLE_WORKSPACE_INCOMPLETE_CONFIG'
      });
    }

    // Validate service account key format
    let parsedServiceAccountKey;
    try {
      if (typeof serviceAccountKey === 'string') {
        parsedServiceAccountKey = JSON.parse(serviceAccountKey);
      } else {
        parsedServiceAccountKey = serviceAccountKey;
      }

      // Check required fields in service account key
      if (!parsedServiceAccountKey.client_email || !parsedServiceAccountKey.private_key) {
        throw new Error('Invalid service account key format');
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid service account key format. Please provide a valid JSON service account key.',
        code: 'INVALID_SERVICE_ACCOUNT_KEY'
      });
    }

    // Update or insert configuration
    await query(`
      INSERT INTO google_workspace_config (
        domain, service_account_email, service_account_key, delegated_admin_email,
        is_active, gmail_sync_enabled, drive_sync_enabled, sync_frequency_hours,
        max_messages_per_user, days_back_to_sync, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (domain) DO UPDATE SET
        service_account_email = EXCLUDED.service_account_email,
        service_account_key = EXCLUDED.service_account_key,
        delegated_admin_email = EXCLUDED.delegated_admin_email,
        is_active = EXCLUDED.is_active,
        gmail_sync_enabled = EXCLUDED.gmail_sync_enabled,
        drive_sync_enabled = EXCLUDED.drive_sync_enabled,
        sync_frequency_hours = EXCLUDED.sync_frequency_hours,
        max_messages_per_user = EXCLUDED.max_messages_per_user,
        days_back_to_sync = EXCLUDED.days_back_to_sync,
        updated_at = NOW()
    `, [
      domain.toLowerCase().trim(),
      serviceAccountEmail.toLowerCase().trim(),
      JSON.stringify(parsedServiceAccountKey),
      delegatedAdminEmail.toLowerCase().trim(),
      Boolean(isActive),
      Boolean(gmailSyncEnabled),
      Boolean(driveSyncEnabled),
      parseInt(syncFrequencyHours) || 24,
      parseInt(maxMessagesPerUser) || 100,
      parseInt(daysBackToSync) || 7
    ]);

    res.json({
      success: true,
      message: 'Google Workspace configuration updated successfully'
    });

  } catch (error) {
    console.error('Update Google Workspace config error:', error);
    res.status(500).json({
      error: 'Failed to update Google Workspace configuration',
      code: 'GOOGLE_WORKSPACE_CONFIG_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/google-workspace/test:
 *   post:
 *     summary: Test Google Workspace connection
 *     description: Test the Google Workspace configuration and connectivity
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Google Workspace connection test results
 */
router.post('/google-workspace/test', requireAdmin, async (req, res) => {
  try {
    // Load Google Workspace configuration
    const configResult = await query(`
      SELECT * FROM google_workspace_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Google Workspace not configured',
        code: 'GOOGLE_WORKSPACE_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0];

    if (!config.service_account_email || !config.service_account_key || !config.delegated_admin_email || !config.domain) {
      return res.status(400).json({
        error: 'Google Workspace configuration incomplete',
        code: 'GOOGLE_WORKSPACE_INCOMPLETE_CONFIG'
      });
    }

    // Parse service account key
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(config.service_account_key);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid service account key format',
        code: 'INVALID_SERVICE_ACCOUNT_KEY'
      });
    }

    // Initialize and test connection
    const connectorConfig = {
      domain: config.domain,
      serviceAccountEmail: config.service_account_email,
      serviceAccountKey: serviceAccountKey,
      delegatedAdminEmail: config.delegated_admin_email
    };

    await googleWorkspaceConnector.initialize(connectorConfig);
    const testResult = await googleWorkspaceConnector.testConnection();

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: {
        usersFound: testResult.usersFound,
        domain: testResult.domain,
        testedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Google Workspace connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Google Workspace connection test failed',
      message: error.message,
      code: 'GOOGLE_WORKSPACE_TEST_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/google-workspace/sync:
 *   post:
 *     summary: Start Google Workspace synchronization
 *     description: Sync Gmail messages and Drive files for security analysis
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Google Workspace sync started successfully
 */
router.post('/google-workspace/sync', requireAdmin, async (req, res) => {
  try {
    const { syncType = 'gmail', daysBack = 7, maxMessagesPerUser = 100, batchSize = 3 } = req.body;

    // Check Google Workspace configuration
    const configResult = await query(`
      SELECT * FROM google_workspace_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0 || !configResult.rows[0].is_active) {
      return res.status(400).json({
        error: 'Google Workspace integration not active',
        code: 'GOOGLE_WORKSPACE_NOT_ACTIVE'
      });
    }

    const config = configResult.rows[0];

    if (!config.service_account_email || !config.service_account_key || !config.delegated_admin_email) {
      return res.status(400).json({
        error: 'Google Workspace configuration incomplete',
        code: 'GOOGLE_WORKSPACE_INCOMPLETE_CONFIG'
      });
    }

    // Parse service account key
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(config.service_account_key);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid service account key format',
        code: 'INVALID_SERVICE_ACCOUNT_KEY'
      });
    }

    // Initialize connector
    const connectorConfig = {
      domain: config.domain,
      serviceAccountEmail: config.service_account_email,
      serviceAccountKey: serviceAccountKey,
      delegatedAdminEmail: config.delegated_admin_email
    };

    await googleWorkspaceConnector.initialize(connectorConfig);

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO google_workspace_sync_jobs (
        sync_type, status, parameters, started_at, started_by
      ) VALUES ($1, 'running', $2, NOW(), $3)
      RETURNING id
    `, [
      syncType,
      JSON.stringify({ daysBack, maxMessagesPerUser, batchSize }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Start synchronization (run in background)
    let syncPromise;
    if (syncType === 'gmail') {
      syncPromise = googleWorkspaceConnector.syncAllGmailMessages({
        daysBack,
        maxMessagesPerUser,
        batchSize
      });
    } else {
      return res.status(400).json({
        error: 'Only Gmail sync is currently supported',
        code: 'UNSUPPORTED_SYNC_TYPE'
      });
    }

    // Handle sync completion/error in background
    syncPromise.then(async (result) => {
      try {
        await query(`
          UPDATE google_workspace_sync_jobs SET
            status = 'completed',
            completed_at = NOW(),
            total_users = $1,
            total_messages = $2,
            processed_messages = $3,
            flagged_messages = $4
          WHERE id = $5
        `, [
          result.totalUsers,
          result.totalMessages,
          result.processedMessages,
          result.flaggedMessages,
          syncJobId
        ]);

        // Update config with last sync info
        await query(`
          UPDATE google_workspace_config SET
            last_gmail_sync_at = NOW(),
            last_sync_status = 'success',
            last_sync_error = NULL
          WHERE domain = $1
        `, [config.domain]);

        console.log('✅ Google Workspace sync job completed successfully:', result);

      } catch (error) {
        console.error('❌ Error updating Google Workspace sync job completion:', error);
      }
    }).catch(async (error) => {
      try {
        await query(`
          UPDATE google_workspace_sync_jobs SET
            status = 'failed',
            completed_at = NOW(),
            error_message = $1
          WHERE id = $2
        `, [error.message, syncJobId]);

        // Update config with error info
        await query(`
          UPDATE google_workspace_config SET
            last_gmail_sync_at = NOW(),
            last_sync_status = 'error',
            last_sync_error = $1
          WHERE domain = $2
        `, [error.message, config.domain]);

        console.error('❌ Google Workspace sync job failed:', error);

      } catch (updateError) {
        console.error('❌ Error updating Google Workspace sync job failure:', updateError);
      }
    });

    res.json({
      success: true,
      message: 'Google Workspace synchronization started',
      syncJobId: syncJobId,
      syncType: syncType,
      parameters: {
        daysBack,
        maxMessagesPerUser,
        batchSize
      }
    });

  } catch (error) {
    console.error('Google Workspace sync start error:', error);
    res.status(500).json({
      error: 'Failed to start Google Workspace synchronization',
      message: error.message,
      code: 'GOOGLE_WORKSPACE_SYNC_START_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/google-workspace/sync/status:
 *   get:
 *     summary: Get Google Workspace sync status
 *     description: Get current Google Workspace synchronization status and progress
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Google Workspace sync status retrieved successfully
 */
router.get('/google-workspace/sync/status', requireAuth, async (req, res) => {
  try {
    // Get latest sync job
    const syncJobResult = await query(`
      SELECT * FROM google_workspace_sync_jobs
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Get config for last sync info
    const configResult = await query(`
      SELECT last_gmail_sync_at, last_drive_sync_at, last_sync_status, last_sync_error
      FROM google_workspace_config
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const syncJob = syncJobResult.rows.length > 0 ? syncJobResult.rows[0] : null;
    const config = configResult.rows.length > 0 ? configResult.rows[0] : null;

    res.json({
      lastGmailSync: config?.last_gmail_sync_at || null,
      lastDriveSync: config?.last_drive_sync_at || null,
      status: config?.last_sync_status || 'never',
      error: config?.last_sync_error || null,
      currentJob: syncJob ? {
        id: syncJob.id,
        syncType: syncJob.sync_type,
        status: syncJob.status,
        startedAt: syncJob.started_at,
        completedAt: syncJob.completed_at,
        totalUsers: syncJob.total_users,
        totalMessages: syncJob.total_messages,
        processedMessages: syncJob.processed_messages,
        flaggedMessages: syncJob.flagged_messages,
        parameters: syncJob.parameters
      } : null
    });

  } catch (error) {
    console.error('Get Google Workspace sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch Google Workspace sync status',
      code: 'GOOGLE_WORKSPACE_SYNC_STATUS_ERROR'
    });
  }
});

// =============================================================================
// SLACK CONFIGURATION
// =============================================================================

/**
 * @swagger
 * /api/integrations/slack/config:
 *   get:
 *     summary: Get Slack configuration
 *     description: Retrieve current Slack integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slack configuration retrieved successfully
 */
router.get('/slack/config', requireAdmin, async (req, res) => {
  try {
    const configResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      return res.json({
        isConfigured: false,
        isActive: false,
        syncEnabled: true,
        syncFrequencyHours: 24,
        maxMessagesPerChannel: 200,
        daysBackToSync: 7,
        syncPrivateChannels: false,
        status: 'not_configured',
        workspaceName: '',
        workspaceId: '',
        botUserId: ''
      });
    }

    const config = configResult.rows[0];

    // Determine if properly configured
    const isConfigured = Boolean(
      config.bot_token && 
      config.workspace_id &&
      config.client_id &&
      config.client_secret
    );

    // Determine status
    let status = 'not_configured';
    if (isConfigured) {
      if (config.is_active) {
        status = 'connected';
      } else {
        status = 'disabled';
      }
    }

    res.json({
      isConfigured,
      isActive: Boolean(config.is_active),
      syncEnabled: Boolean(config.sync_enabled),
      syncFrequencyHours: config.sync_frequency_hours,
      maxMessagesPerChannel: config.max_messages_per_channel,
      daysBackToSync: config.days_back_to_sync,
      syncPrivateChannels: Boolean(config.sync_private_channels),
      lastSync: config.last_sync_at,
      lastSyncStatus: config.last_sync_status,
      status,
      workspaceName: config.workspace_name || '',
      workspaceId: config.workspace_id || '',
      workspaceUrl: config.workspace_url || '',
      botUserId: config.bot_user_id || '',
      hasBotToken: Boolean(config.bot_token),
      hasClientSecret: Boolean(config.client_secret)
    });

  } catch (error) {
    console.error('Get Slack config error:', error);
    res.status(500).json({
      error: 'Failed to fetch Slack configuration',
      code: 'SLACK_CONFIG_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/config:
 *   put:
 *     summary: Update Slack configuration
 *     description: Update Slack integration settings
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slack configuration updated successfully
 */
router.put('/slack/config', requireAdmin, async (req, res) => {
  try {
    const {
      botToken,
      userToken,
      clientId,
      clientSecret,
      signingSecret,
      appId,
      workspaceId,
      isActive,
      syncEnabled,
      syncFrequencyHours,
      maxMessagesPerChannel,
      daysBackToSync,
      syncPrivateChannels
    } = req.body;

    // Validate required fields
    if (!botToken || !clientId || !clientSecret || !workspaceId) {
      return res.status(400).json({
        error: 'Bot Token, Client ID, Client Secret, and Workspace ID are required',
        code: 'SLACK_INCOMPLETE_CONFIG'
      });
    }

    // Update or insert configuration
    await query(`
      INSERT INTO slack_config (
        bot_token, user_token, client_id, client_secret, signing_secret, app_id,
        workspace_id, is_active, sync_enabled, sync_frequency_hours,
        max_messages_per_channel, days_back_to_sync, sync_private_channels, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (workspace_id) DO UPDATE SET
        bot_token = EXCLUDED.bot_token,
        user_token = EXCLUDED.user_token,
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        signing_secret = EXCLUDED.signing_secret,
        app_id = EXCLUDED.app_id,
        is_active = EXCLUDED.is_active,
        sync_enabled = EXCLUDED.sync_enabled,
        sync_frequency_hours = EXCLUDED.sync_frequency_hours,
        max_messages_per_channel = EXCLUDED.max_messages_per_channel,
        days_back_to_sync = EXCLUDED.days_back_to_sync,
        sync_private_channels = EXCLUDED.sync_private_channels,
        updated_at = NOW()
    `, [
      botToken,
      userToken || null,
      clientId,
      clientSecret,
      signingSecret || null,
      appId || null,
      workspaceId,
      Boolean(isActive),
      Boolean(syncEnabled),
      parseInt(syncFrequencyHours) || 24,
      parseInt(maxMessagesPerChannel) || 200,
      parseInt(daysBackToSync) || 7,
      Boolean(syncPrivateChannels)
    ]);

    res.json({
      success: true,
      message: 'Slack configuration updated successfully'
    });

  } catch (error) {
    console.error('Update Slack config error:', error);
    res.status(500).json({
      error: 'Failed to update Slack configuration',
      code: 'SLACK_CONFIG_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/test:
 *   post:
 *     summary: Test Slack connection
 *     description: Test the Slack configuration and connectivity
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slack connection test results
 */
router.post('/slack/test', requireAdmin, async (req, res) => {
  try {
    // Load Slack configuration
    const configResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Slack not configured',
        code: 'SLACK_NOT_CONFIGURED'
      });
    }

    const config = configResult.rows[0];

    if (!config.bot_token || !config.client_id || !config.client_secret || !config.workspace_id) {
      return res.status(400).json({
        error: 'Slack configuration incomplete',
        code: 'SLACK_INCOMPLETE_CONFIG'
      });
    }

    // Initialize and test connection
    const connectorConfig = {
      botToken: config.bot_token,
      userToken: config.user_token,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      signingSecret: config.signing_secret,
      appId: config.app_id,
      workspaceId: config.workspace_id
    };

    await slackConnector.initialize(connectorConfig);
    const testResult = await slackConnector.testConnection();

    // Update workspace info if test successful
    if (testResult.success) {
      await query(`
        UPDATE slack_config SET
          workspace_name = $1,
          workspace_url = $2,
          bot_user_id = $3,
          updated_at = NOW()
        WHERE workspace_id = $4
      `, [
        testResult.team || '',
        testResult.url || '',
        testResult.botUser || '',
        config.workspace_id
      ]);
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: {
        team: testResult.team,
        botUser: testResult.botUser,
        channelsFound: testResult.channelsFound,
        testedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Slack connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Slack connection test failed',
      message: error.message,
      code: 'SLACK_TEST_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/sync:
 *   post:
 *     summary: Start Slack message synchronization
 *     description: Sync Slack messages for security analysis
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slack sync started successfully
 */
router.post('/slack/sync', requireAdmin, async (req, res) => {
  try {
    const { daysBack = 7, maxMessagesPerChannel = 200, batchSize = 5 } = req.body;

    // Check Slack configuration
    const configResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0 || !configResult.rows[0].is_active) {
      return res.status(400).json({
        error: 'Slack integration not active',
        code: 'SLACK_NOT_ACTIVE'
      });
    }

    const config = configResult.rows[0];

    if (!config.bot_token || !config.workspace_id) {
      return res.status(400).json({
        error: 'Slack configuration incomplete',
        code: 'SLACK_INCOMPLETE_CONFIG'
      });
    }

    // Initialize connector
    const connectorConfig = {
      botToken: config.bot_token,
      userToken: config.user_token,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      signingSecret: config.signing_secret,
      appId: config.app_id,
      workspaceId: config.workspace_id
    };

    await slackConnector.initialize(connectorConfig);

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO slack_sync_jobs (
        sync_type, status, parameters, started_at, started_by
      ) VALUES ('messages', 'running', $1, NOW(), $2)
      RETURNING id
    `, [
      JSON.stringify({ daysBack, maxMessagesPerChannel, batchSize }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Start synchronization (run in background)
    const syncPromise = slackConnector.syncAllChannelMessages({
      daysBack,
      maxMessagesPerChannel,
      batchSize
    });

    // Handle sync completion/error in background
    syncPromise.then(async (result) => {
      try {
        await query(`
          UPDATE slack_sync_jobs SET
            status = 'completed',
            completed_at = NOW(),
            total_channels = $1,
            processed_channels = $2,
            total_messages = $3,
            processed_messages = $4,
            flagged_messages = $5,
            results = $6
          WHERE id = $7
        `, [
          result.totalChannels,
          result.processedChannels,
          result.totalMessages,
          result.processedMessages,
          result.violations,
          JSON.stringify(result),
          syncJobId
        ]);

        // Update config with last sync info
        await query(`
          UPDATE slack_config SET
            last_sync_at = NOW(),
            last_sync_status = 'success',
            last_sync_error = NULL
          WHERE workspace_id = $1
        `, [config.workspace_id]);

        console.log('✅ Slack sync job completed successfully:', result);

      } catch (error) {
        console.error('❌ Error updating Slack sync job completion:', error);
      }
    }).catch(async (error) => {
      try {
        await query(`
          UPDATE slack_sync_jobs SET
            status = 'failed',
            completed_at = NOW(),
            error_message = $1
          WHERE id = $2
        `, [error.message, syncJobId]);

        // Update config with error info
        await query(`
          UPDATE slack_config SET
            last_sync_at = NOW(),
            last_sync_status = 'error',
            last_sync_error = $1
          WHERE workspace_id = $2
        `, [error.message, config.workspace_id]);

        console.error('❌ Slack sync job failed:', error);

      } catch (updateError) {
        console.error('❌ Error updating Slack sync job failure:', updateError);
      }
    });

    res.json({
      success: true,
      message: 'Slack message synchronization started',
      syncJobId: syncJobId,
      parameters: {
        daysBack,
        maxMessagesPerChannel,
        batchSize
      }
    });

  } catch (error) {
    console.error('Slack sync start error:', error);
    res.status(500).json({
      error: 'Failed to start Slack synchronization',
      message: error.message,
      code: 'SLACK_SYNC_START_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/sync/users:
 *   post:
 *     summary: Sync Slack users to employees table
 *     description: Fetch all users from Slack workspace and sync them to the employees table
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User synchronization completed
 */
router.post('/slack/sync/users', requireAdmin, async (req, res) => {
  try {
    // Load Slack configuration
    const configResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0 || !configResult.rows[0].is_active) {
      return res.status(400).json({
        error: 'Slack integration not active',
        code: 'SLACK_NOT_ACTIVE'
      });
    }

    const config = configResult.rows[0];

    if (!config.bot_token || !config.workspace_id) {
      return res.status(400).json({
        error: 'Slack configuration incomplete',
        code: 'SLACK_INCOMPLETE_CONFIG'
      });
    }

    // Initialize connector
    const connectorConfig = {
      botToken: config.bot_token,
      userToken: config.user_token,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      signingSecret: config.signing_secret,
      appId: config.app_id,
      workspaceId: config.workspace_id
    };

    await slackConnector.initialize(connectorConfig);

    // Store sync job info
    const syncJobResult = await query(`
      INSERT INTO slack_sync_jobs (
        sync_type, status, parameters, started_at, started_by
      ) VALUES ('users', 'running', $1, NOW(), $2)
      RETURNING id
    `, [
      JSON.stringify({ syncType: 'users' }),
      req.user.id
    ]);

    const syncJobId = syncJobResult.rows[0].id;

    // Start user synchronization (run in background)
    const syncPromise = slackConnector.syncUsersToEmployees();

    // Handle sync completion/error
    syncPromise.then(async (results) => {
      await query(`
        UPDATE slack_sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          total_users = $2,
          processed_users = $3,
          results = $4
        WHERE id = $5
      `, [
        'completed', 
        results.totalUsers,
        results.newEmployees + results.updatedEmployees,
        JSON.stringify(results), 
        syncJobId
      ]);

      console.log('✅ Slack user sync job completed:', results);
    }).catch(async (error) => {
      await query(`
        UPDATE slack_sync_jobs 
        SET 
          status = $1, 
          completed_at = NOW(), 
          error_message = $2
        WHERE id = $3
      `, ['failed', error.message, syncJobId]);

      console.error('❌ Slack user sync job failed:', error);
    });

    res.json({
      message: 'Slack user synchronization started',
      syncJobId: syncJobId,
      syncType: 'users',
      startedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Slack user sync error:', error);
    res.status(500).json({
      error: 'Failed to start Slack user sync',
      message: error.message,
      code: 'SLACK_USER_SYNC_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/sync/status:
 *   get:
 *     summary: Get Slack sync status
 *     description: Get current Slack synchronization status and progress
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slack sync status retrieved successfully
 */
router.get('/slack/sync/status', requireAuth, async (req, res) => {
  try {
    // Get latest sync job
    const syncJobResult = await query(`
      SELECT * FROM slack_sync_jobs
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Get config for last sync info
    const configResult = await query(`
      SELECT last_sync_at, last_sync_status, last_sync_error
      FROM slack_config
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const syncJob = syncJobResult.rows.length > 0 ? syncJobResult.rows[0] : null;
    const config = configResult.rows.length > 0 ? configResult.rows[0] : null;

    res.json({
      lastSync: config?.last_sync_at || null,
      status: config?.last_sync_status || 'never',
      error: config?.last_sync_error || null,
      currentJob: syncJob ? {
        id: syncJob.id,
        syncType: syncJob.sync_type,
        status: syncJob.status,
        startedAt: syncJob.started_at,
        completedAt: syncJob.completed_at,
        totalChannels: syncJob.total_channels,
        totalMessages: syncJob.total_messages,
        processedMessages: syncJob.processed_messages,
        flaggedMessages: syncJob.flagged_messages,
        totalUsers: syncJob.total_users,
        processedUsers: syncJob.processed_users,
        parameters: syncJob.parameters
      } : null
    });

  } catch (error) {
    console.error('Get Slack sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch Slack sync status',
      code: 'SLACK_SYNC_STATUS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/slack/stats:
 *   get:
 *     summary: Get Slack integration statistics
 *     description: Retrieve statistics about synchronized messages and analysis results
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 */
router.get('/slack/stats', requireAuth, async (req, res) => {
  try {
    // Default stats for when no data exists yet
    const defaultStats = {
      totalChannels: 0,
      totalUsers: 0,
      messagesProcessed: 0,
      violationsDetected: 0,
      riskDistribution: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Check if Slack is configured
    const configResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (configResult.rows.length === 0 || !configResult.rows[0].is_active) {
      return res.json(defaultStats);
    }

    try {
      // Get message statistics
      const messageStatsResult = await query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT channel_id) as total_channels,
          COUNT(DISTINCT sender_employee_id) as total_users,
          COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk,
          COUNT(*) FILTER (WHERE risk_score >= 40 AND risk_score < 70) as medium_risk,
          COUNT(*) FILTER (WHERE risk_score < 40) as low_risk
        FROM slack_messages 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      // Get violations count
      const violationsResult = await query(`
        SELECT COUNT(*) as total_violations
        FROM slack_violations 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const messageStats = messageStatsResult.rows[0] || {};
      const violationStats = violationsResult.rows[0] || {};

      res.json({
        totalChannels: parseInt(messageStats.total_channels) || 0,
        totalUsers: parseInt(messageStats.total_users) || 0,
        messagesProcessed: parseInt(messageStats.total_messages) || 0,
        violationsDetected: parseInt(violationStats.total_violations) || 0,
        riskDistribution: {
          high: parseInt(messageStats.high_risk) || 0,
          medium: parseInt(messageStats.medium_risk) || 0,
          low: parseInt(messageStats.low_risk) || 0
        }
      });

    } catch (tableError) {
      // Tables might not exist yet or have no data
      console.log('Slack stats tables not found or empty, returning default stats');
      res.json(defaultStats);
    }

  } catch (error) {
    console.error('Slack stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch Slack statistics',
      code: 'SLACK_STATS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/integrations/status:
 *   get:
 *     summary: Get integration status overview
 *     description: Returns basic status of all integrations without sensitive configuration data
 *     tags: [Integrations]
 *     responses:
 *       200:
 *         description: Integration status retrieved successfully
 */
router.get('/status', async (req, res) => {
  try {
    const integrations = {
      office365: {
        isConfigured: false,
        isActive: false,
        status: 'not_configured'
      },
      teams: {
        isConfigured: false,
        isActive: false,
        status: 'not_configured'
      },
      google_workspace: {
        isConfigured: false,
        isActive: false,
        status: 'not_configured'
      },
      slack: {
        isConfigured: false,
        isActive: false,
        status: 'not_configured'
      }
    };

    // Check Office 365 configuration
    const office365Result = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (office365Result.rows.length > 0) {
      const config = office365Result.rows[0].value;
      integrations.office365 = {
        isConfigured: Boolean(config.isConfigured),
        isActive: Boolean(config.isActive),
        status: config.isConfigured 
          ? (config.isActive ? 'connected' : 'disabled')
          : 'not_configured'
      };
    }

    // Check Teams configuration
    const teamsResult = await query(`
      SELECT * FROM teams_config WHERE tenant_id = 'default' LIMIT 1
    `);

    if (teamsResult.rows.length > 0 && office365Result.rows.length > 0) {
      const office365Config = office365Result.rows[0].value;
      const teamsConfig = teamsResult.rows[0];
      
      integrations.teams = {
        isConfigured: Boolean(office365Config.isConfigured), // Teams depends on Office 365
        isActive: Boolean(teamsConfig.is_active),
        status: office365Config.isConfigured 
          ? (teamsConfig.is_active ? 'connected' : 'disabled')
          : 'not_configured'
      };
    }

    // Check Google Workspace configuration
    const googleWorkspaceResult = await query(`
      SELECT * FROM google_workspace_config ORDER BY created_at DESC LIMIT 1
    `);

    if (googleWorkspaceResult.rows.length > 0) {
      const config = googleWorkspaceResult.rows[0];
      const isConfigured = Boolean(
        config.service_account_email && 
        config.service_account_key && 
        config.delegated_admin_email && 
        config.domain
      );
      
      integrations.google_workspace = {
        isConfigured: isConfigured,
        isActive: Boolean(config.is_active),
        status: isConfigured 
          ? (config.is_active ? 'connected' : 'disabled')
          : 'not_configured'
      };
    }

    // Check Slack configuration
    const slackResult = await query(`
      SELECT * FROM slack_config ORDER BY created_at DESC LIMIT 1
    `);

    if (slackResult.rows.length > 0) {
      const config = slackResult.rows[0];
      const isConfigured = Boolean(
        config.bot_token && 
        config.workspace_id &&
        config.client_id &&
        config.client_secret
      );
      
      integrations.slack = {
        isConfigured: isConfigured,
        isActive: Boolean(config.is_active),
        status: isConfigured 
          ? (config.is_active ? 'connected' : 'disabled')
          : 'not_configured'
      };
    }

    res.json(integrations);
  } catch (error) {
    console.error('Get integrations status error:', error);
    res.status(500).json({
      error: 'Failed to fetch integration status',
      code: 'INTEGRATIONS_STATUS_ERROR'
    });
  }
});

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * @swagger
 * /api/integrations/office365/stats:
 *   get:
 *     summary: Get Office 365 integration statistics
 *     description: Retrieve statistics about synchronized emails and analysis results
 *     tags: [Integrations]
 *     security:
 *       - sessionAuth: []
 */
router.get('/office365/stats', requireAuth, async (req, res) => {
  try {
    // Default stats for when no data exists yet
    const defaultStats = {
      totalUsers: 0,
      emailsProcessed: 0,
      violationsDetected: 0,
      lastSyncDuration: 0,
      riskDistribution: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Check if Office 365 is configured
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'office365_config'
    `);

    if (configResult.rows.length === 0) {
      return res.json(defaultStats);
    }

    const config = configResult.rows[0].value;
    if (!config.isConfigured || !config.isActive) {
      return res.json(defaultStats);
    }

    try {
      // Get email statistics - handle case where table might not exist or be empty
      const emailStatsResult = await query(`
        SELECT 
          COUNT(*) as total_emails,
          COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk,
          COUNT(*) FILTER (WHERE risk_score >= 40 AND risk_score < 70) as medium_risk,
          COUNT(*) FILTER (WHERE risk_score < 40) as low_risk
        FROM email_communications 
        WHERE integration_source = 'office365'
        AND created_at >= NOW() - INTERVAL '30 days'
      `);

      // Get violations count
      const violationsResult = await query(`
        SELECT COUNT(*) as total_violations
        FROM violations 
        WHERE source = 'office365'
        AND created_at >= NOW() - INTERVAL '30 days'
      `);

      // Get user count from latest sync
      const userCountResult = await query(`
        SELECT 
          (results->>'totalUsers')::integer as user_count
        FROM sync_jobs 
        WHERE integration_type = 'office365' 
        AND status = 'completed'
        ORDER BY completed_at DESC 
        LIMIT 1
      `);

      const emailStats = emailStatsResult.rows[0] || {};
      const violationStats = violationsResult.rows[0] || {};
      const userStats = userCountResult.rows[0] || {};

      res.json({
        totalUsers: userStats.user_count || 0,
        emailsProcessed: parseInt(emailStats.total_emails) || 0,
        violationsDetected: parseInt(violationStats.total_violations) || 0,
        lastSyncDuration: 0,
        riskDistribution: {
          high: parseInt(emailStats.high_risk) || 0,
          medium: parseInt(emailStats.medium_risk) || 0,
          low: parseInt(emailStats.low_risk) || 0
        }
      });

    } catch (tableError) {
      // Tables might not exist yet or have no data
      console.log('Office 365 stats tables not found or empty, returning default stats');
      res.json(defaultStats);
    }

  } catch (error) {
    console.error('Office 365 stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      code: 'O365_STATS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/avatars/{filename}:
 *   get:
 *     summary: Serve user avatar images
 *     description: Serve stored user profile photos
 *     tags: [Integrations]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Avatar filename
 *     responses:
 *       200:
 *         description: Avatar image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/avatars/:filename', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../../public/avatars', filename);
  
  // Security check: ensure filename doesn't contain path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Avatar not found' });
  }
  
  // Serve the image
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.sendFile(filepath);
});

module.exports = router; 