/**
 * SecureWatch Compliance API Routes
 * Provides REST endpoints for compliance management and evaluation
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { complianceEngine } = require('../services/complianceEngine');
const { syncComplianceAnalyzer } = require('../services/syncComplianceAnalyzer');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Middleware to ensure compliance engine is initialized
const ensureComplianceEngine = async (req, res, next) => {
  try {
    if (!complianceEngine.initialized) {
      await complianceEngine.initialize();
    }
    next();
  } catch (error) {
    console.error('Failed to initialize compliance engine:', error);
    res.status(500).json({ 
      error: 'Compliance engine initialization failed',
      message: error.message 
    });
  }
};

// Apply authentication and engine initialization to all routes
router.use(requireAuth);
router.use(ensureComplianceEngine);

/**
 * =================================
 * COMPLIANCE REGULATIONS ENDPOINTS
 * =================================
 */

// GET /api/compliance/regulations - List all regulations
router.get('/regulations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, regulation_code, regulation_name, description, region, 
             is_active, configuration, configured_at, updated_at
      FROM compliance_regulations
      ORDER BY regulation_name
    `);

    res.json({
      regulations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
});

// GET /api/compliance/regulations/active - List active regulations
router.get('/regulations/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, regulation_code, regulation_name, description, region, configuration
      FROM compliance_regulations
      WHERE is_active = true
      ORDER BY regulation_name
    `);

    res.json({
      regulations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching active regulations:', error);
    res.status(500).json({ error: 'Failed to fetch active regulations' });
  }
});

// PUT /api/compliance/regulations/:code/activate - Activate/deactivate regulation
router.put('/regulations/:code/activate', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { is_active, configuration } = req.body;

    const result = await pool.query(`
      UPDATE compliance_regulations 
      SET is_active = $1, configuration = COALESCE($2, configuration), updated_at = NOW()
      WHERE regulation_code = $3
      RETURNING id, regulation_code, regulation_name, is_active
    `, [is_active, configuration ? JSON.stringify(configuration) : null, code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regulation not found' });
    }

    // Refresh compliance engine
    await complianceEngine.refresh();

    res.json({
      message: `Regulation ${code} ${is_active ? 'activated' : 'deactivated'}`,
      regulation: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating regulation:', error);
    res.status(500).json({ error: 'Failed to update regulation' });
  }
});

/**
 * =================================
 * INTERNAL POLICIES ENDPOINTS
 * =================================
 */

// GET /api/compliance/policies - List all internal policies
router.get('/policies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, policy_code, policy_name, policy_category, description,
             applies_to_departments, applies_to_roles, is_active, 
             configuration, priority_order, created_at, updated_at
      FROM internal_policies
      ORDER BY priority_order, policy_name
    `);

    res.json({
      policies: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// POST /api/compliance/policies - Create new internal policy
router.post('/policies', requireAdmin, async (req, res) => {
  try {
    const {
      policy_code,
      policy_name,
      policy_category,
      description,
      configuration,
      applies_to_departments,
      applies_to_roles,
      priority_order,
      parent_policy_id,
      effective_date,
      expiry_date
    } = req.body;

    // Validate required fields
    if (!policy_code || !policy_name || !policy_category) {
      return res.status(400).json({ 
        error: 'Missing required fields: policy_code, policy_name, policy_category' 
      });
    }

    const result = await pool.query(`
      INSERT INTO internal_policies (
        policy_code, policy_name, policy_category, description, configuration,
        applies_to_departments, applies_to_roles, priority_order, parent_policy_id,
        effective_date, expiry_date, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING id, policy_code, policy_name, is_active
    `, [
      policy_code, policy_name, policy_category, description,
      configuration ? JSON.stringify(configuration) : {},
      applies_to_departments || [],
      applies_to_roles || [],
      priority_order || 100,
      parent_policy_id,
      effective_date || new Date(),
      expiry_date,
      req.user.id
    ]);

    // Refresh compliance engine
    await complianceEngine.refresh();

    res.status(201).json({
      message: 'Internal policy created successfully',
      policy: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    if (error.constraint === 'internal_policies_policy_code_key') {
      res.status(409).json({ error: 'Policy code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create policy' });
    }
  }
});

// PUT /api/compliance/policies/:id - Update internal policy
router.put('/policies/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      policy_name,
      description,
      configuration,
      applies_to_departments,
      applies_to_roles,
      priority_order,
      is_active,
      effective_date,
      expiry_date
    } = req.body;

    const result = await pool.query(`
      UPDATE internal_policies 
      SET policy_name = COALESCE($1, policy_name),
          description = COALESCE($2, description),
          configuration = COALESCE($3, configuration),
          applies_to_departments = COALESCE($4, applies_to_departments),
          applies_to_roles = COALESCE($5, applies_to_roles),
          priority_order = COALESCE($6, priority_order),
          is_active = COALESCE($7, is_active),
          effective_date = COALESCE($8, effective_date),
          expiry_date = $9,
          updated_by = $10,
          updated_at = NOW()
      WHERE id = $11
      RETURNING id, policy_code, policy_name, is_active
    `, [
      policy_name, description, 
      configuration ? JSON.stringify(configuration) : null,
      applies_to_departments, applies_to_roles, priority_order,
      is_active, effective_date, expiry_date,
      req.user.id, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Refresh compliance engine
    await complianceEngine.refresh();

    res.json({
      message: 'Internal policy updated successfully',
      policy: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

/**
 * =================================
 * COMPLIANCE PROFILES ENDPOINTS
 * =================================
 */

// GET /api/compliance/profiles - List all compliance profiles
router.get('/profiles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, profile_name, description, applicable_regulations, applicable_policies,
             retention_period_years, monitoring_level, data_classification,
             configuration_overrides, created_at, updated_at
      FROM compliance_profiles
      ORDER BY profile_name
    `);

    res.json({
      profiles: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching compliance profiles:', error);
    res.status(500).json({ error: 'Failed to fetch compliance profiles' });
  }
});

// POST /api/compliance/profiles - Create new compliance profile
router.post('/profiles', requireAdmin, async (req, res) => {
  try {
    const {
      profile_name,
      description,
      applicable_regulations,
      applicable_policies,
      retention_period_years,
      monitoring_level,
      data_classification,
      configuration_overrides
    } = req.body;

    if (!profile_name) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    const result = await pool.query(`
      INSERT INTO compliance_profiles (
        profile_name, description, applicable_regulations, applicable_policies,
        retention_period_years, monitoring_level, data_classification,
        configuration_overrides, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, profile_name, monitoring_level, data_classification
    `, [
      profile_name, description,
      applicable_regulations || [],
      applicable_policies || [],
      retention_period_years || 3,
      monitoring_level || 'standard',
      data_classification || 'internal',
      configuration_overrides ? JSON.stringify(configuration_overrides) : {},
      req.user.id
    ]);

    res.status(201).json({
      message: 'Compliance profile created successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating compliance profile:', error);
    res.status(500).json({ error: 'Failed to create compliance profile' });
  }
});

/**
 * =================================
 * EMPLOYEE COMPLIANCE ENDPOINTS
 * =================================
 */

// GET /api/compliance/employees - List all employees with compliance info
router.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.email,
        e.department,
        e.job_title,
        e.photo_url,
        e.risk_level,
        e.is_active,
        cp.profile_name as compliance_profile,
        cp.monitoring_level,
        cp.data_classification,
        CASE 
          WHEN cp.id IS NULL THEN 'non_compliant'
          WHEN e.risk_level = 'high' THEN 'at_risk'
          ELSE 'compliant'
        END as compliance_status,
        ARRAY[cp.profile_name] as compliance_profiles
      FROM employees e
      LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
      WHERE e.is_active = true
      ORDER BY e.name
    `);

    res.json({
      employees: result.rows,
      count: result.rows.length,
      summary: {
        total: result.rows.length,
        compliant: result.rows.filter(e => e.compliance_status === 'compliant').length,
        at_risk: result.rows.filter(e => e.compliance_status === 'at_risk').length,
        non_compliant: result.rows.filter(e => e.compliance_status === 'non_compliant').length
      }
    });
  } catch (error) {
    console.error('Error fetching employees for compliance:', error);
    res.status(500).json({ error: 'Failed to fetch employees for compliance management' });
  }
});

// POST /api/compliance/employees/bulk-evaluate - Bulk evaluate all employees
router.post('/employees/bulk-evaluate', requireAdmin, async (req, res) => {
  try {
    const employeesResult = await pool.query('SELECT id FROM employees WHERE is_active = true');
    const employeeIds = employeesResult.rows.map(row => row.id);
    
    let evaluatedCount = 0;
    let errors = [];
    
    for (const employeeId of employeeIds) {
      try {
        await complianceEngine.evaluateEmployeeCompliance(employeeId);
        evaluatedCount++;
      } catch (error) {
        console.error(`Failed to evaluate employee ${employeeId}:`, error);
        errors.push({ employeeId, error: error.message });
      }
    }
    
    res.json({
      message: 'Bulk evaluation completed',
      results: {
        total: employeeIds.length,
        evaluated: evaluatedCount,
        failed: errors.length,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Error during bulk employee evaluation:', error);
    res.status(500).json({ error: 'Failed to perform bulk employee evaluation' });
  }
});

// GET /api/compliance/employees/:id/evaluate - Evaluate employee compliance
router.get('/employees/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if employee exists
    const employeeCheck = await pool.query('SELECT id, name FROM employees WHERE id = $1', [id]);
    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Evaluate compliance
    const compliance = await complianceEngine.evaluateEmployeeCompliance(parseInt(id));

    res.json({
      employee: employeeCheck.rows[0],
      compliance
    });
  } catch (error) {
    console.error('Error evaluating employee compliance:', error);
    res.status(500).json({ error: 'Failed to evaluate employee compliance' });
  }
});

// PUT /api/compliance/employees/:id/profile - Assign compliance profile to employee
router.put('/employees/:id/profile', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { compliance_profile_id, compliance_notes } = req.body;

    // Verify compliance profile exists
    if (compliance_profile_id) {
      const profileCheck = await pool.query(
        'SELECT id, profile_name FROM compliance_profiles WHERE id = $1', 
        [compliance_profile_id]
      );
      if (profileCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Compliance profile not found' });
      }
    }

    const result = await pool.query(`
      UPDATE employees 
      SET compliance_profile_id = $1, 
          compliance_notes = $2,
          last_compliance_review = NOW()
      WHERE id = $3
      RETURNING id, name, compliance_profile_id
    `, [compliance_profile_id, compliance_notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      message: 'Employee compliance profile updated successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating employee compliance profile:', error);
    res.status(500).json({ error: 'Failed to update employee compliance profile' });
  }
});

// GET /api/compliance/employees/status - Get compliance status for all employees
router.get('/employees/status', async (req, res) => {
  try {
    const { department, profile, status } = req.query;
    
    let query = `
      SELECT * FROM employee_compliance_status
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (department) {
      paramCount++;
      query += ` AND department = $${paramCount}`;
      params.push(department);
    }

    if (profile) {
      paramCount++;
      query += ` AND compliance_profile = $${paramCount}`;
      params.push(profile);
    }

    if (status) {
      paramCount++;
      if (status === 'needs_attention') {
        query += ` AND (retention_status IN ('overdue', 'due_soon') OR review_status IN ('never_reviewed', 'review_overdue', 'review_due_soon'))`;
      } else {
        query += ` AND retention_status = $${paramCount}`;
        params.push(status);
      }
    }

    query += ` ORDER BY name`;

    const result = await pool.query(query, params);

    // Group by status for summary
    const summary = result.rows.reduce((acc, employee) => {
      const key = employee.retention_status === 'compliant' && employee.review_status === 'up_to_date' 
        ? 'compliant' 
        : 'needs_attention';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      employees: result.rows,
      summary,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching employee compliance status:', error);
    res.status(500).json({ error: 'Failed to fetch employee compliance status' });
  }
});

/**
 * =================================
 * AI-ENHANCED COMPLIANCE ENDPOINTS
 * =================================
 */

// GET /api/compliance/ai/employees/:id/evaluate - AI-Enhanced compliance evaluation
router.get('/ai/employees/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_predictive = 'true' } = req.query;
    
    console.log(`🤖 AI-Enhanced compliance evaluation requested for employee ${id}`);

    const aiComplianceResult = await complianceEngine.evaluateEmployeeComplianceWithAI(
      parseInt(id), 
      { 
        includePredictive: include_predictive === 'true' 
      }
    );

    res.json({
      message: 'AI-enhanced compliance evaluation completed',
      employee: {
        id: parseInt(id),
        name: aiComplianceResult.employeeName,
        department: aiComplianceResult.department
      },
      evaluation: aiComplianceResult,
      aiEnhanced: aiComplianceResult.aiEnhanced,
      evaluatedAt: aiComplianceResult.enhancedAt || aiComplianceResult.evaluatedAt
    });

  } catch (error) {
    console.error('Error in AI-enhanced compliance evaluation:', error);
    res.status(500).json({ 
      error: 'Failed to perform AI-enhanced compliance evaluation',
      details: error.message,
      aiEnhanced: false
    });
  }
});

// POST /api/compliance/ai/batch-evaluate - Batch AI-Enhanced compliance evaluation
router.post('/ai/batch-evaluate', async (req, res) => {
  try {
    const { employee_ids, include_predictive = true, batch_size = 5 } = req.body;

    if (!employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ 
        error: 'employee_ids array is required' 
      });
    }

    console.log(`🚀 Batch AI compliance evaluation for ${employee_ids.length} employees`);

    const startTime = Date.now();
    const batchResults = await complianceEngine.batchEvaluateComplianceWithAI(
      employee_ids, 
      { 
        includePredictive: include_predictive,
        batchSize: batch_size
      }
    );
    const processingTime = Date.now() - startTime;

    // Calculate summary statistics
    const summary = {
      totalEmployees: employee_ids.length,
      successfulEvaluations: batchResults.filter(r => !r.error).length,
      aiEnhancedEvaluations: batchResults.filter(r => r.aiEnhanced).length,
      averageRiskScore: batchResults
        .filter(r => r.intelligentRiskScore !== undefined)
        .reduce((sum, r) => sum + r.intelligentRiskScore, 0) / 
        Math.max(batchResults.filter(r => r.intelligentRiskScore !== undefined).length, 1),
      highRiskEmployees: batchResults.filter(r => 
        (r.intelligentRiskScore || r.overallRiskScore || 0) >= 70
      ).length,
      processingTimeMs: processingTime
    };

    res.json({
      message: 'Batch AI-enhanced compliance evaluation completed',
      summary,
      results: batchResults,
      processedAt: new Date()
    });

  } catch (error) {
    console.error('Error in batch AI compliance evaluation:', error);
    res.status(500).json({ 
      error: 'Failed to perform batch AI compliance evaluation',
      details: error.message 
    });
  }
});

// GET /api/compliance/ai/predictive-risks - Predictive compliance risk assessment
router.get('/ai/predictive-risks', async (req, res) => {
  try {
    const { department } = req.query;

    console.log(`🔮 Predictive compliance risk assessment${department ? ` for ${department} department` : ''}`);

    const riskAssessment = await complianceEngine.predictComplianceRisks(department);

    // Calculate additional insights
    const insights = {
      totalRiskScore: riskAssessment.riskAssessments.reduce(
        (sum, assessment) => sum + assessment.currentRiskScore, 0
      ),
      averageRiskScore: riskAssessment.riskAssessments.length > 0 ?
        riskAssessment.riskAssessments.reduce(
          (sum, assessment) => sum + assessment.currentRiskScore, 0
        ) / riskAssessment.riskAssessments.length : 0,
      riskDistribution: {
        critical: riskAssessment.riskAssessments.filter(a => a.currentRiskScore >= 80).length,
        high: riskAssessment.riskAssessments.filter(a => a.currentRiskScore >= 60 && a.currentRiskScore < 80).length,
        medium: riskAssessment.riskAssessments.filter(a => a.currentRiskScore >= 40 && a.currentRiskScore < 60).length,
        low: riskAssessment.riskAssessments.filter(a => a.currentRiskScore < 40).length
      },
      departmentBreakdown: {}
    };

    // Calculate department-wise breakdown
    riskAssessment.riskAssessments.forEach(assessment => {
      const dept = assessment.department;
      if (!insights.departmentBreakdown[dept]) {
        insights.departmentBreakdown[dept] = { count: 0, totalRisk: 0 };
      }
      insights.departmentBreakdown[dept].count++;
      insights.departmentBreakdown[dept].totalRisk += assessment.currentRiskScore;
    });

    // Calculate average risk per department
    Object.keys(insights.departmentBreakdown).forEach(dept => {
      const dept_data = insights.departmentBreakdown[dept];
      dept_data.averageRisk = dept_data.totalRisk / dept_data.count;
    });

    res.json({
      message: 'Predictive compliance risk assessment completed',
      assessment: riskAssessment,
      insights,
      analyzedAt: new Date()
    });

  } catch (error) {
    console.error('Error in predictive compliance risk assessment:', error);
    res.status(500).json({ 
      error: 'Failed to perform predictive compliance risk assessment',
      details: error.message,
      hint: 'Ensure AI compliance analysis is enabled'
    });
  }
});

// GET /api/compliance/ai/status - AI compliance analysis status and capabilities
router.get('/ai/status', async (req, res) => {
  try {
    const aiStatus = {
      enabled: complianceEngine.aiEnabled,
      initialized: complianceEngine.aiAnalyzer?.initialized || false,
      capabilities: {
        behavioralAnalysis: complianceEngine.aiEnabled,
        predictiveRisks: complianceEngine.aiEnabled,
        contextualCompliance: complianceEngine.aiEnabled,
        intelligentRecommendations: complianceEngine.aiEnabled
      },
      configuration: {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        enabledByDefault: process.env.ENABLE_AI_COMPLIANCE !== 'false'
      },
      lastInitialized: complianceEngine.initialized ? new Date() : null
    };

    // Get usage statistics if available
    try {
      const usageStats = await pool.query(`
        SELECT 
          COUNT(*) as total_evaluations,
          COUNT(CASE WHEN ai_enhanced = true THEN 1 END) as ai_enhanced_evaluations,
          MAX(evaluated_at) as last_evaluation
        FROM (
          SELECT TRUE as ai_enhanced, NOW() as evaluated_at 
          WHERE FALSE  -- Placeholder query
        ) usage_log
      `);

      if (usageStats.rows[0]) {
        aiStatus.usage = usageStats.rows[0];
      }
    } catch (statsError) {
      // Stats query failed, continue without usage data
      aiStatus.usage = null;
    }

    res.json({
      message: 'AI compliance analysis status',
      status: aiStatus,
      checkedAt: new Date()
    });

  } catch (error) {
    console.error('Error checking AI compliance status:', error);
    res.status(500).json({ 
      error: 'Failed to check AI compliance status',
      details: error.message 
    });
  }
});

/**
 * =================================
 * SYNC-TRIGGERED AI COMPLIANCE ENDPOINTS
 * =================================
 */

// GET /api/compliance/sync/status - Sync compliance analysis status
router.get('/sync/status', async (req, res) => {
  try {
    const syncStats = await syncComplianceAnalyzer.getSyncAnalysisStats();
    
    res.json({
      message: 'Sync-triggered AI compliance analysis status',
      status: {
        enabled: syncComplianceAnalyzer.enabled,
        batchSize: syncComplianceAnalyzer.batchSize,
        delayBetweenAnalysis: syncComplianceAnalyzer.delayBetweenAnalysis,
        queueStatus: syncStats?.queueStatus || {
          queueSize: syncComplianceAnalyzer.analysisQueue.size,
          processing: syncComplianceAnalyzer.processing,
          enabled: syncComplianceAnalyzer.enabled
        }
      },
      statistics: syncStats || {},
      checkedAt: new Date()
    });

  } catch (error) {
    console.error('Error checking sync compliance status:', error);
    res.status(500).json({ 
      error: 'Failed to check sync compliance status',
      details: error.message 
    });
  }
});

// POST /api/compliance/sync/analyze-recent - Trigger analysis for recent email activity
router.post('/sync/analyze-recent', requireAdmin, async (req, res) => {
  try {
    const { hours_back = 24 } = req.body;

    console.log(`🔄 Triggering sync analysis for employees with email activity in last ${hours_back} hours`);

    await syncComplianceAnalyzer.analyzeRecentEmailActivity(hours_back);

    res.json({
      message: `Sync analysis triggered for employees with email activity in last ${hours_back} hours`,
      hoursBack: hours_back,
      triggeredAt: new Date()
    });

  } catch (error) {
    console.error('Error triggering recent email analysis:', error);
    res.status(500).json({ 
      error: 'Failed to trigger recent email analysis',
      details: error.message 
    });
  }
});

// POST /api/compliance/sync/queue-employees - Queue specific employees for sync analysis
router.post('/sync/queue-employees', requireAdmin, async (req, res) => {
  try {
    const { employee_ids, reason = 'manual_queue' } = req.body;

    if (!employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ 
        error: 'employee_ids array is required' 
      });
    }

    console.log(`📋 Manually queuing ${employee_ids.length} employees for sync compliance analysis`);

    await syncComplianceAnalyzer.queueEmployeesForAnalysis(employee_ids, reason);

    res.json({
      message: `${employee_ids.length} employees queued for sync compliance analysis`,
      employeeIds: employee_ids,
      reason,
      queuedAt: new Date()
    });

  } catch (error) {
    console.error('Error queuing employees for sync analysis:', error);
    res.status(500).json({ 
      error: 'Failed to queue employees for sync analysis',
      details: error.message 
    });
  }
});

// GET /api/compliance/sync/alerts - Get sync-triggered compliance alerts
router.get('/sync/alerts', async (req, res) => {
  try {
    const { status = 'active', severity, employee_id } = req.query;

    let query = `
      SELECT ca.*, e.name as employee_name, e.department
      FROM compliance_alerts ca
      LEFT JOIN employees e ON ca.employee_id = e.id
      WHERE ca.triggered_by = 'sync_ai_analysis'
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND ca.status = $${paramCount}`;
      params.push(status);
    }

    if (severity) {
      paramCount++;
      query += ` AND ca.severity = $${paramCount}`;
      params.push(severity);
    }

    if (employee_id) {
      paramCount++;
      query += ` AND ca.employee_id = $${paramCount}`;
      params.push(employee_id);
    }

    query += ` ORDER BY ca.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    // Get summary statistics
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_alerts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as alerts_24h
      FROM compliance_alerts 
      WHERE triggered_by = 'sync_ai_analysis'
    `);

    res.json({
      message: 'Sync-triggered compliance alerts',
      alerts: result.rows,
      summary: summaryResult.rows[0],
      count: result.rows.length,
      retrievedAt: new Date()
    });

  } catch (error) {
    console.error('Error fetching sync compliance alerts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sync compliance alerts',
      details: error.message 
    });
  }
});

/**
 * =================================
 * COMPLIANCE INCIDENTS ENDPOINTS
 * =================================
 */

// GET /api/compliance/incidents - List compliance incidents
router.get('/incidents', async (req, res) => {
  try {
    const { status, severity, employee_id } = req.query;
    
    let query = `
      SELECT * FROM compliance_incidents
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (severity) {
      paramCount++;
      query += ` AND severity = $${paramCount}`;
      params.push(severity);
    }

    if (employee_id) {
      paramCount++;
      query += ` AND employee_id = $${paramCount}`;
      params.push(employee_id);
    }

    query += ` ORDER BY discovered_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      incidents: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching compliance incidents:', error);
    res.status(500).json({ error: 'Failed to fetch compliance incidents' });
  }
});

// POST /api/compliance/incidents - Create new compliance incident
router.post('/incidents', async (req, res) => {
  try {
    const {
      incident_type,
      severity,
      title,
      description,
      employee_id,
      violation_id,
      regulation_id,
      policy_id,
      impact_assessment,
      must_notify_by,
      assigned_to
    } = req.body;

    if (!incident_type || !severity || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields: incident_type, severity, title' 
      });
    }

    const result = await pool.query(`
      INSERT INTO violations (
        employee_id, type, severity, description, source, incident_type,
        regulation_id, policy_id, impact_assessment, must_notify_by, assigned_to,
        workflow_status, discovered_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, incident_type, severity, type as title, workflow_status as status
    `, [
      employee_id, title, severity, description, 'manual_compliance_incident', incident_type,
      regulation_id, policy_id, impact_assessment, must_notify_by, assigned_to,
      'open', new Date(), JSON.stringify({ created_by: req.user.id, manual: true })
    ]);

    res.status(201).json({
      message: 'Compliance incident created successfully',
      incident: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating compliance incident:', error);
    res.status(500).json({ error: 'Failed to create compliance incident' });
  }
});

/**
 * =================================
 * COMPLIANCE DASHBOARD ENDPOINTS
 * =================================
 */

// GET /api/compliance/dashboard - Get compliance dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get compliance summary statistics
    const [
      regulationsResult,
      policiesResult,
      profilesResult,
      employeesResult,
      incidentsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM compliance_regulations'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM internal_policies'),
      pool.query('SELECT COUNT(*) as total FROM compliance_profiles'),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE compliance_profile_id IS NOT NULL) as assigned_profile,
          COUNT(*) FILTER (WHERE last_compliance_review IS NULL) as never_reviewed,
          COUNT(*) FILTER (WHERE data_retention_until < CURRENT_DATE) as retention_overdue
        FROM employees
      `),
      // Use the compliance_incidents view which pulls from enhanced violations table
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE severity = 'Critical' OR severity = 'critical') as critical,
          COUNT(*) FILTER (WHERE must_notify_by < NOW() AND status != 'closed') as notification_overdue
        FROM compliance_incidents
      `)
    ]);

    const dashboard = {
      regulations: {
        total: parseInt(regulationsResult.rows[0].total),
        active: parseInt(regulationsResult.rows[0].active)
      },
      policies: {
        total: parseInt(policiesResult.rows[0].total),
        active: parseInt(policiesResult.rows[0].active)
      },
      profiles: {
        total: parseInt(profilesResult.rows[0].total)
      },
      employees: {
        total: parseInt(employeesResult.rows[0].total),
        assignedProfile: parseInt(employeesResult.rows[0].assigned_profile),
        neverReviewed: parseInt(employeesResult.rows[0].never_reviewed),
        retentionOverdue: parseInt(employeesResult.rows[0].retention_overdue)
      },
      incidents: {
        total: parseInt(incidentsResult.rows[0].total),
        open: parseInt(incidentsResult.rows[0].open),
        critical: parseInt(incidentsResult.rows[0].critical),
        notificationOverdue: parseInt(incidentsResult.rows[0].notification_overdue)
      },
      complianceScore: {
        // Calculate real compliance score based on data
        overall: calculateComplianceScore(employeesResult.rows[0], incidentsResult.rows[0]),
        trend: 'improving'
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching compliance dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch compliance dashboard data' });
  }
});

// Helper function to calculate real compliance score
function calculateComplianceScore(employeeData, incidentData) {
  const total = parseInt(employeeData.total);
  const assigned = parseInt(employeeData.assigned_profile);
  const neverReviewed = parseInt(employeeData.never_reviewed);
  const openIncidents = parseInt(incidentData.open);
  const criticalIncidents = parseInt(incidentData.critical);
  
  if (total === 0) return 85; // Default if no employees
  
  // Base score from employee compliance
  const profileScore = total > 0 ? (assigned / total) * 40 : 0;
  const reviewScore = total > 0 ? ((total - neverReviewed) / total) * 30 : 0;
  
  // Deduct points for incidents
  const incidentPenalty = Math.min(criticalIncidents * 10 + openIncidents * 2, 30);
  
  const score = Math.round(profileScore + reviewScore + 30 - incidentPenalty);
  return Math.max(0, Math.min(100, score));
}

/**
 * =================================
 * COMPLIANCE SYSTEM ENDPOINTS
 * =================================
 */

// POST /api/compliance/refresh - Refresh compliance engine
router.post('/refresh', requireAdmin, async (req, res) => {
  try {
    await complianceEngine.refresh();
    
    res.json({
      message: 'Compliance engine refreshed successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error refreshing compliance engine:', error);
    res.status(500).json({ error: 'Failed to refresh compliance engine' });
  }
});

// GET /api/compliance/audit-log - Get compliance audit trail
router.get('/audit-log', async (req, res) => {
  try {
    const { entity_type, entity_id, performed_by, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT cal.*, u.name as performed_by_name
      FROM compliance_audit_log cal
      LEFT JOIN users u ON cal.performed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (entity_type) {
      paramCount++;
      query += ` AND cal.entity_type = $${paramCount}`;
      params.push(entity_type);
    }

    if (entity_id) {
      paramCount++;
      query += ` AND cal.entity_id = $${paramCount}`;
      params.push(entity_id);
    }

    if (performed_by) {
      paramCount++;
      query += ` AND cal.performed_by = $${paramCount}`;
      params.push(performed_by);
    }

    paramCount++;
    query += ` ORDER BY cal.performed_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    res.json({
      auditLog: result.rows,
      count: result.rows.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching compliance audit log:', error);
    res.status(500).json({ error: 'Failed to fetch compliance audit log' });
  }
});

module.exports = router; 