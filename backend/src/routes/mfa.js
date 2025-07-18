const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mfaService = require('../services/mfaService');
const { query } = require('../utils/database');

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * @swagger
 * /api/mfa/status:
 *   get:
 *     summary: Get MFA status for current user
 *     tags: [MFA]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: MFA status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mfaEnabled:
 *                   type: boolean
 *                 mfaLastUsed:
 *                   type: string
 *                   format: date-time
 *                 stats:
 *                   type: object
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await mfaService.getMFAStats(userId);
    
    res.json({
      mfaEnabled: stats.mfa_enabled || false,
      mfaLastUsed: stats.mfa_last_used,
      stats: {
        codesVerified30Days: parseInt(stats.codes_verified_30_days) || 0,
        failedAttempts30Days: parseInt(stats.failed_attempts_30_days) || 0
      }
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      error: 'Failed to get MFA status',
      code: 'MFA_STATUS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/setup/send-code:
 *   post:
 *     summary: Send MFA setup verification code
 *     tags: [MFA]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Setup code sent successfully
 *       400:
 *         description: MFA already enabled
 *       500:
 *         description: Failed to send code
 */
router.post('/setup/send-code', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if MFA is already enabled
    const mfaEnabled = await mfaService.isMFAEnabled(userId);
    if (mfaEnabled) {
      return res.status(400).json({
        error: 'MFA is already enabled for this account',
        code: 'MFA_ALREADY_ENABLED'
      });
    }

    // Send setup code
    const result = await mfaService.sendMFACode(userId, userEmail, 'setup', ipAddress, userAgent);
    
    res.json({
      message: 'Setup verification code sent',
      expiresInMinutes: result.expiresInMinutes
    });

  } catch (error) {
    console.error('MFA setup send code error:', error);
    res.status(500).json({
      error: 'Failed to send setup code',
      code: 'MFA_SETUP_SEND_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/setup/verify:
 *   post:
 *     summary: Verify setup code and enable MFA
 *     tags: [MFA]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *       400:
 *         description: Invalid code or MFA already enabled
 *       429:
 *         description: Too many failed attempts
 *       500:
 *         description: Failed to enable MFA
 */
router.post('/setup/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!code || code.length !== 6) {
      return res.status(400).json({
        error: 'Invalid verification code format',
        code: 'INVALID_CODE_FORMAT'
      });
    }

    // Check if MFA is already enabled
    const mfaEnabled = await mfaService.isMFAEnabled(userId);
    if (mfaEnabled) {
      return res.status(400).json({
        error: 'MFA is already enabled for this account',
        code: 'MFA_ALREADY_ENABLED'
      });
    }

    // Verify the setup code
    const verificationResult = await mfaService.verifyMFACode(userId, code, ipAddress, userAgent);
    
    if (!verificationResult.success) {
      const statusCode = verificationResult.rateLimited ? 429 : 400;
      return res.status(statusCode).json({
        error: verificationResult.error,
        code: verificationResult.rateLimited ? 'RATE_LIMITED' : 'INVALID_CODE',
        retryAfterMinutes: verificationResult.retryAfterMinutes
      });
    }

    // Enable MFA for the user
    await mfaService.enableMFA(userId, ipAddress, userAgent);

    res.json({
      message: 'MFA enabled successfully',
      mfaEnabled: true
    });

  } catch (error) {
    console.error('MFA setup verify error:', error);
    res.status(500).json({
      error: 'Failed to enable MFA',
      code: 'MFA_SETUP_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/disable:
 *   post:
 *     summary: Disable MFA for current user
 *     tags: [MFA]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *       400:
 *         description: Invalid password or MFA not enabled
 *       500:
 *         description: Failed to disable MFA
 */
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!password) {
      return res.status(400).json({
        error: 'Password is required to disable MFA',
        code: 'PASSWORD_REQUIRED'
      });
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const userResult = await query('SELECT password_hash, mfa_enabled FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.mfa_enabled) {
      return res.status(400).json({
        error: 'MFA is not enabled for this account',
        code: 'MFA_NOT_ENABLED'
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(400).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      });
    }

    // Disable MFA
    await mfaService.disableMFA(userId, ipAddress, userAgent);

    res.json({
      message: 'MFA disabled successfully',
      mfaEnabled: false
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      error: 'Failed to disable MFA',
      code: 'MFA_DISABLE_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/send-login-code:
 *   post:
 *     summary: Send login verification code (for MFA-enabled users)
 *     tags: [MFA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Login code sent successfully
 *       400:
 *         description: Invalid email or MFA not enabled
 *       500:
 *         description: Failed to send code
 */
router.post('/send-login-code', async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    // Find user and check if MFA is enabled
    const userResult = await query('SELECT id, mfa_enabled FROM users WHERE email = $1 AND is_active = true', [email]);
    
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists
      return res.status(400).json({
        error: 'Invalid email or MFA not enabled',
        code: 'INVALID_REQUEST'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.mfa_enabled) {
      return res.status(400).json({
        error: 'MFA is not enabled for this account',
        code: 'MFA_NOT_ENABLED'
      });
    }

    // Send login code
    const result = await mfaService.sendMFACode(user.id, email, 'login', ipAddress, userAgent);
    
    res.json({
      message: 'Login verification code sent',
      expiresInMinutes: result.expiresInMinutes
    });

  } catch (error) {
    console.error('MFA send login code error:', error);
    res.status(500).json({
      error: 'Failed to send login code',
      code: 'MFA_LOGIN_SEND_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/verify-login-code:
 *   post:
 *     summary: Verify login code (for MFA login flow)
 *     tags: [MFA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Code verified successfully
 *       400:
 *         description: Invalid code or email
 *       429:
 *         description: Too many failed attempts
 *       500:
 *         description: Failed to verify code
 */
router.post('/verify-login-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!email || !code) {
      return res.status(400).json({
        error: 'Email and code are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (code.length !== 6) {
      return res.status(400).json({
        error: 'Invalid verification code format',
        code: 'INVALID_CODE_FORMAT'
      });
    }

    // Find user
    const userResult = await query('SELECT id, mfa_enabled FROM users WHERE email = $1 AND is_active = true', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid email',
        code: 'INVALID_EMAIL'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.mfa_enabled) {
      return res.status(400).json({
        error: 'MFA is not enabled for this account',
        code: 'MFA_NOT_ENABLED'
      });
    }

    // Verify the login code
    const verificationResult = await mfaService.verifyMFACode(user.id, code, ipAddress, userAgent);
    
    if (!verificationResult.success) {
      const statusCode = verificationResult.rateLimited ? 429 : 400;
      return res.status(statusCode).json({
        error: verificationResult.error,
        code: verificationResult.rateLimited ? 'RATE_LIMITED' : 'INVALID_CODE',
        retryAfterMinutes: verificationResult.retryAfterMinutes
      });
    }

    res.json({
      message: 'Code verified successfully',
      verified: true
    });

  } catch (error) {
    console.error('MFA verify login code error:', error);
    res.status(500).json({
      error: 'Failed to verify code',
      code: 'MFA_VERIFY_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/mfa/test-email:
 *   post:
 *     summary: Send test MFA email (for testing purposes)
 *     tags: [MFA]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: MFA not enabled
 *       500:
 *         description: Failed to send test email
 */
router.post('/test-email', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if MFA is enabled
    const mfaEnabled = await mfaService.isMFAEnabled(userId);
    if (!mfaEnabled) {
      return res.status(400).json({
        error: 'MFA must be enabled to send test email',
        code: 'MFA_NOT_ENABLED'
      });
    }

    // Send test code
    const result = await mfaService.sendMFACode(userId, userEmail, 'setup', ipAddress, userAgent);
    
    res.json({
      message: 'Test email sent successfully',
      expiresInMinutes: result.expiresInMinutes
    });

  } catch (error) {
    console.error('MFA test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      code: 'MFA_TEST_ERROR'
    });
  }
});

module.exports = router; 