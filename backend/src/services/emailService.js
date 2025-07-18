const nodemailer = require('nodemailer');
const { query } = require('../utils/database');

/**
 * Email Service for sending notifications and alerts
 * Integrates with database email configuration
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
    this.isConfigured = false;
  }

  /**
   * Load email configuration from database and create transporter
   */
  async loadConfiguration() {
    try {
      const result = await query(`
        SELECT value FROM app_settings WHERE key = 'email_config'
      `);

      if (result.rows.length === 0) {
        console.warn('📧 No email configuration found in database');
        this.isConfigured = false;
        return false;
      }

      this.config = result.rows[0].value;
      console.log(`📧 Loading email config: ${this.config.host}:${this.config.port}`);

      // Create nodemailer transporter
      const transportConfig = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.encryption === 'ssl', // true for SSL (port 465), false for other ports
        auth: {
          user: this.config.username,
          pass: this.config.password
        }
      };

      // Handle TLS encryption
      if (this.config.encryption === 'tls') {
        transportConfig.secure = false;
        transportConfig.tls = {
          ciphers: 'SSLv3',
          rejectUnauthorized: false  // Accept self-signed certificates for development
        };
      }

      // Handle no encryption
      if (this.config.encryption === 'none') {
        transportConfig.secure = false;
        transportConfig.tls = {
          rejectUnauthorized: false
        };
      }

      // For all SMTP connections, accept self-signed certificates in development
      if (!transportConfig.tls) {
        transportConfig.tls = {};
      }
      transportConfig.tls.rejectUnauthorized = false;

      this.transporter = nodemailer.createTransport(transportConfig);
      this.isConfigured = true;

      console.log('✅ Email service configured successfully');
      return true;

    } catch (error) {
      console.error('❌ Error loading email configuration:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.isConfigured) {
      await this.loadConfiguration();
    }

    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Email connection test failed:', error);
      throw new Error(`Email connection failed: ${error.message}`);
    }
  }

  /**
   * Send a policy alert email
   */
  async sendPolicyAlert(alertConfig) {
    const {
      recipients,
      subject,
      policyName,
      employeeName,
      employeeEmail,
      violationType,
      violationSeverity,
      triggerConditions,
      timestamp
    } = alertConfig;

    if (!this.isConfigured) {
      const loaded = await this.loadConfiguration();
      if (!loaded) {
        throw new Error('Email service not configured');
      }
    }

    // Create email content
    const emailSubject = subject || `Security Policy Alert: ${policyName}`;
    
    const emailBody = `
Security Policy Alert

Policy: ${policyName}
Employee: ${employeeName} (${employeeEmail})
Violation Type: ${violationType || 'Policy Trigger'}
Severity: ${violationSeverity || 'Medium'}
Timestamp: ${timestamp || new Date().toISOString()}

Trigger Conditions:
${triggerConditions ? JSON.stringify(triggerConditions, null, 2) : 'Policy conditions met'}

This is an automated alert from SecureWatch Security Monitoring System.
Please review the employee activity and take appropriate action if necessary.

---
SecureWatch Security Team
    `.trim();

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">🚨 Security Policy Alert</h1>
      </div>
      
      <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
        <h2 style="color: #374151; margin-top: 0;">Policy Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #6b7280;">Policy:</td>
            <td style="padding: 8px; color: #374151;">${policyName}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px; font-weight: bold; color: #6b7280;">Employee:</td>
            <td style="padding: 8px; color: #374151;">${employeeName} (${employeeEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #6b7280;">Violation Type:</td>
            <td style="padding: 8px; color: #374151;">${violationType || 'Policy Trigger'}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px; font-weight: bold; color: #6b7280;">Severity:</td>
            <td style="padding: 8px; color: #374151;">${violationSeverity || 'Medium'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #6b7280;">Timestamp:</td>
            <td style="padding: 8px; color: #374151;">${timestamp || new Date().toLocaleString()}</td>
          </tr>
        </table>
        
        <h3 style="color: #374151; margin-top: 20px;">Trigger Conditions</h3>
        <pre style="background: white; padding: 15px; border-radius: 6px; overflow-x: auto; color: #374151;">${triggerConditions ? JSON.stringify(triggerConditions, null, 2) : 'Policy conditions met'}</pre>
        
        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;">
            <strong>Action Required:</strong> Please review the employee activity and take appropriate action if necessary.
          </p>
        </div>
      </div>
      
      <div style="padding: 15px; text-align: center; background: #374151; color: #9ca3af; font-size: 12px;">
        This is an automated alert from SecureWatch Security Monitoring System
      </div>
    </div>
    `;

    const mailOptions = {
      from: `"SecureWatch Security" <${this.config.username}>`,
      to: recipients.join(', '),
      subject: emailSubject,
      text: emailBody,
      html: emailHtml
    };

    try {
      console.log(`📧 Sending policy alert email to: ${recipients.join(', ')}`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        recipients: recipients
      };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send a generic notification email
   */
  async sendNotification(to, subject, message, html = null) {
    if (!this.isConfigured) {
      const loaded = await this.loadConfiguration();
      if (!loaded) {
        // For development - log the email instead of sending
        console.log('📧 Email service not configured - simulating email send:');
        console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        console.log('--- End of simulated email ---');
        return { messageId: 'dev-simulation', success: true };
      }
    }

    const mailOptions = {
      from: `"SecureWatch System" <${this.config.fromAddress || this.config.username}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      text: message,
      html: html || message
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Notification email sent:', result.messageId);
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new EmailService(); 