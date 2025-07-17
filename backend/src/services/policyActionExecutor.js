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
        return; // No pending executions
      }

      console.log(`📋 Processing ${result.rows.length} pending policy executions`);

      for (const execution of result.rows) {
        await this.processExecution(execution);
      }

    } catch (error) {
      console.error('❌ Error processing pending executions:', error);
    }
  }

  /**
   * Process a single policy execution
   */
  async processExecution(execution) {
    try {
      console.log(`🔍 Processing execution ${execution.id} for policy "${execution.policy_name}"`);

      // Mark execution as in progress
      await query(`
        UPDATE policy_executions 
        SET execution_status = 'processing'
        WHERE id = $1
      `, [execution.id]);

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
   * Execute escalate incident action (placeholder)
   */
  async executeEscalateIncident(action, execution) {
    const config = action.action_config;
    
    console.log(`🚨 Escalating incident for ${execution.employee_name} at level: ${config.escalation_level}`);
    
    // TODO: Implement actual escalation logic
    // This could integrate with incident management systems, create tickets, etc.
    
    return {
      action: 'escalate_incident',
      escalation_level: config.escalation_level,
      notify_management: config.notify_management,
      status: 'escalated'
    };
  }

  /**
   * Execute increase monitoring action (placeholder)
   */
  async executeIncreaseMonitoring(action, execution) {
    const config = action.action_config;
    
    console.log(`👀 Increasing monitoring for ${execution.employee_name} for ${config.duration_hours} hours`);
    
    // TODO: Implement actual monitoring increase logic
    // This could adjust monitoring sensitivity, increase log collection, etc.
    
    return {
      action: 'increase_monitoring',
      duration_hours: config.duration_hours,
      monitoring_level: config.monitoring_level,
      status: 'activated'
    };
  }

  /**
   * Execute disable access action (placeholder)
   */
  async executeDisableAccess(action, execution) {
    console.log(`🚫 Disabling access for ${execution.employee_name}`);
    
    // TODO: Implement actual access disabling logic
    // This could integrate with identity management systems, revoke tokens, etc.
    
    return {
      action: 'disable_access',
      employee_id: execution.employee_id,
      status: 'disabled'
    };
  }

  /**
   * Execute log detailed activity action (placeholder)
   */
  async executeLogDetailedActivity(action, execution) {
    const config = action.action_config;
    
    console.log(`📝 Enabling detailed activity logging for ${execution.employee_name}`);
    
    // TODO: Implement actual detailed logging logic
    // This could increase logging verbosity, capture additional data, etc.
    
    return {
      action: 'log_detailed_activity',
      include_network: config.include_network,
      include_files: config.include_files,
      status: 'enabled'
    };
  }

  /**
   * Execute immediate alert action (placeholder)
   */
  async executeImmediateAlert(action, execution) {
    console.log(`🚨 Sending immediate alert for ${execution.employee_name}`);
    
    // TODO: Implement actual immediate alert logic
    // This could send SMS, push notifications, call management, etc.
    
    return {
      action: 'immediate_alert',
      priority: 'urgent',
      status: 'sent'
    };
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