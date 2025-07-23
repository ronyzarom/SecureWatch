const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All user management routes require authentication
router.use(requireAuth);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, name, role, department, is_active, 
        last_login, created_at, updated_at
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    res.json({
      users: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        department: row.department,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      code: 'USERS_ERROR'
    });
  }
});

// Get single user (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    const result = await query(`
      SELECT 
        id, email, name, role, department, is_active,
        last_login, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      code: 'USER_ERROR'
    });
  }
});

// Create new user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;

    // Input validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (role && !['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(`
      INSERT INTO users (email, password_hash, name, role, department)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, department, is_active, created_at
    `, [
      email.toLowerCase().trim(),
      passwordHash,
      name.trim(),
      role || 'viewer',
      department?.trim() || null
    ]);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        role: result.rows[0].role,
        department: result.rows[0].department,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Create user error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Email address already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to create user',
      code: 'CREATE_ERROR'
    });
  }
});

// Update user (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, name, role, department, isActive } = req.body;
    
    console.log('PUT /api/users/:id - Update request:', {
      userId,
      body: req.body
    });

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    // Validate role if provided
    if (role && !['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        code: 'INVALID_ROLE'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email.toLowerCase().trim());
    }

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (role) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }

    if (department !== undefined) {
      paramCount++;
      updates.push(`department = $${paramCount}`);
      values.push(department?.trim() || null);
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Add updated_at (without incrementing paramCount since it uses NOW())
    updates.push(`updated_at = NOW()`);

    // Add user ID for WHERE clause
    paramCount++;
    values.push(userId);
    
    console.log('Update query debug:', {
      updates: updates.join(', '),
      values,
      paramCount,
      whereClause: `WHERE id = $${paramCount}`
    });

    const result = await query(`
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, department, is_active, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail,
      userId,
      requestBody: req.body
    });

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Email address already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to update user',
      code: 'UPDATE_ERROR',
      details: error.message
    });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const result = await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW() 
      WHERE id = $2
      RETURNING id, email, name
    `, [passwordHash, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Password reset successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'RESET_ERROR'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    // Prevent admin from deleting their own account
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Soft delete - set is_active to false
    console.log(`Deactivating user ID: ${userId}`);
    const result = await query(`
      UPDATE users 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1
      RETURNING id, email, name
    `, [userId]);
    
    console.log(`User deactivated:`, result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'User deactivated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'DELETE_ERROR'
    });
  }
});

// Get user roles list
router.get('/meta/roles', requireAdmin, (req, res) => {
  res.json({
    roles: [
      { 
        name: 'admin', 
        label: 'Administrator',
        description: 'Full system access and user management'
      },
      { 
        name: 'analyst', 
        label: 'Security Analyst',
        description: 'Can view and manage employee data and violations'
      },
      { 
        name: 'viewer', 
        label: 'Viewer',
        description: 'Read-only access to dashboard and reports'
      }
    ]
  });
});

module.exports = router; 