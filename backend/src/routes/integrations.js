const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { query } = require('../utils/database');
const office365Connector = require('../services/office365Connector');

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
        clientId: '',
        tenantId: '',
        status: 'not_configured'
      });
    }

    // Don't send client secret in response
    const config = { ...result.rows[0].value };
    if (config.clientSecret) {
      config.clientSecret = '********';
    }

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

    if (!config.isActive) {
      return res.status(400).json({
        error: 'Office 365 integration is disabled',
        code: 'O365_DISABLED'
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
        error: null
      });
    }

    // Get the latest sync job
    const result = await query(`
      SELECT 
        status,
        started_at,
        completed_at,
        error_message,
        progress,
        records_processed
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
        error: null
      });
    }

    const job = result.rows[0];
    const isRunning = job.status === 'running' || job.status === 'starting';

    res.json({
      isRunning,
      status: job.status,
      lastSync: job.completed_at || job.started_at,
      error: job.error_message,
      progress: job.progress,
      recordsProcessed: job.records_processed
    });

  } catch (error) {
    console.error('Get Office 365 sync status error:', error);
    res.status(500).json({
      error: 'Failed to fetch sync status',
      code: 'SYNC_STATUS_ERROR'
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
    // Get email statistics
    const emailStatsResult = await query(`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(*) FILTER (WHERE is_analyzed = true) as analyzed_emails,
        COUNT(*) FILTER (WHERE risk_score >= 80) as critical_emails,
        COUNT(*) FILTER (WHERE risk_score >= 60 AND risk_score < 80) as high_risk_emails,
        COUNT(*) FILTER (WHERE category = 'policy_violation') as violation_emails,
        AVG(risk_score) as avg_risk_score
      FROM email_communications 
      WHERE integration_source = 'office365'
      AND created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get recent violations
    const violationsResult = await query(`
      SELECT 
        COUNT(*) as total_violations,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_violations,
        COUNT(*) FILTER (WHERE severity = 'High') as high_violations
      FROM violations 
      WHERE source = 'email_analysis'
      AND created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get top risk categories
    const riskCategoriesResult = await query(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score
      FROM email_communications 
      WHERE integration_source = 'office365'
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY category
      ORDER BY count DESC
    `);

    const emailStats = emailStatsResult.rows[0];
    const violationStats = violationsResult.rows[0];

    res.json({
      emailStatistics: {
        totalEmails: parseInt(emailStats.total_emails),
        analyzedEmails: parseInt(emailStats.analyzed_emails),
        criticalEmails: parseInt(emailStats.critical_emails),
        highRiskEmails: parseInt(emailStats.high_risk_emails),
        violationEmails: parseInt(emailStats.violation_emails),
        averageRiskScore: Math.round(emailStats.avg_risk_score || 0)
      },
      violationStatistics: {
        totalViolations: parseInt(violationStats.total_violations),
        criticalViolations: parseInt(violationStats.critical_violations),
        highViolations: parseInt(violationStats.high_violations)
      },
      riskCategories: riskCategoriesResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        averageRiskScore: Math.round(row.avg_risk_score)
      })),
      period: 'Last 30 days',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Office 365 stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      code: 'O365_STATS_ERROR'
    });
  }
});

module.exports = router; 