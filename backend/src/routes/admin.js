const express = require('express');
const router = express.Router();
const { initializeDatabase } = require('../../database/init');
const { query } = require('../utils/database');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints
 */

/**
 * @swagger
 * /api/admin/init-db:
 *   post:
 *     summary: Initialize database with sample data
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Database initialized successfully
 *       500:
 *         description: Database initialization failed
 */
router.post('/init-db', async (req, res) => {
  try {
    console.log('🔧 Database initialization requested...');
    await initializeDatabase();
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      credentials: {
        email: 'admin@company.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database initialization failed'
    });
  }
});

/**
 * @swagger
 * /api/admin/status:
 *   get:
 *     summary: Get system status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: System status information
 */
router.get('/status', async (req, res) => {
  try {
    // Check if users table exists and has data
    const userCount = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const adminCount = await query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
    
    res.json({
      database: {
        connected: true,
        users: parseInt(userCount.rows[0].count),
        admins: parseInt(adminCount.rows[0].count)
      },
      initialized: parseInt(userCount.rows[0].count) > 0
    });
  } catch (error) {
    res.status(500).json({
      database: {
        connected: false,
        error: error.message
      },
      initialized: false
    });
  }
});

module.exports = router; 