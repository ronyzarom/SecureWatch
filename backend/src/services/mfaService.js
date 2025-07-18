const crypto = require('crypto');
const { query } = require('../utils/database');
const emailService = require('./emailService');

class MFAService {
  constructor() {
    this.settings = {
      codeLength: 6,
      expiryMinutes: 10,
      maxAttempts: 3,
      lockoutMinutes: 15
    };
    
    // Load settings from database on startup
    this.loadSettings();
  }

  // Load MFA settings from database
  async loadSettings() {
    try {
      const result = await query('SELECT setting_key, setting_value FROM mfa_settings');
      result.rows.forEach(row => {
        switch (row.setting_key) {
          case 'mfa_code_length':
            this.settings.codeLength = parseInt(row.setting_value);
            break;
          case 'mfa_code_expiry_minutes':
            this.settings.expiryMinutes = parseInt(row.setting_value);
            break;
          case 'mfa_max_attempts':
            this.settings.maxAttempts = parseInt(row.setting_value);
            break;
          case 'mfa_lockout_minutes':
            this.settings.lockoutMinutes = parseInt(row.setting_value);
            break;
        }
      });
    } catch (error) {
      console.error('Failed to load MFA settings:', error.message);
    }
  }

  // Generate a random numeric code
  generateCode(length = this.settings.codeLength) {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Generate and send MFA code via email
  async sendMFACode(userId, email, codeType = 'login', ipAddress = null, userAgent = null) {
    try {
      // Clean up any existing unused codes for this user
      await this.cleanupUserCodes(userId);

      // Generate new code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.settings.expiryMinutes * 60 * 1000);

      // Store code in database
      const insertResult = await query(`
        INSERT INTO mfa_codes (user_id, code, code_type, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userId, code, codeType, expiresAt, ipAddress, userAgent]);

      if (insertResult.rows.length === 0) {
        throw new Error('Failed to store MFA code');
      }

      // Send email with code
      await this.sendCodeEmail(email, code, codeType, expiresAt);

      // Log the event
      await this.logMFAEvent(userId, 'code_sent', ipAddress, userAgent, {
        codeType,
        expiresAt: expiresAt.toISOString()
      });

      return {
        success: true,
        expiresAt,
        expiresInMinutes: this.settings.expiryMinutes
      };

    } catch (error) {
      console.error('Failed to send MFA code:', error);
      throw new Error('Failed to send verification code');
    }
  }

  // Send MFA code via email
  async sendCodeEmail(email, code, codeType, expiresAt) {
    const expiryText = `${this.settings.expiryMinutes} minutes`;
    
    let subject, htmlContent, textContent;
    
    if (codeType === 'setup') {
      subject = 'SecureWatch - MFA Setup Verification';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F9CF9;">SecureWatch MFA Setup</h2>
          <p>You are setting up Multi-Factor Authentication for your SecureWatch account.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 32px; letter-spacing: 8px; color: #2563eb;">${code}</h3>
          </div>
          <p><strong>This code will expire in ${expiryText}.</strong></p>
          <p>If you didn't request this setup, please contact your system administrator immediately.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">SecureWatch Security Team</p>
        </div>
      `;
      textContent = `
SecureWatch MFA Setup

You are setting up Multi-Factor Authentication for your SecureWatch account.

Verification Code: ${code}

This code will expire in ${expiryText}.

If you didn't request this setup, please contact your system administrator immediately.

- SecureWatch Security Team
      `;
    } else {
      subject = 'SecureWatch - Login Verification Code';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F9CF9;">SecureWatch Login Verification</h2>
          <p>Someone is attempting to sign in to your SecureWatch account.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 32px; letter-spacing: 8px; color: #2563eb;">${code}</h3>
          </div>
          <p><strong>This code will expire in ${expiryText}.</strong></p>
          <p><strong>Time:</strong> ${expiresAt.toLocaleString()}</p>
          <p>If this wasn't you, please contact your system administrator immediately and change your password.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">SecureWatch Security Team</p>
        </div>
      `;
      textContent = `
SecureWatch Login Verification

Someone is attempting to sign in to your SecureWatch account.

Verification Code: ${code}

This code will expire in ${expiryText}.
Time: ${expiresAt.toLocaleString()}

If this wasn't you, please contact your system administrator immediately and change your password.

- SecureWatch Security Team
      `;
    }

    await emailService.sendNotification(
      email,
      subject,
      textContent,
      htmlContent
    );
  }

  // Verify MFA code
  async verifyMFACode(userId, code, ipAddress = null, userAgent = null) {
    try {
      // Check for recent failed attempts (rate limiting)
      const recentAttempts = await query(`
        SELECT COUNT(*) as attempt_count
        FROM mfa_audit_log 
        WHERE user_id = $1 
          AND event_type = 'code_failed' 
          AND created_at > NOW() - INTERVAL '${this.settings.lockoutMinutes} minutes'
      `, [userId]);

      if (parseInt(recentAttempts.rows[0].attempt_count) >= this.settings.maxAttempts) {
        await this.logMFAEvent(userId, 'rate_limited', ipAddress, userAgent, {
          attemptCount: recentAttempts.rows[0].attempt_count
        });
        
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          rateLimited: true,
          retryAfterMinutes: this.settings.lockoutMinutes
        };
      }

      // Find valid, unused code
      const codeResult = await query(`
        SELECT id, code_type, expires_at 
        FROM mfa_codes 
        WHERE user_id = $1 
          AND code = $2 
          AND expires_at > NOW() 
          AND used_at IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId, code]);

      if (codeResult.rows.length === 0) {
        // Log failed attempt
        await this.logMFAEvent(userId, 'code_failed', ipAddress, userAgent, {
          reason: 'invalid_or_expired_code',
          submittedCode: code.substring(0, 2) + '****' // Partial logging for security
        });

        return {
          success: false,
          error: 'Invalid or expired verification code'
        };
      }

      const codeRecord = codeResult.rows[0];

      // Mark code as used
      await query(`
        UPDATE mfa_codes 
        SET used_at = NOW() 
        WHERE id = $1
      `, [codeRecord.id]);

      // Update user's MFA last used timestamp
      await query(`
        UPDATE users 
        SET mfa_last_used = NOW() 
        WHERE id = $1
      `, [userId]);

      // Log successful verification
      await this.logMFAEvent(userId, 'code_verified', ipAddress, userAgent, {
        codeType: codeRecord.code_type
      });

      // Clean up old codes for this user
      await this.cleanupUserCodes(userId);

      return {
        success: true,
        codeType: codeRecord.code_type
      };

    } catch (error) {
      console.error('MFA verification error:', error);
      throw new Error('Failed to verify code');
    }
  }

  // Enable MFA for user
  async enableMFA(userId, ipAddress = null, userAgent = null) {
    try {
      await query(`
        UPDATE users 
        SET mfa_enabled = true, mfa_secret = $2
        WHERE id = $1
      `, [userId, crypto.randomBytes(32).toString('hex')]);

      await this.logMFAEvent(userId, 'enabled', ipAddress, userAgent);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to enable MFA:', error);
      throw new Error('Failed to enable MFA');
    }
  }

  // Disable MFA for user
  async disableMFA(userId, ipAddress = null, userAgent = null) {
    try {
      await query(`
        UPDATE users 
        SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL
        WHERE id = $1
      `, [userId]);

      // Clean up all codes for this user
      await query('DELETE FROM mfa_codes WHERE user_id = $1', [userId]);

      await this.logMFAEvent(userId, 'disabled', ipAddress, userAgent);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      throw new Error('Failed to disable MFA');
    }
  }

  // Check if user has MFA enabled
  async isMFAEnabled(userId) {
    try {
      const result = await query(`
        SELECT mfa_enabled 
        FROM users 
        WHERE id = $1
      `, [userId]);

      return result.rows.length > 0 ? result.rows[0].mfa_enabled : false;
    } catch (error) {
      console.error('Failed to check MFA status:', error);
      return false;
    }
  }

  // Clean up expired and used codes for a user
  async cleanupUserCodes(userId) {
    try {
      await query(`
        DELETE FROM mfa_codes 
        WHERE user_id = $1 
          AND (expires_at < NOW() OR used_at IS NOT NULL)
      `, [userId]);
    } catch (error) {
      console.error('Failed to cleanup user codes:', error);
    }
  }

  // Clean up all expired codes (scheduled task)
  async cleanupExpiredCodes() {
    try {
      const result = await query(`
        DELETE FROM mfa_codes 
        WHERE expires_at < NOW() OR used_at IS NOT NULL
      `);
      
      console.log(`Cleaned up ${result.rowCount} expired MFA codes`);
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup expired codes:', error);
      return 0;
    }
  }

  // Log MFA events for audit purposes
  async logMFAEvent(userId, eventType, ipAddress = null, userAgent = null, details = {}) {
    try {
      await query(`
        INSERT INTO mfa_audit_log (user_id, event_type, ip_address, user_agent, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, eventType, ipAddress, userAgent, JSON.stringify(details)]);
    } catch (error) {
      console.error('Failed to log MFA event:', error);
    }
  }

  // Get MFA statistics for user
  async getMFAStats(userId) {
    try {
      const stats = await query(`
        SELECT 
          (SELECT mfa_enabled FROM users WHERE id = $1) as mfa_enabled,
          (SELECT mfa_last_used FROM users WHERE id = $1) as mfa_last_used,
          (
            SELECT COUNT(*) 
            FROM mfa_audit_log 
            WHERE user_id = $1 AND event_type = 'code_verified'
              AND created_at > NOW() - INTERVAL '30 days'
          ) as codes_verified_30_days,
          (
            SELECT COUNT(*) 
            FROM mfa_audit_log 
            WHERE user_id = $1 AND event_type = 'code_failed'
              AND created_at > NOW() - INTERVAL '30 days'
          ) as failed_attempts_30_days
      `, [userId]);

      return stats.rows[0] || {};
    } catch (error) {
      console.error('Failed to get MFA stats:', error);
      return {};
    }
  }
}

module.exports = new MFAService(); 