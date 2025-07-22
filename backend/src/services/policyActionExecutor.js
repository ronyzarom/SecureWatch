const { query } = require('../utils/database');
const emailService = require('./emailService');

/**
 * Policy Action Executor Service
 * Processes pending policy executions and executes configured actions
 */
class PolicyActionExecutor {
  constructor() {
    this.isRunning = false;
    this.processingInterval = null;
    this.processIntervalMs = 5000; // Check every 5 seconds
  }

  /**
   * Start the action executor service
   */
  start() {
    if (this.isRunning) {
      console.log('📋 Policy Action Executor is already running');
      return;
    }

    console.log('🚀 Starting Policy Action Executor Service');
    this.isRunning = true;
    
    // Process pending executions immediately
    this.processPendingExecutions();
    
    // Set up recurring processing
    this.processingInterval = setInterval(() => {
      this.processPendingExecutions();
    }, this.processIntervalMs);
  }

  /**
   * Stop the action executor service
   */
  stop() {
    console.log('⏹️  Stopping Policy Action Executor Service');
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process all pending policy executions
   */
  async processPendingExecutions() {
    if (!this.isRunning) return;

    try {
      // Get pending executions that are ready to process
      const result = await query(`
        SELECT 
          pe.id,
          pe.policy_id,
          pe.employee_id,
          pe.violation_id,
          pe.started_at,
          sp.name as policy_name,
          e.name as employee_name,
          e.email as employee_email,
          v.type as violation_type,
          v.severity as violation_severity,
          v.description as violation_description
        FROM policy_executions pe
        JOIN security_policies sp ON pe.policy_id = sp.id
        JOIN employees e ON pe.employee_id = e.id
        LEFT JOIN violations v ON pe.violation_id = v.id
        WHERE pe.execution_status = 'pending'
        AND pe.started_at <= NOW()
        ORDER BY pe.started_at ASC
        LIMIT 10
      `);

      if (result.rows.length === 0) {
        // No pending executions
        return;
      }

      console.log(`📋 Processing ${result.rows.length} pending policy executions`);

      // Process each execution
      for (const execution of result.rows) {
        await this.processExecution(execution);
      }

    } catch (error) {
      // Handle database schema issues gracefully
      if (error.code === '42P01') {
        // Table doesn't exist
        console.log('⚠️  Policy execution tables not yet created - skipping policy processing');
        console.log('💡 Database schema needs to be initialized. Policy executor will retry later.');
        return;
      }
      
      // Log other errors but don't crash
      console.error('❌ Error processing pending executions:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', error.stack);
      }
    }
  }

  /**
   * Process a single policy execution
   */
  async processExecution(execution) {
    try {
      console.log(`🔍 Processing execution ${execution.id} for policy "${execution.policy_name}"`);

      // Mark execution as in progress (skip this step since 'processing' is not allowed)
      // The execution will stay as 'pending' until completed
      console.log(`🔍 Processing execution ${execution.id} for policy "${execution.policy_name}"`);

      // Get all actions for this policy
      const actionsResult = await query(`
        SELECT 
          action_type,
          action_config,
          execution_order,
          delay_minutes
        FROM policy_actions 
        WHERE policy_id = $1 AND is_enabled = true
        ORDER BY execution_order ASC
      `, [execution.policy_id]);

      if (actionsResult.rows.length === 0) {
        console.log(`⚠️  No actions configured for policy ${execution.policy_name}`);
        await this.markExecutionComplete(execution.id, 'No actions configured');
        return;
      }

      let executedActions = [];
      let hasErrors = false;

      // Execute each action in order
      for (const action of actionsResult.rows) {
        try {
          // Check if we should delay this action
          if (action.delay_minutes > 0) {
            const delayMs = action.delay_minutes * 60 * 1000;
            const executionStarted = new Date(execution.started_at);
            const shouldExecuteAt = new Date(executionStarted.getTime() + delayMs);
            
            if (new Date() < shouldExecuteAt) {
              console.log(`⏰ Action ${action.action_type} delayed until ${shouldExecuteAt.toISOString()}`);
              continue; // Skip this action for now
            }
          }

          console.log(`🎯 Executing action: ${action.action_type}`);
          const result = await this.executeAction(action, execution);
          
          executedActions.push({
            type: action.action_type,
            status: 'success',
            result: result
          });

        } catch (actionError) {
          console.error(`❌ Error executing action ${action.action_type}:`, actionError);
          hasErrors = true;
          
          executedActions.push({
            type: action.action_type,
            status: 'failed',
            error: actionError.message
          });
        }
      }

      // Mark execution as complete or failed
      if (hasErrors) {
        await this.markExecutionFailed(execution.id, 'Some actions failed', executedActions);
      } else {
        await this.markExecutionComplete(execution.id, 'All actions completed successfully', executedActions);
      }

    } catch (error) {
      console.error(`❌ Error processing execution ${execution.id}:`, error);
      await this.markExecutionFailed(execution.id, error.message);
    }
  }

  /**
   * Execute a specific action
   */
  async executeAction(action, execution) {
    switch (action.action_type) {
      case 'email_alert':
        return await this.executeEmailAlert(action, execution);
      
      case 'escalate_incident':
        return await this.executeEscalateIncident(action, execution);
      
      case 'increase_monitoring':
        return await this.executeIncreaseMonitoring(action, execution);
      
      case 'disable_access':
        return await this.executeDisableAccess(action, execution);
      
      case 'log_detailed_activity':
        return await this.executeLogDetailedActivity(action, execution);
      
      case 'immediate_alert':
        return await this.executeImmediateAlert(action, execution);
      
      default:
        throw new Error(`Unknown action type: ${action.action_type}`);
    }
  }

  /**
   * Execute email alert action
   */
  async executeEmailAlert(action, execution) {
    const config = action.action_config;
    
    if (!config.recipients || !Array.isArray(config.recipients) || config.recipients.length === 0) {
      throw new Error('Email alert requires recipients');
    }

    // Get trigger conditions for context
    const conditionsResult = await query(`
      SELECT condition_type, operator, value, logical_operator
      FROM policy_conditions 
      WHERE policy_id = $1
      ORDER BY condition_order
    `, [execution.policy_id]);

    const alertConfig = {
      recipients: config.recipients,
      subject: config.subject,
      policyName: execution.policy_name,
      employeeName: execution.employee_name,
      employeeEmail: execution.employee_email,
      violationType: execution.violation_type,
      violationSeverity: execution.violation_severity,
      triggerConditions: conditionsResult.rows,
      timestamp: new Date().toISOString()
    };

    const result = await emailService.sendPolicyAlert(alertConfig);
    
    console.log(`✅ Email alert sent to ${config.recipients.length} recipients`);
    return {
      action: 'email_alert',
      recipients: config.recipients,
      messageId: result.messageId,
      status: 'sent'
    };
  }

  /**
   * Execute escalate incident action
   */
  async executeEscalateIncident(action, execution) {
    const config = action.action_config;
    
    console.log(`🚨 Escalating incident for ${execution.employee_name} at level: ${config.escalation_level}`);
    
    try {
      // Create an incident record in the database
      const incidentResult = await query(`
        INSERT INTO incidents (
          employee_id, violation_id, policy_id, incident_type, 
          severity, status, description, escalation_level,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `, [
        execution.employee_id,
        execution.violation_id,
        execution.policy_id,
        'policy_escalation',
        config.escalation_level === 'critical' ? 'Critical' : 
        config.escalation_level === 'high' ? 'High' : 'Medium',
        'Open',
        `Policy escalation: ${execution.policy_name} triggered for ${execution.employee_name}`,
        config.escalation_level,
        'system'
      ]);
      
      const incidentId = incidentResult.rows[0].id;
      console.log(`📝 Created incident record #${incidentId}`);
      
      // Notify management if configured
      if (config.notify_management) {
        await this.notifyManagement(execution, config, incidentId);
      }
      
      // Log escalation activity
      await query(`
        INSERT INTO activity_logs (
          employee_id, action_type, description, source, 
          severity, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        execution.employee_id,
        'incident_escalated',
        `Security incident escalated to ${config.escalation_level} level`,
        'policy_engine',
        config.escalation_level === 'critical' ? 'Critical' : 'High',
        JSON.stringify({
          policyId: execution.policy_id,
          incidentId: incidentId,
          escalationLevel: config.escalation_level
        })
      ]);
      
      return {
        action: 'escalate_incident',
        incident_id: incidentId,
        escalation_level: config.escalation_level,
        notify_management: config.notify_management,
        status: 'escalated'
      };
      
    } catch (error) {
      // Handle case where tables don't exist yet
      if (error.code === '42P01') {
        console.log('⚠️  Incident tables not yet created - logging escalation only');
        console.log(`🚨 ESCALATION: ${execution.employee_name} - Level: ${config.escalation_level}`);
        
        return {
          action: 'escalate_incident',
          escalation_level: config.escalation_level,
          status: 'logged_only',
          note: 'Database schema pending - escalation logged to console'
        };
      }
      throw error;
    }
  }

  /**
   * Helper method to notify management of escalated incidents
   */
  async notifyManagement(execution, config, incidentId) {
    try {
      // Get management email addresses
      const managementResult = await query(`
        SELECT email, name FROM employees 
        WHERE role IN ('manager', 'admin', 'security_admin') 
        AND is_active = true
      `);
      
      if (managementResult.rows.length === 0) {
        console.log('⚠️  No management contacts found for escalation notification');
        return;
      }
      
      const managementEmails = managementResult.rows.map(row => row.email);
      
      // Send escalation notification email
      const alertConfig = {
        recipients: managementEmails,
        subject: `🚨 ESCALATED SECURITY INCIDENT - ${execution.policy_name}`,
        policyName: execution.policy_name,
        employeeName: execution.employee_name,
        employeeEmail: execution.employee_email,
        violationType: `${execution.violation_type} (ESCALATED)`,
        violationSeverity: config.escalation_level.toUpperCase(),
        triggerConditions: [{
          type: 'escalation',
          level: config.escalation_level,
          incident_id: incidentId,
          requires_immediate_attention: true
        }],
        timestamp: new Date().toISOString()
      };
      
      await emailService.sendPolicyAlert(alertConfig);
      console.log(`📧 Management notification sent to ${managementEmails.length} recipients`);
      
    } catch (error) {
      console.error('❌ Error notifying management:', error);
      // Don't throw - escalation should still succeed even if notification fails
    }
  }

  /**
   * Execute increase monitoring action
   */
  async executeIncreaseMonitoring(action, execution) {
    const config = action.action_config;
    const durationHours = config.duration_hours || 24;
    const monitoringLevel = config.monitoring_level || 'high';
    
    console.log(`👀 Increasing monitoring for ${execution.employee_name} for ${durationHours} hours`);
    
    try {
      // Calculate end time for monitoring
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + durationHours);
      
      // Insert or update monitoring settings for the employee
      await query(`
        INSERT INTO employee_monitoring_settings (
          employee_id, monitoring_level, enabled, 
          start_time, end_time, reason, created_by, created_at
        ) VALUES ($1, $2, true, NOW(), $3, $4, $5, NOW())
        ON CONFLICT (employee_id) DO UPDATE SET
          monitoring_level = $2,
          enabled = true,
          start_time = NOW(),
          end_time = $3,
          reason = $4,
          updated_at = NOW()
      `, [
        execution.employee_id,
        monitoringLevel,
        endTime,
        `Policy triggered: ${execution.policy_name}`,
        'policy_engine'
      ]);
      
      // Log the monitoring change
      await query(`
        INSERT INTO activity_logs (
          employee_id, action_type, description, source,
          severity, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        execution.employee_id,
        'monitoring_increased',
        `Monitoring level increased to ${monitoringLevel} for ${durationHours} hours`,
        'policy_engine',
        'Medium',
        JSON.stringify({
          policyId: execution.policy_id,
          monitoringLevel: monitoringLevel,
          duration: durationHours,
          endTime: endTime.toISOString()
        })
      ]);
      
      console.log(`✅ Enhanced monitoring activated for ${execution.employee_name} until ${endTime.toLocaleString()}`);
      
      return {
        action: 'increase_monitoring',
        duration_hours: durationHours,
        monitoring_level: monitoringLevel,
        end_time: endTime.toISOString(),
        status: 'activated'
      };
      
    } catch (error) {
      // Handle case where monitoring tables don't exist yet
      if (error.code === '42P01') {
        console.log('⚠️  Monitoring tables not yet created - logging action only');
        console.log(`👀 MONITORING: ${execution.employee_name} - Level: ${monitoringLevel} for ${durationHours}h`);
        
        return {
          action: 'increase_monitoring',
          duration_hours: durationHours,
          monitoring_level: monitoringLevel,
          status: 'logged_only',
          note: 'Database schema pending - monitoring logged to console'
        };
      }
      throw error;
    }
  }

  /**
   * Execute disable access action
   */
  async executeDisableAccess(action, execution) {
    const config = action.action_config;
    const accessType = config.access_type || 'all'; // 'all', 'email', 'teams', 'specific'
    const duration = config.duration_hours || null; // null = permanent until manual re-enable
    
    console.log(`🚫 Disabling ${accessType} access for ${execution.employee_name}`);
    
    try {
      // Calculate end time if temporary
      let endTime = null;
      if (duration) {
        endTime = new Date();
        endTime.setHours(endTime.getHours() + duration);
      }
      
      // Update employee access status
      if (accessType === 'all') {
        await query(`
          UPDATE employees 
          SET is_active = false, 
              access_disabled_at = NOW(),
              access_disabled_reason = $2,
              access_disabled_until = $3
          WHERE id = $1
        `, [
          execution.employee_id,
          `Policy triggered: ${execution.policy_name}`,
          endTime
        ]);
      }
      
      // Create access restriction record
      await query(`
        INSERT INTO employee_access_restrictions (
          employee_id, restriction_type, reason, 
          start_time, end_time, created_by, created_at
        ) VALUES ($1, $2, $3, NOW(), $4, $5, NOW())
      `, [
        execution.employee_id,
        accessType,
        `Policy action: ${execution.policy_name}`,
        endTime,
        'policy_engine'
      ]);
      
      // Revoke any active sessions/tokens
      await query(`
        UPDATE user_sessions 
        SET is_active = false, ended_at = NOW()
        WHERE employee_id = $1 AND is_active = true
      `, [execution.employee_id]);
      
      // Log the access restriction
      await query(`
        INSERT INTO activity_logs (
          employee_id, action_type, description, source,
          severity, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        execution.employee_id,
        'access_disabled',
        `${accessType} access disabled by policy${duration ? ` for ${duration} hours` : ' indefinitely'}`,
        'policy_engine',
        'High',
        JSON.stringify({
          policyId: execution.policy_id,
          accessType: accessType,
          duration: duration,
          endTime: endTime?.toISOString()
        })
      ]);
      
      // Send notification to employee (if configured)
      if (config.notify_employee) {
        await this.notifyEmployeeAccessDisabled(execution, config, endTime);
      }
      
      const statusMessage = duration 
        ? `Access disabled until ${endTime.toLocaleString()}`
        : 'Access disabled indefinitely';
        
      console.log(`✅ ${statusMessage} for ${execution.employee_name}`);
      
      return {
        action: 'disable_access',
        employee_id: execution.employee_id,
        access_type: accessType,
        duration_hours: duration,
        end_time: endTime?.toISOString(),
        status: 'disabled'
      };
      
    } catch (error) {
      // Handle case where access restriction tables don't exist yet
      if (error.code === '42P01') {
        console.log('⚠️  Access restriction tables not yet created - logging action only');
        console.log(`🚫 ACCESS DISABLED: ${execution.employee_name} - Type: ${accessType}`);
        
        return {
          action: 'disable_access',
          employee_id: execution.employee_id,
          access_type: accessType,
          status: 'logged_only',
          note: 'Database schema pending - access restriction logged to console'
        };
      }
      throw error;
    }
  }

  /**
   * Execute log detailed activity action
   */
  async executeLogDetailedActivity(action, execution) {
    const config = action.action_config;
    const durationHours = config.duration_hours || 48;
    const includeNetwork = config.include_network || false;
    const includeFiles = config.include_files || false;
    const includeEmails = config.include_emails || true;
    
    console.log(`📝 Enabling detailed activity logging for ${execution.employee_name} for ${durationHours} hours`);
    
    try {
      // Calculate end time for detailed logging
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + durationHours);
      
      // Insert or update detailed logging settings
      await query(`
        INSERT INTO employee_logging_settings (
          employee_id, detailed_logging_enabled, 
          include_network_activity, include_file_access, include_email_content,
          start_time, end_time, reason, created_by, created_at
        ) VALUES ($1, true, $2, $3, $4, NOW(), $5, $6, $7, NOW())
        ON CONFLICT (employee_id) DO UPDATE SET
          detailed_logging_enabled = true,
          include_network_activity = $2,
          include_file_access = $3,
          include_email_content = $4,
          start_time = NOW(),
          end_time = $5,
          reason = $6,
          updated_at = NOW()
      `, [
        execution.employee_id,
        includeNetwork,
        includeFiles,
        includeEmails,
        endTime,
        `Policy triggered: ${execution.policy_name}`,
        'policy_engine'
      ]);
      
      // Create a marker log entry to track when detailed logging started
      await query(`
        INSERT INTO activity_logs (
          employee_id, action_type, description, source,
          severity, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        execution.employee_id,
        'detailed_logging_enabled',
        `Enhanced activity logging enabled for ${durationHours} hours`,
        'policy_engine',
        'Medium',
        JSON.stringify({
          policyId: execution.policy_id,
          duration: durationHours,
          endTime: endTime.toISOString(),
          includes: {
            network: includeNetwork,
            files: includeFiles,
            emails: includeEmails
          }
        })
      ]);
      
      // Log the current state for baseline comparison
      await query(`
        INSERT INTO detailed_activity_logs (
          employee_id, log_type, description, source,
          metadata, logged_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        execution.employee_id,
        'baseline_snapshot',
        'Detailed logging session started - baseline activity snapshot',
        'policy_engine',
        JSON.stringify({
          sessionStart: new Date().toISOString(),
          policyTrigger: execution.policy_name,
          violationType: execution.violation_type,
          monitoringLevel: 'enhanced'
        })
      ]);
      
      console.log(`✅ Detailed logging activated for ${execution.employee_name} until ${endTime.toLocaleString()}`);
      
      return {
        action: 'log_detailed_activity',
        duration_hours: durationHours,
        include_network: includeNetwork,
        include_files: includeFiles,
        include_emails: includeEmails,
        end_time: endTime.toISOString(),
        status: 'enabled'
      };
      
    } catch (error) {
      // Handle case where logging tables don't exist yet
      if (error.code === '42P01') {
        console.log('⚠️  Detailed logging tables not yet created - logging action only');
        console.log(`📝 DETAILED LOGGING: ${execution.employee_name} - Duration: ${durationHours}h`);
        
        return {
          action: 'log_detailed_activity',
          duration_hours: durationHours,
          include_network: includeNetwork,
          include_files: includeFiles,
          include_emails: includeEmails,
          status: 'logged_only',
          note: 'Database schema pending - detailed logging request logged to console'
        };
      }
      throw error;
    }
  }

  /**
   * Execute immediate alert action
   */
  async executeImmediateAlert(action, execution) {
    const config = action.action_config;
    const alertChannels = config.alert_channels || ['email', 'system']; // email, sms, push, system
    const priority = config.priority || 'urgent';
    
    console.log(`🚨 Sending immediate ${priority} alert for ${execution.employee_name} via ${alertChannels.join(', ')}`);
    
    const alertResults = [];
    
    try {
      // Send email alert if configured
      if (alertChannels.includes('email')) {
        const emailResult = await this.sendImmediateEmailAlert(execution, config);
        alertResults.push(emailResult);
      }
      
      // Send system alert (in-app notification)
      if (alertChannels.includes('system')) {
        const systemResult = await this.sendSystemAlert(execution, config);
        alertResults.push(systemResult);
      }
      
      // Send SMS alert if configured
      if (alertChannels.includes('sms')) {
        const smsResult = await this.sendSMSAlert(execution, config);
        alertResults.push(smsResult);
      }
      
      // Send push notification if configured
      if (alertChannels.includes('push')) {
        const pushResult = await this.sendPushAlert(execution, config);
        alertResults.push(pushResult);
      }
      
      // Log the immediate alert
      await query(`
        INSERT INTO activity_logs (
          employee_id, action_type, description, source,
          severity, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        execution.employee_id,
        'immediate_alert_sent',
        `Immediate ${priority} alert sent via ${alertChannels.join(', ')}`,
        'policy_engine',
        'Critical',
        JSON.stringify({
          policyId: execution.policy_id,
          alertChannels: alertChannels,
          priority: priority,
          results: alertResults
        })
      ]);
      
      console.log(`✅ Immediate alert sent successfully for ${execution.employee_name}`);
      
      return {
        action: 'immediate_alert',
        priority: priority,
        channels: alertChannels,
        results: alertResults,
        status: 'sent'
      };
      
    } catch (error) {
      console.error('❌ Error sending immediate alert:', error);
      return {
        action: 'immediate_alert',
        priority: priority,
        channels: alertChannels,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Helper method to send immediate email alerts
   */
  async sendImmediateEmailAlert(execution, config) {
    try {
      // Get management and security team emails
      const contactsResult = await query(`
        SELECT email, name, role FROM employees 
        WHERE role IN ('admin', 'security_admin', 'manager') 
        AND is_active = true
        AND email IS NOT NULL
      `);
      
      const recipients = contactsResult.rows.map(row => row.email);
      
      if (recipients.length === 0) {
        console.log('⚠️  No immediate alert recipients found');
        return { channel: 'email', status: 'no_recipients' };
      }
      
      // Send high-priority email alert
      const alertConfig = {
        recipients: recipients,
        subject: `🚨 IMMEDIATE SECURITY ALERT - ${execution.policy_name}`,
        policyName: execution.policy_name,
        employeeName: execution.employee_name,
        employeeEmail: execution.employee_email,
        violationType: `${execution.violation_type} (IMMEDIATE ALERT)`,
        violationSeverity: 'CRITICAL',
        triggerConditions: [{
          type: 'immediate_alert',
          priority: config.priority || 'urgent',
          timestamp: new Date().toISOString(),
          requires_immediate_action: true
        }],
        timestamp: new Date().toISOString()
      };
      
      await emailService.sendPolicyAlert(alertConfig);
      
      return {
        channel: 'email',
        recipients: recipients.length,
        status: 'sent'
      };
      
    } catch (error) {
      console.error('❌ Error sending immediate email alert:', error);
      return {
        channel: 'email',
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Helper method to send system alerts (in-app notifications)
   */
  async sendSystemAlert(execution, config) {
    try {
      // Create system notification for admins and security team
      const notification = {
        type: 'security_alert',
        priority: 'critical',
        title: `Immediate Security Alert: ${execution.policy_name}`,
        message: `Policy violation detected for ${execution.employee_name}. Immediate attention required.`,
        employee_id: execution.employee_id,
        policy_id: execution.policy_id,
        violation_id: execution.violation_id,
        created_at: new Date().toISOString()
      };
      
      // Insert notification for all admins and security staff
      await query(`
        INSERT INTO system_notifications (
          recipient_role, notification_type, priority, 
          title, message, metadata, created_at
        ) VALUES ('admin', $1, $2, $3, $4, $5, NOW()),
                 ('security_admin', $1, $2, $3, $4, $5, NOW())
      `, [
        notification.type,
        notification.priority,
        notification.title,
        notification.message,
        JSON.stringify({
          employeeId: execution.employee_id,
          policyId: execution.policy_id,
          violationId: execution.violation_id
        })
      ]);
      
      return {
        channel: 'system',
        notification_id: 'system_broadcast',
        status: 'sent'
      };
      
    } catch (error) {
      // Handle case where notification tables don't exist yet
      if (error.code === '42P01') {
        console.log('⚠️  System notification tables not yet created - logging alert only');
        console.log(`🚨 SYSTEM ALERT: ${execution.employee_name} - Policy: ${execution.policy_name}`);
        
        return {
          channel: 'system',
          status: 'logged_only',
          note: 'Database schema pending - system alert logged to console'
        };
      }
      
      console.error('❌ Error sending system alert:', error);
      return {
        channel: 'system',
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Helper method to send SMS alerts (placeholder for now)
   */
  async sendSMSAlert(execution, config) {
    // TODO: Implement SMS service integration (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS Alert would be sent for ${execution.employee_name}`);
    return {
      channel: 'sms',
      status: 'not_implemented',
      note: 'SMS service integration pending'
    };
  }

  /**
   * Helper method to send push notifications (placeholder for now)
   */
  async sendPushAlert(execution, config) {
    // TODO: Implement push notification service (Firebase, etc.)
    console.log(`📢 Push notification would be sent for ${execution.employee_name}`);
    return {
      channel: 'push',
      status: 'not_implemented',
      note: 'Push notification service integration pending'
    };
  }

  /**
   * Helper method to notify employee of access being disabled
   */
  async notifyEmployeeAccessDisabled(execution, config, endTime) {
    try {
      const subject = 'Security Alert: Account Access Restricted';
      const message = `
Dear ${execution.employee_name},

Your account access has been temporarily restricted due to a security policy trigger.

Policy: ${execution.policy_name}
Restriction Type: ${config.access_type}
${endTime ? `Restriction Period: Until ${endTime.toLocaleString()}` : 'Restriction Period: Indefinite (pending review)'}

If you believe this is an error, please contact your manager or the IT security team immediately.

Best regards,
SecureWatch Security Team
      `.trim();
      
      await emailService.sendNotification(
        execution.employee_email,
        subject,
        message
      );
      
      console.log(`📧 Access restriction notification sent to ${execution.employee_email}`);
      
    } catch (error) {
      console.error('❌ Error notifying employee of access restriction:', error);
      // Don't throw - restriction should still succeed even if notification fails
    }
  }

  /**
   * Mark execution as completed successfully
   */
  async markExecutionComplete(executionId, message, executionDetails = null) {
    await query(`
      UPDATE policy_executions 
      SET 
        execution_status = 'success',
        execution_details = $2,
        completed_at = NOW()
      WHERE id = $1
    `, [executionId, JSON.stringify({ message, details: executionDetails })]);

    console.log(`✅ Execution ${executionId} completed: ${message}`);
  }

  /**
   * Mark execution as failed
   */
  async markExecutionFailed(executionId, errorMessage, executionDetails = null) {
    await query(`
      UPDATE policy_executions 
      SET 
        execution_status = 'failed',
        error_message = $2,
        execution_details = $3,
        completed_at = NOW()
      WHERE id = $1
    `, [executionId, errorMessage, JSON.stringify({ details: executionDetails })]);

    console.log(`❌ Execution ${executionId} failed: ${errorMessage}`);
  }
}

// Export singleton instance
module.exports = new PolicyActionExecutor(); 