const express = require('express');
const { query } = require('../utils/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// All settings routes require authentication
router.use(requireAuth);

// Get all settings (viewable by all authenticated users)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT key, value, updated_at
      FROM app_settings
      ORDER BY key
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        updatedAt: row.updated_at
      };
    });

    res.json({ settings });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      code: 'SETTINGS_ERROR'
    });
  }
});

// Get specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const result = await query(`
      SELECT key, value, updated_at
      FROM app_settings
      WHERE key = $1
    `, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Setting not found',
        code: 'SETTING_NOT_FOUND'
      });
    }

    const setting = result.rows[0];

    res.json({
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updated_at
    });

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      error: 'Failed to fetch setting',
      code: 'SETTING_ERROR'
    });
  }
});

// Update setting (admin only)
router.put('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value || typeof value !== 'object') {
      return res.status(400).json({
        error: 'Setting value must be a valid JSON object',
        code: 'INVALID_VALUE'
      });
    }

    // Validate specific settings
    const validationError = validateSetting(key, value);
    if (validationError) {
      return res.status(400).json({
        error: validationError,
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = NOW()
      RETURNING key, value, updated_at
    `, [key, JSON.stringify(value)]);

    res.json({
      message: 'Setting updated successfully',
      key: result.rows[0].key,
      value: result.rows[0].value,
      updatedAt: result.rows[0].updated_at
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      error: 'Failed to update setting',
      code: 'UPDATE_ERROR'
    });
  }
});

// Company information routes
router.get('/company/info', async (req, res) => {
  try {
    const result = await query(`
      SELECT value FROM app_settings WHERE key = 'company_info'
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Company information not found',
        code: 'COMPANY_INFO_NOT_FOUND'
      });
    }

    res.json({ companyInfo: result.rows[0].value });

  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({
      error: 'Failed to fetch company information',
      code: 'COMPANY_INFO_ERROR'
    });
  }
});

router.put('/company/info', requireAdmin, async (req, res) => {
  try {
    const { name, domain, address, phone, industry, employeeCount, logoUrl } = req.body;

    if (!name || !domain) {
      return res.status(400).json({
        error: 'Company name and domain are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const companyInfo = {
      name: name.trim(),
      domain: domain.trim(),
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      industry: industry?.trim() || '',
      employee_count: parseInt(employeeCount) || 0,
      logo_url: logoUrl?.trim() || ''
    };

    const result = await query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('company_info', $1, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING value, updated_at
    `, [JSON.stringify(companyInfo)]);

    res.json({
      message: 'Company information updated successfully',
      companyInfo: result.rows[0].value,
      updatedAt: result.rows[0].updated_at
    });

  } catch (error) {
    console.error('Update company info error:', error);
    res.status(500).json({
      error: 'Failed to update company information',
      code: 'COMPANY_UPDATE_ERROR'
    });
  }
});

// Email configuration routes
router.get('/email/config', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT value FROM app_settings WHERE key = 'email_config'
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email configuration not found',
        code: 'EMAIL_CONFIG_NOT_FOUND'
      });
    }

    // Don't send password in response
    const emailConfig = { ...result.rows[0].value };
    if (emailConfig.password) {
      emailConfig.password = '********';
    }

    res.json({ emailConfig });

  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({
      error: 'Failed to fetch email configuration',
      code: 'EMAIL_CONFIG_ERROR'
    });
  }
});

router.put('/email/config', requireAdmin, async (req, res) => {
  try {
    const { host, port, encryption, username, password, fromAddress } = req.body;

    if (!host || !port || !username) {
      return res.status(400).json({
        error: 'Host, port, and username are required',
        code: 'MISSING_EMAIL_FIELDS'
      });
    }

    // Get existing config to preserve password if needed
    let existingPassword = '';
    let existingFromAddress = '';
    try {
      const existingResult = await query(`
        SELECT value FROM app_settings WHERE key = 'email_config'
      `);
      if (existingResult.rows.length > 0) {
        const existingConfig = existingResult.rows[0].value;
        existingPassword = existingConfig.password || '';
        existingFromAddress = existingConfig.fromAddress || '';
      }
    } catch (err) {
      // No existing config, continue with empty values
    }

    const emailConfig = {
      host: host.trim(),
      port: parseInt(port),
      encryption: encryption || 'ssl',
      username: username.trim(),
      password: password || existingPassword, // Use existing password if no new password provided
      fromAddress: fromAddress ? fromAddress.trim() : (existingFromAddress || username.trim())
    };

    if (emailConfig.port < 1 || emailConfig.port > 65535) {
      return res.status(400).json({
        error: 'Port must be between 1 and 65535',
        code: 'INVALID_PORT'
      });
    }

    if (!['ssl', 'tls', 'none'].includes(emailConfig.encryption)) {
      return res.status(400).json({
        error: 'Encryption must be ssl, tls, or none',
        code: 'INVALID_ENCRYPTION'
      });
    }

    const result = await query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('email_config', $1, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING updated_at
    `, [JSON.stringify(emailConfig)]);

    // Return config without password
    const responseConfig = { ...emailConfig };
    responseConfig.password = '********';

    res.json({
      message: 'Email configuration updated successfully',
      emailConfig: responseConfig,
      updatedAt: result.rows[0].updated_at
    });

  } catch (error) {
    console.error('Update email config error:', error);
    res.status(500).json({
      error: 'Failed to update email configuration',
      code: 'EMAIL_UPDATE_ERROR'
    });
  }
});

// Test email configuration
router.post('/email/test', requireAdmin, async (req, res) => {
  try {
    const { host, port, encryption, username, password } = req.body;

    if (!host || !port || !username) {
      return res.status(400).json({
        error: 'Host, port, and username are required for testing',
        code: 'MISSING_EMAIL_FIELDS'
      });
    }

    // Get saved password if no password provided
    let testPassword = password;
    if (!testPassword) {
      try {
        const savedResult = await query(`
          SELECT value FROM app_settings WHERE key = 'email_config'
        `);
        if (savedResult.rows.length > 0) {
          const savedConfig = savedResult.rows[0].value;
          testPassword = savedConfig.password || '';
        }
      } catch (err) {
        // Continue with empty password if no saved config
      }
    }

    if (!testPassword) {
      return res.status(400).json({
        error: 'Password is required for testing',
        code: 'MISSING_PASSWORD'
      });
    }

    const testConfig = {
      host: host.trim(),
      port: parseInt(port),
      secure: encryption === 'ssl', // true for SSL (port 465), false for other ports
      auth: {
        user: username.trim(),
        pass: testPassword
      },
      // Allow self-signed certificates for all connection types
      tls: {
        rejectUnauthorized: false
      }
    };

    // Handle TLS configuration
    if (encryption === 'tls') {
      testConfig.secure = false;
      testConfig.tls = {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      };
    }

    // Handle no encryption
    if (encryption === 'none') {
      testConfig.secure = false;
      testConfig.tls = {
        rejectUnauthorized: false
      };
    }

    // Create transporter and test connection
    const transporter = nodemailer.createTransport(testConfig);
    
    // Test the connection
    await transporter.verify();

    res.json({
      message: 'Email connection test successful',
      status: 'success'
    });

  } catch (error) {
    console.error('Email connection test error:', error);
    res.status(400).json({
      error: error.message || 'Email connection test failed',
      code: 'EMAIL_TEST_FAILED'
    });
  }
});

// Dashboard configuration routes
router.get('/dashboard/config', async (req, res) => {
  try {
    const result = await query(`
      SELECT value FROM app_settings WHERE key = 'dashboard_config'
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard configuration not found',
        code: 'DASHBOARD_CONFIG_NOT_FOUND'
      });
    }

    res.json({ dashboardConfig: result.rows[0].value });

  } catch (error) {
    console.error('Get dashboard config error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard configuration',
      code: 'DASHBOARD_CONFIG_ERROR'
    });
  }
});

router.put('/dashboard/config', requireAdmin, async (req, res) => {
  try {
    const { refreshInterval, defaultView, alertsEnabled, autoRefresh } = req.body;

    const dashboardConfig = {
      refresh_interval: parseInt(refreshInterval) || 30,
      default_view: defaultView || 'high-risk',
      alerts_enabled: alertsEnabled !== false, // Default to true
      auto_refresh: autoRefresh !== false // Default to true
    };

    if (dashboardConfig.refresh_interval < 5 || dashboardConfig.refresh_interval > 300) {
      return res.status(400).json({
        error: 'Refresh interval must be between 5 and 300 seconds',
        code: 'INVALID_REFRESH_INTERVAL'
      });
    }

    const validViews = ['high-risk', 'all-employees', 'violations', 'departments'];
    if (!validViews.includes(dashboardConfig.default_view)) {
      return res.status(400).json({
        error: 'Invalid default view',
        code: 'INVALID_DEFAULT_VIEW'
      });
    }

    const result = await query(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('dashboard_config', $1, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = NOW()
      RETURNING value, updated_at
    `, [JSON.stringify(dashboardConfig)]);

    res.json({
      message: 'Dashboard configuration updated successfully',
      dashboardConfig: result.rows[0].value,
      updatedAt: result.rows[0].updated_at
    });

  } catch (error) {
    console.error('Update dashboard config error:', error);
    res.status(500).json({
      error: 'Failed to update dashboard configuration',
      code: 'DASHBOARD_UPDATE_ERROR'
    });
  }
});

// Setting validation function
function validateSetting(key, value) {
  switch (key) {
    case 'company_info':
      if (!value.name || !value.domain) {
        return 'Company name and domain are required';
      }
      break;
    
    case 'email_config':
      if (!value.host || !value.port || !value.username) {
        return 'Host, port, and username are required for email configuration';
      }
      if (typeof value.port !== 'number' || value.port < 1 || value.port > 65535) {
        return 'Port must be a number between 1 and 65535';
      }
      break;
    
    case 'dashboard_config':
      if (value.refresh_interval && (value.refresh_interval < 5 || value.refresh_interval > 300)) {
        return 'Refresh interval must be between 5 and 300 seconds';
      }
      break;
    
    default:
      // Allow custom settings without validation
      break;
  }
  
  return null; // No validation error
}

module.exports = router; 