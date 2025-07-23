#!/usr/bin/env node

const nodemailer = require('nodemailer');
const { query } = require('./src/utils/database');

console.log('📧 Email Delivery Verification Test');
console.log('===================================');

async function verifyEmailDelivery() {
  try {
    console.log('📋 Step 1: Loading email configuration...');
    
    // Get email config from database (same way as emailService)
    const configResult = await query(`
      SELECT value FROM app_settings WHERE key = 'email_config'
    `);
    
    if (configResult.rows.length === 0) {
      throw new Error('Email configuration not found in database');
    }
    
    const emailConfig = configResult.rows[0].value;
    console.log('✅ Email config loaded:', {
      host: emailConfig.host,
      port: emailConfig.port,
      encryption: emailConfig.encryption,
      user: emailConfig.username || 'Not set'
    });
    
    console.log('\n📋 Step 2: Creating SMTP transporter with detailed logging...');
    
    // Create transporter with detailed logging (same way as emailService)
    const transportConfig = {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.encryption === 'ssl',
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      },
      debug: true,  // Enable debug logging
      logger: true  // Enable logger
    };

    // Handle TLS encryption
    if (emailConfig.encryption === 'tls') {
      transportConfig.secure = false;
      transportConfig.tls = {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      };
    }
    
    const transporter = nodemailer.createTransport(transportConfig);
    
    console.log('✅ Transporter created with debug logging enabled');
    
    console.log('\n📋 Step 3: Verifying SMTP connection and authentication...');
    
    // Verify connection
    const connectionResult = await transporter.verify();
    console.log('✅ SMTP Connection verified:', connectionResult);
    
    console.log('\n📋 Step 4: Sending test email with delivery tracking...');
    
    const testEmail = {
      from: `"SecureWatch System" <${emailConfig.username}>`,
      to: 'rony@zaromh.com',
      subject: `Email Delivery Verification - ${new Date().toLocaleTimeString()}`,
      text: `
Email Delivery Verification Test

This email tests the complete delivery pipeline:
- SMTP Authentication: ✅
- Server Acceptance: Testing...
- Message Queuing: Testing...
- Delivery Status: Testing...

Sent at: ${new Date().toLocaleString()}
Server: ${emailConfig.host}:${emailConfig.port}
From: ${emailConfig.username}

If you receive this email, the complete delivery chain is working.
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F9CF9;">📧 Email Delivery Verification</h2>
          <p>This email tests the complete delivery pipeline:</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <ul style="margin: 0;">
              <li>✅ <strong>SMTP Authentication:</strong> Successful</li>
              <li>🔄 <strong>Server Acceptance:</strong> Testing...</li>
              <li>🔄 <strong>Message Queuing:</strong> Testing...</li>
              <li>🔄 <strong>Delivery Status:</strong> Testing...</li>
            </ul>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
            <p><strong>Test Details:</strong></p>
            <ul style="margin: 0;">
              <li><strong>Sent at:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Server:</strong> ${emailConfig.host}:${emailConfig.port}</li>
              <li><strong>From:</strong> ${emailConfig.username}</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px;">
            <strong>✅ If you receive this email, the complete delivery chain is working!</strong>
          </p>
        </div>
      `,
      // Request delivery status notification
      dsn: {
        id: 'verification-test-' + Date.now(),
        return: 'headers',
        notify: ['failure', 'delay', 'success'],
        recipient: emailConfig.username
      }
    };
    
    console.log(`📤 Sending email to: ${testEmail.to}`);
    console.log(`📝 Subject: ${testEmail.subject}`);
    
    // Send email and capture detailed response
    const result = await transporter.sendMail(testEmail);
    
    console.log('\n🎉 EMAIL SUCCESSFULLY ACCEPTED BY SMTP SERVER!');
    console.log('=============================================');
    
    console.log('\n📊 SMTP Server Response Details:');
    console.log(`✅ Message ID: ${result.messageId}`);
    console.log(`✅ Response: ${result.response}`);
    console.log(`✅ Envelope: From=${result.envelope.from}, To=[${result.envelope.to.join(', ')}]`);
    
    if (result.accepted && result.accepted.length > 0) {
      console.log(`✅ Accepted Recipients: ${result.accepted.join(', ')}`);
    }
    
    if (result.rejected && result.rejected.length > 0) {
      console.log(`❌ Rejected Recipients: ${result.rejected.join(', ')}`);
    }
    
    if (result.pending && result.pending.length > 0) {
      console.log(`⏳ Pending Recipients: ${result.pending.join(', ')}`);
    }
    
    // Parse SMTP response code
    const responseMatch = result.response.match(/^(\d{3})\s+(.+)/);
    if (responseMatch) {
      const [, code, message] = responseMatch;
      console.log(`📋 SMTP Response Code: ${code}`);
      console.log(`📋 SMTP Message: ${message}`);
      
      // Interpret response codes
      if (code.startsWith('2')) {
        console.log('✅ Status: SUCCESS - Message accepted for delivery');
      } else if (code.startsWith('4')) {
        console.log('⚠️  Status: TEMPORARY FAILURE - Will retry');
      } else if (code.startsWith('5')) {
        console.log('❌ Status: PERMANENT FAILURE - Will not retry');
      }
    }
    
    console.log('\n📈 Delivery Status Summary:');
    console.log('==========================');
    console.log('🔐 Authentication: ✅ SUCCESSFUL');
    console.log('📤 SMTP Acceptance: ✅ ACCEPTED');
    console.log('🎯 Message Queued: ✅ QUEUED FOR DELIVERY');
    console.log('📧 Recipient: rony@zaromh.com');
    console.log('⏰ Timestamp: ' + new Date().toLocaleString());
    
    console.log('\n💡 What this means:');
    console.log('• Your email passed SMTP authentication');
    console.log('• The SMTP server accepted the message');
    console.log('• The message is queued for delivery to the recipient');
    console.log('• Final delivery depends on recipient server');
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Check rony@zaromh.com inbox in 1-5 minutes');
    console.log('2. If not received, check spam/junk folder');
    console.log('3. Message ID can be used for delivery tracking');
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Email delivery verification failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.log(`Error Code: ${error.code}`);
    }
    
    if (error.response) {
      console.log(`SMTP Response: ${error.response}`);
    }
    
    if (error.responseCode) {
      console.log(`Response Code: ${error.responseCode}`);
      
      // Common SMTP error codes
      const errorCodes = {
        '421': 'Service not available - server busy',
        '450': 'Mailbox temporarily unavailable',
        '451': 'Local error in processing',
        '452': 'Insufficient system storage',
        '500': 'Syntax error - command unrecognized',
        '501': 'Syntax error in parameters',
        '502': 'Command not implemented',
        '503': 'Bad sequence of commands',
        '504': 'Command parameter not implemented',
        '535': 'Authentication failed',
        '550': 'Mailbox unavailable - rejected',
        '551': 'User not local',
        '552': 'Exceeded storage allocation',
        '553': 'Mailbox name not allowed',
        '554': 'Transaction failed'
      };
      
      if (errorCodes[error.responseCode]) {
        console.log(`Meaning: ${errorCodes[error.responseCode]}`);
      }
    }
    
    throw error;
  }
}

verifyEmailDelivery(); 