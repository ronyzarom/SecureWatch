const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/database');
const { requireAuth, rateLimit } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password, create session
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: admin@company.com
 *             password: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: securewatch.session=abc123; Path=/; HttpOnly
 *       400:
 *         description: Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Email and password are required
 *               code: MISSING_CREDENTIALS
 *       401:
 *         description: Invalid credentials or account inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid email or password
 *               code: INVALID_CREDENTIALS
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Too many requests
 *               code: RATE_LIMIT_EXCEEDED
 *               retryAfter: 900
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Login endpoint
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔍 Login attempt for:', email);

    // Input validation
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    console.log('🔍 Querying database for user...');
    // Find user by email
    const result = await query(
      'SELECT id, email, name, role, department, password_hash, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email);

    // Check if account is active
    if (!user.is_active) {
      console.log('❌ Account inactive');
      return res.status(401).json({
        error: 'Account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    console.log('🔍 Verifying password...');
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ Password verified');
    console.log('🔍 Creating session...');

    // Create session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          error: 'Login failed',
          code: 'SESSION_ERROR'
        });
      }

      console.log('✅ Session saved successfully');

      // Update last login
      query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
        .catch(err => console.error('Error updating last login:', err));

      console.log('✅ Login successful for:', user.email);

      // Return user data (without password)
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department
        }
      });
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Destroy user session and clear session cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       500:
 *         description: Session error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        code: 'SESSION_ERROR'
      });
    }

    res.clearCookie('securewatch.session');
    res.json({ 
      message: 'Logout successful' 
    });
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get information about the currently logged-in user
 *     tags: [Authentication]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get current user endpoint
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      department: req.user.department
    }
  });
});

// Check session status
router.get('/status', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.json({
        authenticated: false,
        sessionId: null
      });
    }

    // Get user details from database (same check as requireAuth middleware)
    const result = await query(
      'SELECT id, email, name, role, department, is_active FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      // User not found, clear session
      req.session.destroy();
      return res.json({
        authenticated: false,
        sessionId: null,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      req.session.destroy();
      return res.json({
        authenticated: false,
        sessionId: null,
        error: 'Account deactivated'
      });
    }

    // Return authenticated status with user info
    res.json({
      authenticated: true,
      sessionId: req.session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Auth status check failed:', error);
    res.json({
      authenticated: false,
      sessionId: null,
      error: 'Database error'
    });
  }
});

// Change password endpoint
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get current user with password
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'SERVER_ERROR'
    });
  }
});

// Update profile endpoint
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, department } = req.body;

    // Input validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Name is required',
        code: 'MISSING_NAME'
      });
    }

    // Update profile
    const result = await query(
      `UPDATE users 
       SET name = $1, department = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, email, name, role, department`,
      [name.trim(), department?.trim() || null, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router; 