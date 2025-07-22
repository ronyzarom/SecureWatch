const { query } = require('../utils/database');

/**
 * Policy Evaluation Engine
 * 
 * Sophisticated policy condition evaluation system that supports:
 * - Multiple condition types (risk_score, violation_type, frequency, etc.)
 * - Various operators (equals, greater_than, less_than, contains, in)
 * - Logical operators (AND, OR)
 * - Complex condition chaining
 * - Context-aware evaluation
 */
class PolicyEvaluationEngine {
  constructor() {
    this.supportedConditionTypes = [
      'risk_score',
      'violation_severity', 
      'violation_type',
      'frequency',
      'time_based',
      'data_access',
      'external_recipients',
      'any_violation'
    ];

    this.supportedOperators = [
      'equals',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'contains',
      'not_contains',
      'in',
      'not_in',
      'exists',
      'not_exists'
    ];
  }

  /**
   * Evaluate a single condition against violation context
   * This method is used by the test suite and external components
   */
  evaluateCondition(condition, context) {
    try {
      const { condition_type, operator, value } = condition;
      const contextValue = this.getContextValue(condition_type, context);
      
      return this.applyOperator(contextValue, operator, value);
    } catch (error) {
      console.error(`Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Get context value for condition evaluation
   */
  getContextValue(conditionType, context) {
    switch (conditionType) {
      case 'risk_score':
        return context.riskScore || context.risk_score || 0;
      case 'violation_severity':
        return context.severity || 'Low';
      case 'violation_type':
        return context.type || context.violation_type || '';
      case 'employee_department':
        return context.department || '';
      case 'employee_role':
        return context.role || '';
      case 'frequency':
        return context.frequency || 0;
      default:
        return null;
    }
  }

  /**
   * Apply operator to compare values
   */
  applyOperator(contextValue, operator, targetValue) {
    switch (operator) {
      case 'equals':
        return contextValue == targetValue;
      case 'not_equals':
        return contextValue != targetValue;
      case 'greater_than':
        return Number(contextValue) > Number(targetValue);
      case 'less_than':
        return Number(contextValue) < Number(targetValue);
      case 'greater_equal':
        return Number(contextValue) >= Number(targetValue);
      case 'less_equal':
        return Number(contextValue) <= Number(targetValue);
      case 'contains':
        return String(contextValue).toLowerCase().includes(String(targetValue).toLowerCase());
      case 'not_contains':
        return !String(contextValue).toLowerCase().includes(String(targetValue).toLowerCase());
      case 'in':
        const targetArray = Array.isArray(targetValue) ? targetValue : [targetValue];
        return targetArray.includes(contextValue);
      case 'not_in':
        const excludeArray = Array.isArray(targetValue) ? targetValue : [targetValue];
        return !excludeArray.includes(contextValue);
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Enhanced policy evaluation for violations
   * Replaces the simple database function with sophisticated logic
   */
  async evaluatePoliciesForViolation(violationId, employeeId) {
    try {
      console.log(`🔍 Enhanced policy evaluation for violation ${violationId}, employee ${employeeId}`);

      // Get violation details with context
      const violationResult = await query(`
        SELECT v.*, e.name as employee_name, e.department, e.risk_score as employee_risk_score
        FROM violations v
        JOIN employees e ON v.employee_id = e.id
        WHERE v.id = $1
      `, [violationId]);

      if (violationResult.rows.length === 0) {
        console.log(`⚠️ Violation ${violationId} not found`);
        return 0;
      }

      const violation = violationResult.rows[0];
      console.log(`📋 Evaluating policies for ${violation.type} (${violation.severity}) violation by ${violation.employee_name}`);

      // Get effective policies for this employee
      const policiesResult = await query(`
        SELECT 
          sp.id as policy_id,
          sp.name as policy_name,
          sp.description,
          sp.is_active,
          sp.priority,
          COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'type', pc.condition_type,
                'operator', pc.operator,
                'value', pc.value,
                'logical_operator', pc.logical_operator
              ) ORDER BY pc.condition_order
            ) FROM policy_conditions pc WHERE pc.policy_id = sp.id),
            '[]'::jsonb
          ) as conditions,
          COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'type', pa.action_type,
                'config', pa.action_config,
                'order', pa.execution_order,
                'delay', pa.delay_minutes
              ) ORDER BY pa.execution_order
            ) FROM policy_actions pa WHERE pa.policy_id = sp.id AND pa.is_enabled = true),
            '[]'::jsonb
          ) as actions
        FROM security_policies sp
        WHERE sp.is_active = true
        ORDER BY sp.priority DESC, sp.created_at DESC
      `);

      if (policiesResult.rows.length === 0) {
        console.log(`📋 No policies found for employee ${employeeId}`);
        return 0;
      }

      let policiesTriggered = 0;

      // Evaluate each policy
      for (const policy of policiesResult.rows) {
        try {
          const shouldTrigger = await this.evaluatePolicyConditions(
            policy, 
            violation, 
            { employeeId, violationId }
          );

          if (shouldTrigger) {
            // Create policy execution
            await query(`
              INSERT INTO policy_executions (
                policy_id, employee_id, violation_id, execution_status
              ) VALUES ($1, $2, $3, 'pending')
            `, [policy.policy_id, employeeId, violationId]);

            policiesTriggered++;
            console.log(`🔥 Policy "${policy.policy_name}" triggered for violation ${violationId}`);
          }
        } catch (policyError) {
          console.error(`❌ Error evaluating policy ${policy.policy_id}:`, policyError);
        }
      }

      console.log(`✅ Policy evaluation complete: ${policiesTriggered} policies triggered`);
      return policiesTriggered;

    } catch (error) {
      console.error('❌ Enhanced policy evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate all conditions for a specific policy
   */
  async evaluatePolicyConditions(policy, violation, context) {
    try {
      const conditions = policy.conditions || [];
      
      if (conditions.length === 0) {
        console.log(`📋 Policy "${policy.policy_name}" has no conditions - triggering by default`);
        return true;
      }

      console.log(`🔍 Evaluating ${conditions.length} conditions for policy "${policy.policy_name}"`);

      // Group conditions by logical operator
      const conditionGroups = this.groupConditionsByLogicalOperator(conditions);
      
      // Evaluate each group
      for (const group of conditionGroups) {
        const groupResult = await this.evaluateConditionGroup(group, violation, context);
        
        if (group.logicalOperator === 'OR' && groupResult) {
          return true; // Short circuit on OR
        } else if (group.logicalOperator === 'AND' && !groupResult) {
          return false; // Short circuit on AND
        }
      }

      return true; // All conditions passed

    } catch (error) {
      console.error('❌ Error evaluating policy conditions:', error);
      return false;
    }
  }

  /**
   * Group conditions by their logical operators for proper evaluation
   */
  groupConditionsByLogicalOperator(conditions) {
    const groups = [];
    let currentGroup = {
      logicalOperator: 'AND',
      conditions: []
    };

    for (const condition of conditions) {
      if (condition.logical_operator !== currentGroup.logicalOperator) {
        if (currentGroup.conditions.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          logicalOperator: condition.logical_operator || 'AND',
          conditions: [condition]
        };
      } else {
        currentGroup.conditions.push(condition);
      }
    }

    if (currentGroup.conditions.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Evaluate a group of conditions with the same logical operator
   */
  async evaluateConditionGroup(group, violation, context) {
    const results = [];

    for (const condition of group.conditions) {
      const result = await this.evaluateSingleCondition(condition, violation, context);
      results.push(result);
      
      console.log(`  📊 Condition "${condition.type}" ${condition.operator} "${condition.value}" = ${result}`);
    }

    // Apply logical operator
    if (group.logicalOperator === 'OR') {
      return results.some(r => r === true);
    } else { // AND
      return results.every(r => r === true);
    }
  }

  /**
   * Evaluate a single condition
   */
  async evaluateSingleCondition(condition, violation, context) {
    try {
      const { type, operator, value } = condition;

      // Get the actual value to compare against
      const actualValue = await this.getConditionValue(type, violation, context);
      
      if (actualValue === null || actualValue === undefined) {
        console.log(`  ⚠️ Could not get value for condition type: ${type}`);
        return false;
      }

      // Perform the comparison
      return this.compareValues(actualValue, operator, value);

    } catch (error) {
      console.error(`❌ Error evaluating condition ${condition.type}:`, error);
      return false;
    }
  }

  /**
   * Get the actual value for a condition type
   */
  async getConditionValue(conditionType, violation, context) {
    switch (conditionType) {
      case 'risk_score':
        // Get risk score from violation metadata or employee
        const metadata = typeof violation.metadata === 'string' ? 
          JSON.parse(violation.metadata) : violation.metadata;
        return metadata?.riskScore || violation.employee_risk_score || 0;

      case 'violation_severity':
        return violation.severity;

      case 'violation_type':
        return violation.type;

      case 'any_violation':
        return true; // Always true if we have a violation

      case 'frequency':
        // Count violations in last 24 hours
        const frequencyResult = await query(`
          SELECT COUNT(*) as count
          FROM violations 
          WHERE employee_id = $1 
          AND created_at >= NOW() - INTERVAL '24 hours'
        `, [context.employeeId]);
        return parseInt(frequencyResult.rows[0]?.count || 0);

      case 'external_recipients':
        // Check if violation involves external recipients
        const metadata2 = typeof violation.metadata === 'string' ? 
          JSON.parse(violation.metadata) : violation.metadata;
        return metadata2?.recipients || 0;

      case 'data_access':
        // Check data access volume (placeholder - would need actual data)
        return 0;

      case 'time_based':
        // Check if violation occurred outside business hours
        const violationTime = new Date(violation.created_at);
        const hour = violationTime.getHours();
        return hour < 8 || hour > 18; // Outside 8 AM - 6 PM

      default:
        console.log(`⚠️ Unknown condition type: ${conditionType}`);
        return null;
    }
  }

  /**
   * Compare values using the specified operator
   */
  compareValues(actualValue, operator, expectedValue) {
    // Convert expectedValue to appropriate type
    const numericActual = typeof actualValue === 'number' ? actualValue : parseFloat(actualValue);
    const numericExpected = parseFloat(expectedValue);

    switch (operator) {
      case 'equals':
        return actualValue.toString().toLowerCase() === expectedValue.toString().toLowerCase();

      case 'greater_than':
        return !isNaN(numericActual) && !isNaN(numericExpected) && numericActual > numericExpected;

      case 'less_than':
        return !isNaN(numericActual) && !isNaN(numericExpected) && numericActual < numericExpected;

      case 'greater_equal':
        return !isNaN(numericActual) && !isNaN(numericExpected) && numericActual >= numericExpected;

      case 'less_equal':
        return !isNaN(numericActual) && !isNaN(numericExpected) && numericActual <= numericExpected;

      case 'contains':
        return actualValue.toString().toLowerCase().includes(expectedValue.toString().toLowerCase());

      case 'not_contains':
        return !actualValue.toString().toLowerCase().includes(expectedValue.toString().toLowerCase());

      case 'in':
        // Expected value should be comma-separated list
        const values = expectedValue.split(',').map(v => v.trim().toLowerCase());
        return values.includes(actualValue.toString().toLowerCase());

      case 'not_in':
        const notValues = expectedValue.split(',').map(v => v.trim().toLowerCase());
        return !notValues.includes(actualValue.toString().toLowerCase());

      case 'exists':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';

      case 'not_exists':
        return actualValue === null || actualValue === undefined || actualValue === '';

      default:
        console.log(`⚠️ Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get detailed evaluation report (for debugging/logging)
   */
  async getEvaluationReport(violationId, employeeId) {
    // This could be used for detailed logging and audit trails
    return {
      violationId,
      employeeId,
      evaluatedAt: new Date(),
      // ... detailed evaluation steps
    };
  }
}

// Export singleton instance
module.exports = new PolicyEvaluationEngine(); 