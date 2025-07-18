const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Get user notification settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT settings FROM notification_preferences 
      WHERE user_id = $1
    `, [userId]);

    let settings = {
      emailEnabled: true,
      inAppEnabled: true,
      criticalOnly: false,
      categories: {
        security: true,
        system: true,
        user: true,
        policy: true,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
    };

    if (result.rows.length > 0) {
      settings = { ...settings, ...result.rows[0].settings };
    }

    res.json({ settings });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch notification settings',
      code: 'SETTINGS_ERROR'
    });
  }
});

// Update user notification settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    await query(`
      INSERT INTO notification_preferences (user_id, settings, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET settings = $2, updated_at = NOW()
    `, [userId, JSON.stringify(settings)]);

    res.json({
      message: 'Notification settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      error: 'Failed to update notification settings',
      code: 'SETTINGS_UPDATE_ERROR'
    });
  }
});

// Get user notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread === 'true';

    let whereClause = 'WHERE user_id = $1';
    let params = [userId];

    if (unreadOnly) {
      whereClause += ' AND read = false';
    }

    const result = await query(`
      SELECT 
        id, type, title, message, timestamp, read, action_url,
        employee_id, violation_id, priority, category
      FROM notifications 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const totalResult = await query(`
      SELECT COUNT(*) as total FROM notifications ${whereClause}
    `, params);

    const unreadResult = await query(`
      SELECT COUNT(*) as unread FROM notifications 
      WHERE user_id = $1 AND read = false
    `, [userId]);

    res.json({
      notifications: result.rows,
      total: parseInt(totalResult.rows[0].total),
      unread: parseInt(unreadResult.rows[0].unread),
      hasMore: offset + limit < parseInt(totalResult.rows[0].total)
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      code: 'NOTIFICATIONS_ERROR'
    });
  }
});

// Mark notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(`
      UPDATE notifications 
      SET read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification marked as read',
      id: notificationId
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      code: 'MARK_READ_ERROR'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(`
      UPDATE notifications 
      SET read = true, read_at = NOW()
      WHERE user_id = $1 AND read = false
      RETURNING id
    `, [userId]);

    res.json({
      message: 'All notifications marked as read',
      count: result.rows.length
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      code: 'MARK_ALL_READ_ERROR'
    });
  }
});

// Delete notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification deleted successfully',
      id: notificationId
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      code: 'DELETE_ERROR'
    });
  }
});

// Create notification (internal use)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      priority = 'medium',
      category = 'system',
      actionUrl,
      employeeId,
      violationId
    } = req.body;

    const result = await query(`
      INSERT INTO notifications (
        user_id, type, title, message, priority, category,
        action_url, employee_id, violation_id, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, timestamp
    `, [userId, type, title, message, priority, category, actionUrl, employeeId, violationId]);

    const notification = {
      id: result.rows[0].id,
      userId,
      type,
      title,
      message,
      timestamp: result.rows[0].timestamp,
      read: false,
      priority,
      category,
      actionUrl,
      employeeId,
      violationId
    };

    // Send email notification if enabled
    try {
      const settingsResult = await query(`
        SELECT settings FROM notification_preferences 
        WHERE user_id = $1
      `, [userId]);

      const userSettings = settingsResult.rows.length > 0 
        ? settingsResult.rows[0].settings 
        : { emailEnabled: true };

      if (userSettings.emailEnabled) {
        const userResult = await query(`
          SELECT email FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows.length > 0) {
          await emailService.sendNotification(
            userResult.rows[0].email,
            `SecureWatch Alert: ${title}`,
            message
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      code: 'CREATE_ERROR'
    });
  }
});

// Send test notification
router.post('/test', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const testNotification = {
      userId,
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      priority: 'low',
      category: 'system'
    };

    // Create the notification
    const result = await query(`
      INSERT INTO notifications (
        user_id, type, title, message, priority, category, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, timestamp
    `, [userId, testNotification.type, testNotification.title, testNotification.message, 
        testNotification.priority, testNotification.category]);

    res.json({
      message: 'Test notification sent successfully',
      notification: {
        ...testNotification,
        id: result.rows[0].id,
        timestamp: result.rows[0].timestamp,
        read: false
      }
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      code: 'TEST_ERROR'
    });
  }
});

module.exports = router; 