const express = require('express');
const router = express.Router();
const { requireAuth, requireAnalyst, requireAdmin } = require('../middleware/auth');
const { query } = require('../utils/database');
const { generateNaturalLanguageResponse } = require('../services/aiService');

// Apply authentication middleware to all violation routes
router.use(requireAuth);

/**
 * @swagger
 * /api/violations:
 *   get:
 *     summary: Get violations list
 *     description: Retrieve violations with filtering, pagination, and sorting
 *     tags: [Violations]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Investigating, False Positive, Resolved]
 *         description: Filter by status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [Critical, High, Medium, Low]
 *         description: Filter by severity
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *     responses:
 *       200:
 *         description: Violations retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      employeeId,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔧 Debug: Violations filter request:', { status, severity, employeeId, sortBy, sortOrder });

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (status) {
      console.log('🔧 Debug: Adding status filter:', status);
      whereConditions.push(`v.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (severity) {
      console.log('🔧 Debug: Adding severity filter:', severity);
      whereConditions.push(`v.severity = $${paramIndex++}`);
      queryParams.push(severity);
    }

    if (employeeId) {
      console.log('🔧 Debug: Adding employee filter:', employeeId);
      whereConditions.push(`v.employee_id = $${paramIndex++}`);
      queryParams.push(parseInt(employeeId));
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    console.log('🔧 Debug: Final WHERE clause:', whereClause);
    console.log('🔧 Debug: Query parameters:', queryParams);

    // Get violations with employee data
    const violationsQuery = `
      SELECT 
        v.*,
        e.name as employee_name,
        e.email as employee_email,
        e.department as employee_department,
        e.photo_url as employee_photo,
        ec.id as related_email_id,
        ec.subject as related_email_subject,
        ec.sender_email as related_email_sender,
        ec.sent_at as related_email_sent_at,
        ec.risk_score as related_email_risk_score
      FROM violations v
      LEFT JOIN employees e ON v.employee_id = e.id
      LEFT JOIN email_communications ec ON ec.message_id = (v.metadata->>'emailId')
      ${whereClause}
      ORDER BY v.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(parseInt(limit), offset);

    console.log('🔧 Debug: Executing violations query with params:', queryParams);
    const result = await query(violationsQuery, queryParams);
    console.log('🔧 Debug: Query returned', result.rows.length, 'violations');

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM violations v
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    console.log('🔧 Debug: Total violations matching filter:', total);

    res.json({
      violations: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        status: row.status,
        description: row.description,
        evidence: row.evidence,
        structuredEvidence: row.structured_evidence,
        aiValidationStatus: row.ai_validation_status,
        aiValidationScore: row.ai_validation_score,
        aiValidationReasoning: row.ai_validation_reasoning,
        source: row.source,
        metadata: row.metadata,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        updatedAt: row.updated_at,
        employee: {
          name: row.employee_name,
          email: row.employee_email,
          department: row.employee_department,
          photo: row.employee_photo
        },
        relatedEmail: row.related_email_id ? {
          id: row.related_email_id,
          subject: row.related_email_subject,
          sender: row.related_email_sender,
          sentAt: row.related_email_sent_at,
          riskScore: row.related_email_risk_score
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({
      error: 'Failed to retrieve violations',
      code: 'VIOLATIONS_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/violations/stats:
 *   get:
 *     summary: Get violation statistics
 *     description: Retrieve comprehensive violation statistics and trends
 *     tags: [Violations]
 *     security:
 *       - sessionAuth: []
 */
router.get('/stats', async (req, res) => {
  try {
    // Status distribution
    const statusStats = await query(`
      SELECT status, COUNT(*) as count
      FROM violations
      GROUP BY status
      ORDER BY count DESC
    `);

    // Severity distribution
    const severityStats = await query(`
      SELECT severity, COUNT(*) as count
      FROM violations
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END
    `);

    // Compliance severity distribution (replacing AI validation stats)
    const complianceStats = await query(`
      SELECT 
        COALESCE(compliance_severity, 'Not Classified') as compliance_severity, 
        COUNT(*) as count
      FROM violations
      GROUP BY compliance_severity
      ORDER BY count DESC
    `);

    // Recent trends (last 30 days)
    const trendsStats = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_violations,
        COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'False Positive' THEN 1 END) as false_positive_count
      FROM violations
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top violation types
    const typeStats = await query(`
      SELECT type, COUNT(*) as count, severity
      FROM violations
      GROUP BY type, severity
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      statusDistribution: statusStats.rows,
      severityDistribution: severityStats.rows,
      complianceDistribution: complianceStats.rows,
      trends: trendsStats.rows,
      topViolationTypes: typeStats.rows,
      summary: {
        total: statusStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        active: statusStats.rows.find(row => row.status === 'Active')?.count || 0,
        investigating: statusStats.rows.find(row => row.status === 'Investigating')?.count || 0,
        resolved: statusStats.rows.find(row => row.status === 'Resolved')?.count || 0,
        falsePositive: statusStats.rows.find(row => row.status === 'False Positive')?.count || 0
      }
    });

  } catch (error) {
    console.error('Get violation statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve violation statistics',
      code: 'VIOLATION_STATS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/violations/{id}:
 *   get:
 *     summary: Get violation details
 *     description: Retrieve detailed information about a specific violation
 *     tags: [Violations]
 *     security:
 *       - sessionAuth: []
 */
router.get('/:id', async (req, res) => {
  try {
    const violationId = parseInt(req.params.id);

    if (isNaN(violationId)) {
      return res.status(400).json({
        error: 'Invalid violation ID',
        code: 'INVALID_VIOLATION_ID'
      });
    }

    // Get violation with employee data and status history
    const violationQuery = `
      SELECT 
        v.*,
        e.name as employee_name,
        e.email as employee_email,
        e.department as employee_department,
        e.photo_url as employee_photo,
        e.job_title as employee_job_title,
        ec.id as related_email_id,
        ec.subject as related_email_subject,
        ec.sender_email as related_email_sender,
        ec.recipients as related_email_recipients,
        ec.sent_at as related_email_sent_at,
        ec.risk_score as related_email_risk_score,
        ec.body_text as related_email_body
      FROM violations v
      LEFT JOIN employees e ON v.employee_id = e.id
      LEFT JOIN email_communications ec ON ec.message_id = (v.metadata->>'emailId')
      WHERE v.id = $1
    `;

    const violationResult = await query(violationQuery, [violationId]);

    if (violationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Violation not found',
        code: 'VIOLATION_NOT_FOUND'
      });
    }

    // Get status history
    const historyQuery = `
      SELECT 
        vsh.*,
        u.name as changed_by_name,
        u.email as changed_by_email
      FROM violation_status_history vsh
      LEFT JOIN users u ON vsh.changed_by = u.id
      WHERE vsh.violation_id = $1
      ORDER BY vsh.created_at DESC
    `;

    const historyResult = await query(historyQuery, [violationId]);

    // Get AI validation requests
    const aiRequestsQuery = `
      SELECT *
      FROM ai_validation_requests
      WHERE violation_id = $1
      ORDER BY created_at DESC
    `;

    const aiRequestsResult = await query(aiRequestsQuery, [violationId]);

    const violation = violationResult.rows[0];

    res.json({
      violation: {
        id: violation.id,
        type: violation.type,
        severity: violation.severity,
        status: violation.status,
        description: violation.description,
        evidence: violation.evidence,
        structuredEvidence: violation.structured_evidence,
        aiValidationStatus: violation.ai_validation_status,
        aiValidationScore: violation.ai_validation_score,
        aiValidationReasoning: violation.ai_validation_reasoning,
        aiValidatedAt: violation.ai_validated_at,
        source: violation.source,
        metadata: violation.metadata,
        createdAt: violation.created_at,
        resolvedAt: violation.resolved_at,
        updatedAt: violation.updated_at,
        employee: {
          name: violation.employee_name,
          email: violation.employee_email,
          department: violation.employee_department,
          jobTitle: violation.employee_job_title,
          photo: violation.employee_photo
        },
        relatedEmail: violation.related_email_id ? {
          id: violation.related_email_id,
          subject: violation.related_email_subject,
          sender: violation.related_email_sender,
          recipients: violation.related_email_recipients,
          sentAt: violation.related_email_sent_at,
          riskScore: violation.related_email_risk_score,
          bodyPreview: violation.related_email_body ? violation.related_email_body.substring(0, 200) + '...' : null
        } : null
      },
      statusHistory: historyResult.rows.map(row => ({
        id: row.id,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        changeReason: row.change_reason,
        aiAssisted: row.ai_assisted,
        aiConfidence: row.ai_confidence,
        metadata: row.metadata,
        createdAt: row.created_at,
        changedBy: row.changed_by_name ? {
          name: row.changed_by_name,
          email: row.changed_by_email
        } : null
      })),
      aiValidationRequests: aiRequestsResult.rows
    });

  } catch (error) {
    console.error('Get violation details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve violation details',
      code: 'VIOLATION_DETAILS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/violations/{id}/status:
 *   put:
 *     summary: Update violation status
 *     description: Update the status of a violation with audit trail
 *     tags: [Violations]
 *     security:
 *       - sessionAuth: []
 */
router.put('/:id/status', requireAnalyst, async (req, res) => {
  try {
    const violationId = parseInt(req.params.id);
    const { status, reason, aiAssisted = false } = req.body;

    console.log('🔧 Status update request:', { violationId, status, reason, userId: req.user?.id });

    if (isNaN(violationId)) {
      return res.status(400).json({
        error: 'Invalid violation ID',
        code: 'INVALID_VIOLATION_ID'
      });
    }

    if (!['Active', 'Investigating', 'False Positive', 'Resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value',
        code: 'INVALID_STATUS'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Reason is required for status change',
        code: 'MISSING_REASON'
      });
    }

    // Get current violation
    const currentResult = await query('SELECT * FROM violations WHERE id = $1', [violationId]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Violation not found',
        code: 'VIOLATION_NOT_FOUND'
      });
    }

    const currentViolation = currentResult.rows[0];
    console.log('🔧 Current violation status:', currentViolation.status);

    // Prepare metadata for the status change
    const statusChangeMetadata = {
      changed_by: req.user.id,
      change_reason: reason,
      ai_assisted: aiAssisted,
      status_change_timestamp: new Date().toISOString(),
      previous_status: currentViolation.status
    };

    // Get existing metadata or create empty object
    let existingMetadata = {};
    try {
      if (currentViolation.metadata) {
        existingMetadata = typeof currentViolation.metadata === 'string' 
          ? JSON.parse(currentViolation.metadata) 
          : currentViolation.metadata;
      }
    } catch (e) {
      console.warn('⚠️ Invalid existing metadata, starting fresh:', e.message);
      existingMetadata = {};
    }

    // Merge metadata
    const updatedMetadata = {
      ...existingMetadata,
      ...statusChangeMetadata
    };

    console.log('🔧 Updating with metadata:', updatedMetadata);

    // Update violation
    const updateQuery = `
      UPDATE violations 
      SET 
        status = $1,
        resolved_at = CASE WHEN $4 = 'Resolved' THEN NOW() ELSE resolved_at END,
        updated_at = NOW(),
        metadata = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(updateQuery, [
      status,
      JSON.stringify(updatedMetadata),
      violationId,
      status  // Add status again as 4th parameter for CASE condition
    ]);

    console.log('✅ Status update successful');

    res.json({
      message: 'Violation status updated successfully',
      violation: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        resolvedAt: result.rows[0].resolved_at,
        updatedAt: result.rows[0].updated_at
      },
      statusChange: {
        from: currentViolation.status,
        to: status,
        reason,
        changedBy: req.user.name || req.user.email,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Update violation status error:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Failed to update violation status',
      code: 'STATUS_UPDATE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/violations/{id}/ai-validate:
 *   post:
 *     summary: Request AI validation of violation evidence
 *     description: Submit violation for AI analysis and validation
 *     tags: [Violations]
 *     security:
 *       - sessionAuth: []
 */
router.post('/:id/ai-validate', requireAnalyst, async (req, res) => {
  try {
    const violationId = parseInt(req.params.id);
    const { validationType = 'evidence_validation', additionalContext } = req.body;

    if (isNaN(violationId)) {
      return res.status(400).json({
        error: 'Invalid violation ID',
        code: 'INVALID_VIOLATION_ID'
      });
    }

    // Get violation details
    const violationResult = await query(`
      SELECT v.*, e.name as employee_name, e.email as employee_email
      FROM violations v
      LEFT JOIN employees e ON v.employee_id = e.id
      WHERE v.id = $1
    `, [violationId]);

    if (violationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Violation not found',
        code: 'VIOLATION_NOT_FOUND'
      });
    }

    const violation = violationResult.rows[0];

    // Create AI validation request
    const requestQuery = `
      INSERT INTO ai_validation_requests (
        violation_id, request_type, request_data, created_by, status
      ) VALUES ($1, $2, $3, $4, 'processing')
      RETURNING id
    `;

    const requestData = {
      violation: {
        type: violation.type,
        severity: violation.severity,
        description: violation.description,
        evidence: violation.evidence,
        structuredEvidence: violation.structured_evidence
      },
      employee: {
        name: violation.employee_name,
        email: violation.employee_email
      },
      additionalContext,
      requestTimestamp: new Date().toISOString()
    };

    const requestResult = await query(requestQuery, [
      violationId,
      validationType,
      JSON.stringify(requestData),
      req.user.id
    ]);

    const requestId = requestResult.rows[0].id;

    // Process AI validation in background
    processAIValidation(requestId, violation, validationType, requestData)
      .catch(error => console.error('AI validation processing error:', error));

    res.json({
      message: 'AI validation request submitted successfully',
      requestId,
      status: 'processing',
      estimatedCompletionTime: '30-60 seconds'
    });

  } catch (error) {
    console.error('AI validation request error:', error);
    res.status(500).json({
      error: 'Failed to submit AI validation request',
      code: 'AI_VALIDATION_ERROR'
    });
  }
});

// Background AI validation processing
async function processAIValidation(requestId, violation, validationType, requestData) {
  const startTime = Date.now();

  try {
    console.log(`🤖 Processing AI validation request ${requestId} for violation ${violation.id}`);

    // Prepare AI prompt based on validation type
    let aiPrompt = '';
    
    if (validationType === 'evidence_validation') {
      aiPrompt = `
        Please analyze the following security violation and its evidence to determine if it's legitimate or a false positive.

        Violation Details:
        - Type: ${violation.type}
        - Severity: ${violation.severity}
        - Description: ${violation.description}
        - Employee: ${requestData.employee.name} (${requestData.employee.email})

        Evidence:
        ${violation.evidence ? violation.evidence.join('\n- ') : 'No evidence provided'}

        Additional Context:
        ${requestData.additionalContext || 'None provided'}

        Please provide:
        1. Confidence score (0-100) that this is a legitimate violation
        2. Detailed reasoning for your assessment
        3. Recommendation for status (Active, Investigating, False Positive, Resolved)
        4. Any additional evidence that should be collected

        Format your response as JSON with fields: confidence_score, reasoning, recommended_status, additional_evidence_needed
      `;
    }

    // Call AI service for validation
    const aiResponse = await generateNaturalLanguageResponse({
      userMessage: aiPrompt,
      queryResults: { violation: [violation] },
      systemPrompt: 'You are a cybersecurity expert analyzing violations for false positives and evidence validation.'
    });

    let parsedResponse;
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        confidence_score: 75,
        reasoning: aiResponse,
        recommended_status: 'Investigating',
        additional_evidence_needed: []
      };
    } catch (parseError) {
      // Fallback parsing
      parsedResponse = {
        confidence_score: 70,
        reasoning: aiResponse,
        recommended_status: 'Investigating',
        additional_evidence_needed: []
      };
    }

    const processingTime = Date.now() - startTime;

    // Update AI validation request with results
    await query(`
      UPDATE ai_validation_requests
      SET 
        ai_response = $1,
        status = 'completed',
        confidence_score = $2,
        processing_time_ms = $3,
        completed_at = NOW()
      WHERE id = $4
    `, [
      JSON.stringify(parsedResponse),
      parsedResponse.confidence_score,
      processingTime,
      requestId
    ]);

    // Update violation with AI validation results
    await query(`
      UPDATE violations
      SET 
        ai_validation_status = 'validated',
        ai_validation_score = $1,
        ai_validation_reasoning = $2,
        ai_validated_at = NOW(),
        ai_validator_version = '2.0.0'
      WHERE id = $3
    `, [
      parsedResponse.confidence_score,
      parsedResponse.reasoning,
      violation.id
    ]);

    console.log(`✅ AI validation completed for violation ${violation.id} with confidence ${parsedResponse.confidence_score}%`);

  } catch (error) {
    console.error(`❌ AI validation failed for request ${requestId}:`, error);

    // Update request with error
    await query(`
      UPDATE ai_validation_requests
      SET 
        status = 'failed',
        error_message = $1,
        completed_at = NOW()
      WHERE id = $2
    `, [error.message, requestId]);

    // Update violation AI status
    await query(`
      UPDATE violations
      SET ai_validation_status = 'manual_override'
      WHERE id = $1
    `, [violation.id]);
  }
}

module.exports = router; 