const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/database');
const { requireAuth, rateLimit } = require('../middleware/auth');
const { generateToken } = require('../middleware/jwt-auth');
const mfaService = require('../services/mfaService');

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
// Simple login form for testing (add this before the POST login route)
router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SecureWatch Login</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
            button:hover { background: #0056b3; }
            .error { color: red; margin-top: 10px; }
            .success { color: green; margin-top: 10px; }
        </style>
    </head>
    <body>
        <h2>SecureWatch Admin Login</h2>
        <form id="loginForm">
            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="email" value="admin@company.com" required>
            </div>
            <div class="form-group">
                <label>Password:</label>
                <input type="password" id="password" value="admin123" required>
            </div>
            <button type="submit">Login</button>
        </form>
        <div id="message"></div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const messageDiv = document.getElementById('message');

                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        messageDiv.innerHTML = '<div class="success">✅ Login successful! You can now close this tab and return to the app.</div>';
                        setTimeout(() => {
                            window.close();
                        }, 2000);
                    } else {
                        messageDiv.innerHTML = '<div class="error">❌ ' + data.error + '</div>';
                    }
                } catch (error) {
                    messageDiv.innerHTML = '<div class="error">❌ Network error: ' + error.message + '</div>';
                }
            });
        </script>
    </body>
    </html>
  `);
});

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
    
    // Check if MFA is enabled for this user
    const mfaEnabled = await mfaService.isMFAEnabled(user.id);
    
    if (mfaEnabled) {
      console.log('🔐 MFA required for user:', user.email);
      
      // Send MFA code
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      try {
        await mfaService.sendMFACode(user.id, user.email, 'login', ipAddress, userAgent);
        
        // Store partial login state (without creating full session)
        req.session.partialLogin = {
          userId: user.id,
          email: user.email,
          timestamp: Date.now()
        };
        
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({
              error: 'Login failed',
              code: 'SESSION_ERROR'
            });
          }
          
          console.log('📧 MFA code sent to:', user.email);
          
          res.json({
            message: 'MFA code sent',
            mfaRequired: true,
            email: user.email
          });
        });
        
      } catch (mfaError) {
        console.error('❌ MFA code send error:', mfaError);
        return res.status(500).json({
          error: 'Failed to send verification code',
          code: 'MFA_SEND_ERROR'
        });
      }
      
    } else {
      // Normal login flow without MFA
      console.log('🔍 Creating session...');

      // Create session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      };
      
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
    }

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
 * /api/auth/complete-login:
 *   post:
 *     summary: Complete login with MFA verification
 *     tags: [Authentication]
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
 *                 description: 6-digit MFA verification code
 *     responses:
 *       200:
 *         description: Login completed successfully
 *       400:
 *         description: Invalid code or no partial login
 *       429:
 *         description: Too many failed attempts
 */
router.post('/complete-login', authRateLimit, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Verification code is required',
        code: 'CODE_REQUIRED'
      });
    }
    
    // Check for partial login state
    if (!req.session.partialLogin) {
      return res.status(400).json({
        error: 'No pending login found. Please start login process again.',
        code: 'NO_PARTIAL_LOGIN'
      });
    }
    
    const { userId, email, timestamp } = req.session.partialLogin;
    
    // Check if partial login is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      delete req.session.partialLogin;
      return res.status(400).json({
        error: 'Login session expired. Please start login process again.',
        code: 'LOGIN_EXPIRED'
      });
    }
    
    console.log('🔐 Verifying MFA code for user:', email);
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Verify MFA code
    const verificationResult = await mfaService.verifyMFACode(userId, code, ipAddress, userAgent);
    
    if (!verificationResult.success) {
      console.log('❌ MFA verification failed:', verificationResult.error);
      
      const statusCode = verificationResult.rateLimited ? 429 : 400;
      return res.status(statusCode).json({
        error: verificationResult.error,
        code: verificationResult.rateLimited ? 'RATE_LIMITED' : 'INVALID_CODE',
        retryAfterMinutes: verificationResult.retryAfterMinutes
      });
    }
    
    console.log('✅ MFA code verified successfully');
    
    // Get user details for session
    const userResult = await query(
      'SELECT id, email, name, role, department FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      delete req.session.partialLogin;
      return res.status(400).json({
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = userResult.rows[0];
    
    // Create full session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    };
    
    // Clear partial login
    delete req.session.partialLogin;
    
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          error: 'Login failed',
          code: 'SESSION_ERROR'
        });
      }
      
      console.log('✅ Full session created for:', user.email);
      
      // Update last login
      query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])
        .catch(err => console.error('Error updating last login:', err));
      
      console.log('✅ MFA login completed for:', user.email);
      
      res.json({
        message: 'Login completed successfully',
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
    console.error('❌ Complete login error:', error);
    res.status(500).json({
      error: 'Login completion failed',
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

/**
 * @swagger
 * /api/auth/jwt-token:
 *   post:
 *     summary: Generate JWT token
 *     description: Authenticate user and return JWT token for API access
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@company.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: JWT token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                 expiresIn:
 *                   type: string
 *                   example: 24h
 */
router.post('/jwt-token', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔍 JWT token request for:', email);

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, name, role, department, password_hash, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    console.log('✅ JWT token generated for:', user.email);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      },
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('JWT token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate JWT token',
      code: 'JWT_GENERATION_ERROR'
    });
  }
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