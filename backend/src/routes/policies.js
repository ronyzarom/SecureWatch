const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../utils/database');

// Apply authentication middleware to all policy routes
router.use(requireAuth);

// =============================================================================
// GET ALL POLICIES
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { level, active, target_type } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;
    
    // Filter by policy level
    if (level && ['global', 'group', 'user'].includes(level)) {
      whereClause += ` AND sp.policy_level = $${paramIndex}`;
      queryParams.push(level);
      paramIndex++;
    }
    
    // Filter by active status
    if (active !== undefined) {
      whereClause += ` AND sp.is_active = $${paramIndex}`;
      queryParams.push(active === 'true');
      paramIndex++;
    }
    
    // Filter by target type
    if (target_type && ['department', 'role', 'user'].includes(target_type)) {
      whereClause += ` AND sp.target_type = $${paramIndex}`;
      queryParams.push(target_type);
      paramIndex++;
    }
    
    const sql = `
      SELECT 
        sp.id,
        sp.name,
        sp.description,
        sp.policy_level,
        sp.target_id,
        sp.target_type,
        sp.is_active,
        sp.priority,
        sp.created_at,
        sp.updated_at,
        u.name as created_by_name,
        -- Count conditions
        COUNT(DISTINCT pc.id) as condition_count,
        -- Count actions
        COUNT(DISTINCT pa.id) as action_count,
        -- Recent executions count
        COUNT(DISTINCT pe.id) as execution_count
      FROM security_policies sp
      LEFT JOIN users u ON sp.created_by = u.id
      LEFT JOIN policy_conditions pc ON sp.id = pc.policy_id
      LEFT JOIN policy_actions pa ON sp.id = pa.policy_id
      LEFT JOIN policy_executions pe ON sp.id = pe.policy_id 
        AND pe.created_at >= NOW() - INTERVAL '30 days'
      ${whereClause}
      GROUP BY sp.id, u.name
      ORDER BY sp.priority DESC, sp.created_at DESC
    `;
    
    const result = await query(sql, queryParams);
    
    res.json({
      policies: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        policyLevel: row.policy_level,
        targetId: row.target_id,
        targetType: row.target_type,
        isActive: row.is_active,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by_name,
        stats: {
          conditions: parseInt(row.condition_count),
          actions: parseInt(row.action_count),
          recentExecutions: parseInt(row.execution_count)
        }
      })),
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({
      error: 'Failed to retrieve policies',
      code: 'POLICIES_FETCH_ERROR'
    });
  }
});

// =============================================================================
// GET SINGLE POLICY WITH DETAILS
// =============================================================================
router.get('/:id', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    
    if (isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID',
        code: 'INVALID_POLICY_ID'
      });
    }
    
    // Get policy details
    const policyResult = await query(`
      SELECT 
        sp.*,
        u.name as created_by_name
      FROM security_policies sp
      LEFT JOIN users u ON sp.created_by = u.id
      WHERE sp.id = $1
    `, [policyId]);
    
    if (policyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      });
    }
    
    const policy = policyResult.rows[0];
    
    // Get policy conditions
    const conditionsResult = await query(`
      SELECT *
      FROM policy_conditions
      WHERE policy_id = $1
      ORDER BY condition_order, id
    `, [policyId]);
    
    // Get policy actions
    const actionsResult = await query(`
      SELECT *
      FROM policy_actions
      WHERE policy_id = $1
      ORDER BY execution_order, id
    `, [policyId]);
    
    // Get recent executions
    const executionsResult = await query(`
      SELECT 
        pe.*,
        e.name as employee_name,
        v.type as violation_type,
        v.severity as violation_severity
      FROM policy_executions pe
      LEFT JOIN employees e ON pe.employee_id = e.id
      LEFT JOIN violations v ON pe.violation_id = v.id
      WHERE pe.policy_id = $1
      ORDER BY pe.created_at DESC
      LIMIT 10
    `, [policyId]);
    
    res.json({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      policyLevel: policy.policy_level,
      targetId: policy.target_id,
      targetType: policy.target_type,
      isActive: policy.is_active,
      priority: policy.priority,
      createdAt: policy.created_at,
      updatedAt: policy.updated_at,
      createdBy: policy.created_by_name,
      conditions: conditionsResult.rows.map(cond => ({
        id: cond.id,
        type: cond.condition_type,
        operator: cond.operator,
        value: cond.value,
        logicalOperator: cond.logical_operator,
        order: cond.condition_order
      })),
      actions: actionsResult.rows.map(action => ({
        id: action.id,
        type: action.action_type,
        config: action.action_config,
        order: action.execution_order,
        delay: action.delay_minutes,
        isEnabled: action.is_enabled
      })),
      recentExecutions: executionsResult.rows.map(exec => ({
        id: exec.id,
        employeeName: exec.employee_name,
        violationType: exec.violation_type,
        violationSeverity: exec.violation_severity,
        actionType: exec.action_type,
        status: exec.execution_status,
        executedAt: exec.created_at,
        details: exec.execution_details
      }))
    });

  } catch (error) {
    console.error('Get policy details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve policy details',
      code: 'POLICY_DETAILS_ERROR'
    });
  }
});

// =============================================================================
// CREATE NEW POLICY
// =============================================================================
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      policyLevel,
      targetId,
      targetType,
      isActive = true,
      priority = 0,
      conditions = [],
      actions = []
    } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Policy name is required',
        code: 'MISSING_POLICY_NAME'
      });
    }
    
    if (!policyLevel || !['global', 'group', 'user'].includes(policyLevel)) {
      return res.status(400).json({
        error: 'Valid policy level is required (global, group, user)',
        code: 'INVALID_POLICY_LEVEL'
      });
    }
    
    // Validate target combination
    if (policyLevel === 'global' && (targetId || targetType)) {
      return res.status(400).json({
        error: 'Global policies cannot have target ID or type',
        code: 'INVALID_GLOBAL_POLICY'
      });
    }
    
    if (policyLevel !== 'global' && (!targetId || !targetType)) {
      return res.status(400).json({
        error: 'Group and user policies must have target ID and type',
        code: 'MISSING_TARGET_INFO'
      });
    }
    
    // Begin transaction
    const client = await query('BEGIN');
    
    try {
      // Create policy
      const policyResult = await query(`
        INSERT INTO security_policies (
          name, description, policy_level, target_id, target_type,
          is_active, priority, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        name.trim(),
        description?.trim() || null,
        policyLevel,
        targetId || null,
        targetType || null,
        isActive,
        priority,
        req.user.id
      ]);
      
      const newPolicy = policyResult.rows[0];
      
      // Add conditions if provided
      if (conditions.length > 0) {
        for (let i = 0; i < conditions.length; i++) {
          const condition = conditions[i];
          await query(`
            INSERT INTO policy_conditions (
              policy_id, condition_type, operator, value, 
              logical_operator, condition_order
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            newPolicy.id,
            condition.type,
            condition.operator,
            condition.value,
            condition.logicalOperator || 'AND',
            condition.order || (i + 1)
          ]);
        }
      }
      
      // Add actions if provided
      if (actions.length > 0) {
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          await query(`
            INSERT INTO policy_actions (
              policy_id, action_type, action_config,
              execution_order, delay_minutes, is_enabled
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            newPolicy.id,
            action.type,
            action.config || {},
            action.order || (i + 1),
            action.delay || 0,
            action.isEnabled !== false
          ]);
        }
      }
      
      await query('COMMIT');
      
      res.status(201).json({
        message: 'Policy created successfully',
        policy: {
          id: newPolicy.id,
          name: newPolicy.name,
          description: newPolicy.description,
          policyLevel: newPolicy.policy_level,
          targetId: newPolicy.target_id,
          targetType: newPolicy.target_type,
          isActive: newPolicy.is_active,
          priority: newPolicy.priority,
          createdAt: newPolicy.created_at
        }
      });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Create policy error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        error: 'Policy with this name already exists',
        code: 'DUPLICATE_POLICY_NAME'
      });
    } else if (error.code === '23514') { // Check constraint violation
      res.status(400).json({
        error: 'Invalid policy configuration',
        code: 'CONSTRAINT_VIOLATION'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create policy',
        code: 'POLICY_CREATE_ERROR'
      });
    }
  }
});

// =============================================================================
// UPDATE POLICY
// =============================================================================
router.put('/:id', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const {
      name,
      description,
      isActive,
      priority
    } = req.body;
    
    if (isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID',
        code: 'INVALID_POLICY_ID'
      });
    }
    
    // Check if policy exists
    const existingPolicy = await query(`
      SELECT * FROM security_policies WHERE id = $1
    `, [policyId]);
    
    if (existingPolicy.rows.length === 0) {
      return res.status(404).json({
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      });
    }
    
    // Update policy
    const updateResult = await query(`
      UPDATE security_policies 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        priority = COALESCE($4, priority),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      name?.trim(),
      description?.trim(),
      isActive,
      priority,
      policyId
    ]);
    
    const updatedPolicy = updateResult.rows[0];
    
    res.json({
      message: 'Policy updated successfully',
      policy: {
        id: updatedPolicy.id,
        name: updatedPolicy.name,
        description: updatedPolicy.description,
        policyLevel: updatedPolicy.policy_level,
        targetId: updatedPolicy.target_id,
        targetType: updatedPolicy.target_type,
        isActive: updatedPolicy.is_active,
        priority: updatedPolicy.priority,
        updatedAt: updatedPolicy.updated_at
      }
    });

  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({
      error: 'Failed to update policy',
      code: 'POLICY_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// DELETE POLICY
// =============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    
    if (isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID',
        code: 'INVALID_POLICY_ID'
      });
    }
    
    // Check if policy exists
    const existingPolicy = await query(`
      SELECT * FROM security_policies WHERE id = $1
    `, [policyId]);
    
    if (existingPolicy.rows.length === 0) {
      return res.status(404).json({
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      });
    }
    
    // Delete policy (cascades to conditions and actions)
    await query(`
      DELETE FROM security_policies WHERE id = $1
    `, [policyId]);
    
    res.json({
      message: 'Policy deleted successfully',
      deletedId: policyId
    });

  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({
      error: 'Failed to delete policy',
      code: 'POLICY_DELETE_ERROR'
    });
  }
});

// =============================================================================
// GET EFFECTIVE POLICIES FOR EMPLOYEE
// =============================================================================
router.get('/effective/:employeeId', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    
    if (isNaN(employeeId)) {
      return res.status(400).json({
        error: 'Invalid employee ID',
        code: 'INVALID_EMPLOYEE_ID'
      });
    }
    
    // Use the database function to get effective policies
    const result = await query(`
      SELECT * FROM get_effective_policies($1)
    `, [employeeId]);
    
    res.json({
      employeeId,
      effectivePolicies: result.rows.map(policy => ({
        id: policy.policy_id,
        name: policy.policy_name,
        level: policy.policy_level,
        priority: policy.priority,
        conditions: policy.conditions,
        actions: policy.actions
      }))
    });

  } catch (error) {
    console.error('Get effective policies error:', error);
    res.status(500).json({
      error: 'Failed to retrieve effective policies',
      code: 'EFFECTIVE_POLICIES_ERROR'
    });
  }
});

// =============================================================================
// TOGGLE POLICY STATUS
// =============================================================================
router.patch('/:id/toggle', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    
    if (isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID',
        code: 'INVALID_POLICY_ID'
      });
    }
    
    // Toggle the active status
    const result = await query(`
      UPDATE security_policies 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, is_active
    `, [policyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      });
    }
    
    const policy = result.rows[0];
    
    res.json({
      message: `Policy ${policy.is_active ? 'activated' : 'deactivated'} successfully`,
      policy: {
        id: policy.id,
        name: policy.name,
        isActive: policy.is_active
      }
    });

  } catch (error) {
    console.error('Toggle policy error:', error);
    res.status(500).json({
      error: 'Failed to toggle policy status',
      code: 'POLICY_TOGGLE_ERROR'
    });
  }
});

// =============================================================================
// MANUAL POLICY TRIGGER (for testing)
// =============================================================================
router.post('/trigger/:id', async (req, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const { employeeId, violationId } = req.body;

    if (isNaN(policyId)) {
      return res.status(400).json({
        error: 'Invalid policy ID',
        code: 'INVALID_POLICY_ID'
      });
    }

    // Check if policy exists and is active
    const policyResult = await query(`
      SELECT * FROM security_policies 
      WHERE id = $1 AND is_active = true
    `, [policyId]);

    if (policyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Policy not found or not active',
        code: 'POLICY_NOT_FOUND'
      });
    }

    // Verify employee exists
    let employee = null;
    if (employeeId) {
      const empResult = await query(`
        SELECT * FROM employees WHERE id = $1
      `, [employeeId]);
      
      if (empResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Employee not found',
          code: 'EMPLOYEE_NOT_FOUND'
        });
      }
      employee = empResult.rows[0];
    } else {
      // Use a default employee for testing
      const empResult = await query(`
        SELECT * FROM employees LIMIT 1
      `);
      
      if (empResult.rows.length === 0) {
        return res.status(400).json({
          error: 'No employees found in system',
          code: 'NO_EMPLOYEES'
        });
      }
      employee = empResult.rows[0];
    }

    // Create a manual policy execution
    const executionResult = await query(`
      INSERT INTO policy_executions (
        policy_id, employee_id, violation_id, execution_status
      ) VALUES ($1, $2, $3, 'pending')
      RETURNING id
    `, [policyId, employee.id, violationId || null]);

    const executionId = executionResult.rows[0].id;

    console.log(`🔥 Manual policy trigger created: Execution ${executionId} for policy ${policyId} and employee ${employee.name}`);

    res.json({
      message: 'Policy execution triggered successfully',
      execution: {
        id: executionId,
        policyId: policyId,
        policyName: policyResult.rows[0].name,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Manual policy trigger error:', error);
    res.status(500).json({
      error: 'Failed to trigger policy',
      code: 'POLICY_TRIGGER_ERROR'
    });
  }
});

module.exports = router; 