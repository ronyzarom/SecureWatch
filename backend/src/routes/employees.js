const express = require('express');
const { query } = require('../utils/database');
const { requireAuth, requireAnalyst } = require('../middleware/auth');

const router = express.Router();

// All employee routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get employees list
 *     description: Retrieve employees with filtering, pagination, and sorting options
 *     tags: [Employees]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           maximum: 100
 *         description: Number of employees per page
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *         example: Finance
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [Critical, High, Medium, Low]
 *         description: Filter by risk level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *         example: sarah
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, department, risk_score, last_activity]
 *           default: risk_score
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *             example:
 *               employees:
 *                 - id: 1
 *                   name: Sarah Mitchell
 *                   email: sarah.mitchell@company.com
 *                   department: Finance
 *                   jobTitle: Senior Analyst
 *                   riskScore: 92
 *                   riskLevel: Critical
 *                   violationCount: 1
 *                   activeViolations: 1
 *               pagination:
 *                 page: 1
 *                 limit: 25
 *                 total: 6
 *                 totalPages: 1
 *                 hasNext: false
 *                 hasPrev: false
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all employees with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    
    const { 
      department, 
      riskLevel, 
      search, 
      sortBy = 'risk_score', 
      sortOrder = 'desc' 
    } = req.query;

    // Build WHERE clause
    let whereConditions = ['e.is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    if (department) {
      paramCount++;
      whereConditions.push(`e.department = $${paramCount}`);
      queryParams.push(department);
    }

    if (riskLevel) {
      paramCount++;
      whereConditions.push(`e.risk_level = $${paramCount}`);
      queryParams.push(riskLevel);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(e.name ILIKE $${paramCount} OR e.email ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort parameters
    const validSortFields = ['name', 'email', 'department', 'risk_score', 'last_activity'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'risk_score';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // Get employees with real metrics data
    paramCount += 2; // for limit and offset
    const employeesResult = await query(`
      SELECT 
        e.id,
        e.name,
        e.email,
        e.department,
        e.job_title,
        e.risk_score,
        e.risk_level,
        e.last_activity,
        e.photo_url as photo,
        e.compliance_profile_id,
        e.last_compliance_review,
        e.data_retention_until,
        cp.profile_name as compliance_profile,
        COUNT(v.id) as violation_count,
        COUNT(CASE WHEN v.status = 'Active' THEN 1 END) as active_violations,
        -- Get latest metrics for each employee
        em.email_volume,
        em.external_contacts,
        em.after_hours_activity,
        em.data_transfer,
        em.security_events,
        em.behavior_change,
        -- Get category detection summary (last 30 days)
        cds.total_detections,
        cds.unique_categories,
        cds.max_risk_score as category_max_risk,
        cds.critical_detections
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id
      LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
      LEFT JOIN LATERAL (
        SELECT 
          email_volume, external_contacts, after_hours_activity,
          data_transfer, security_events, behavior_change
        FROM employee_metrics 
        WHERE employee_id = e.id 
        ORDER BY date DESC 
        LIMIT 1
      ) em ON true
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as total_detections,
          COUNT(DISTINCT category_id) as unique_categories,
          MAX(risk_score) as max_risk_score,
          COUNT(CASE WHEN risk_score >= 80 THEN 1 END) as critical_detections
        FROM category_detection_results 
        WHERE employee_id = e.id 
          AND analyzed_at >= NOW() - INTERVAL '30 days'
      ) cds ON true
      WHERE ${whereClause}
      GROUP BY e.id, e.name, e.email, e.department, e.job_title, e.risk_score, e.risk_level, e.last_activity, e.photo_url,
               e.compliance_profile_id, e.last_compliance_review, e.data_retention_until, cp.profile_name,
               em.email_volume, em.external_contacts, em.after_hours_activity, em.data_transfer, em.security_events, em.behavior_change,
               cds.total_detections, cds.unique_categories, cds.max_risk_score, cds.critical_detections
      ORDER BY e.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, [...queryParams, limit, offset]);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(DISTINCT e.id) as total
      FROM employees e
      WHERE ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Get violations for all employees in this batch
    const employeeIds = employeesResult.rows.map(row => row.id);
    const violationsResult = await query(`
      SELECT 
        employee_id,
        id,
        type,
        severity,
        status,
        description,
        created_at
      FROM violations
      WHERE employee_id = ANY($1)
        AND status = 'Active'
      ORDER BY created_at DESC
    `, [employeeIds]);

    // Group violations by employee_id
    const violationsByEmployee = violationsResult.rows.reduce((acc, violation) => {
      if (!acc[violation.employee_id]) {
        acc[violation.employee_id] = [];
      }
      acc[violation.employee_id].push({
        id: violation.id,
        type: violation.type,
        severity: violation.severity,
        status: violation.status,
        description: violation.description,
        createdAt: violation.created_at
      });
      return acc;
    }, {});

    res.json({
      employees: employeesResult.rows.map(row => {
        // Calculate compliance status based on available data
        const complianceStatus = row.compliance_profile_id 
          ? (row.risk_level === 'Critical' || row.risk_level === 'High' ? 'needs_review' : 'compliant')
          : 'non_compliant';
        
        // Calculate review status based on last compliance review
        let reviewStatus = 'never_reviewed';
        if (row.last_compliance_review) {
          const reviewDate = new Date(row.last_compliance_review);
          const daysSinceReview = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceReview <= 365) {
            reviewStatus = 'up_to_date';
          } else if (daysSinceReview <= 400) {
            reviewStatus = 'due_soon';
          } else {
            reviewStatus = 'overdue';
          }
        }
        
        // Calculate retention status
        let retentionStatus = 'compliant';
        if (row.data_retention_until) {
          const retentionDate = new Date(row.data_retention_until);
          const daysUntilRetention = Math.floor((retentionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilRetention < 0) {
            retentionStatus = 'overdue';
          } else if (daysUntilRetention <= 30) {
            retentionStatus = 'due_soon';
          }
        }

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          department: row.department,
          jobTitle: row.job_title,
          role: row.job_title, // Ensure role field exists
          riskScore: row.risk_score,
          riskLevel: row.risk_level,
          lastActivity: row.last_activity,
          photo: row.photo,
          violationCount: parseInt(row.violation_count),
          activeViolations: parseInt(row.active_violations),
          violations: violationsByEmployee[row.id] || [], // Actual violations data
          
          // Compliance-related fields
          complianceProfileId: row.compliance_profile_id,
          complianceProfile: row.compliance_profile,
          complianceStatus: complianceStatus,
          reviewStatus: reviewStatus,
          retentionStatus: retentionStatus,
          lastComplianceReview: row.last_compliance_review,
          
          // Use real metrics from database instead of random data
          metrics: row.email_volume !== null ? {
            emailVolume: row.email_volume || 0,
            externalContacts: row.external_contacts || 0,
            afterHoursActivity: row.after_hours_activity || 0,
            dataTransfer: parseFloat(row.data_transfer) || 0,
            securityEvents: row.security_events || 0,
            behaviorChange: row.behavior_change || 0
          } : null, // No metrics if no data available
          
          // Category detection summary (last 30 days)
          categoryDetections: {
            totalDetections: parseInt(row.total_detections) || 0,
            uniqueCategories: parseInt(row.unique_categories) || 0,
            maxRiskScore: parseInt(row.category_max_risk) || 0,
            criticalDetections: parseInt(row.critical_detections) || 0,
            hasDetections: (parseInt(row.total_detections) || 0) > 0
          }
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      error: 'Failed to fetch employees',
      code: 'EMPLOYEES_ERROR'
    });
  }
});

// Get single employee with detailed information
router.get('/:id', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);

    if (isNaN(employeeId)) {
      return res.status(400).json({
        error: 'Invalid employee ID',
        code: 'INVALID_ID'
      });
    }

    // Get employee details
    const employeeResult = await query(`
      SELECT 
        id, name, email, department, job_title, photo_url as photo,
        risk_score, risk_level, last_activity, is_active,
        created_at, updated_at
      FROM employees 
      WHERE id = $1
    `, [employeeId]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const employee = employeeResult.rows[0];

    // Get employee violations with email evidence
    const violationsResult = await query(`
      SELECT 
        id, type, severity, description, status, 
        evidence, metadata, source, created_at, resolved_at
      FROM violations 
      WHERE employee_id = $1
      ORDER BY created_at DESC
    `, [employeeId]);

    // Get employee metrics (last 30 days)
    const metricsResult = await query(`
      SELECT 
        date, email_volume, external_contacts, after_hours_activity,
        data_transfer, security_events, behavior_change
      FROM employee_metrics 
      WHERE employee_id = $1
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
    `, [employeeId]);

    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        jobTitle: employee.job_title,
        photo: employee.photo,
        riskScore: employee.risk_score,
        riskLevel: employee.risk_level,
        lastActivity: employee.last_activity,
        isActive: employee.is_active,
        createdAt: employee.created_at,
        updatedAt: employee.updated_at
      },
      violations: violationsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        description: row.description,
        status: row.status,
        evidence: row.evidence,
        metadata: row.metadata,
        source: row.source,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at
      })),
      metrics: metricsResult.rows.map(row => ({
        date: row.date,
        emailVolume: row.email_volume,
        externalContacts: row.external_contacts,
        afterHoursActivity: row.after_hours_activity,
        dataTransfer: parseFloat(row.data_transfer),
        securityEvents: row.security_events,
        behaviorChange: row.behavior_change
      }))
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      error: 'Failed to fetch employee details',
      code: 'EMPLOYEE_ERROR'
    });
  }
});

// =============================================================================
// GET EMPLOYEE CATEGORY DETECTION RESULTS
// =============================================================================
router.get('/:id/category-detections', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const { days = 30, limit = 50 } = req.query;

    if (isNaN(employeeId)) {
      return res.status(400).json({
        error: 'Invalid employee ID',
        code: 'INVALID_ID'
      });
    }

    // Get category detection results for this employee
    const detectionsResult = await query(`
      SELECT 
        cdr.id,
        cdr.email_id,
        cdr.risk_score,
        cdr.confidence_score,
        cdr.detection_context,
        cdr.matched_keywords,
        cdr.pattern_matches,
        cdr.analyzed_at,
        cdr.analyzer_version,
        tc.id as category_id,
        tc.name as category_name,
        tc.severity as category_severity,
        tc.description as category_description,
        ec.subject as email_subject,
        ec.sender_email,
        ec.sent_at as email_sent_at
      FROM category_detection_results cdr
      JOIN threat_categories tc ON cdr.category_id = tc.id
      LEFT JOIN email_communications ec ON cdr.email_id = ec.id
      WHERE cdr.employee_id = $1
        AND cdr.analyzed_at >= NOW() - INTERVAL '1 day' * $2
      ORDER BY cdr.analyzed_at DESC, cdr.risk_score DESC
      LIMIT $3
    `, [employeeId, days, limit]);

    // Get summary statistics
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_detections,
        COUNT(DISTINCT cdr.category_id) as unique_categories,
        COUNT(DISTINCT cdr.email_id) as unique_emails,
        AVG(cdr.risk_score)::numeric(5,2) as avg_risk_score,
        MAX(cdr.risk_score) as max_risk_score,
        COUNT(CASE WHEN cdr.risk_score >= 80 THEN 1 END) as critical_detections,
        COUNT(CASE WHEN cdr.risk_score >= 60 THEN 1 END) as high_risk_detections
      FROM category_detection_results cdr
      WHERE cdr.employee_id = $1
        AND cdr.analyzed_at >= NOW() - INTERVAL '1 day' * $2
    `, [employeeId, days]);

    // Get top categories by detection count
    const topCategoriesResult = await query(`
      SELECT 
        tc.id,
        tc.name,
        tc.severity,
        COUNT(cdr.id) as detection_count,
        AVG(cdr.risk_score)::numeric(5,2) as avg_risk_score,
        MAX(cdr.risk_score) as max_risk_score
      FROM category_detection_results cdr
      JOIN threat_categories tc ON cdr.category_id = tc.id
      WHERE cdr.employee_id = $1
        AND cdr.analyzed_at >= NOW() - INTERVAL '1 day' * $2
      GROUP BY tc.id, tc.name, tc.severity
      ORDER BY detection_count DESC, avg_risk_score DESC
      LIMIT 10
    `, [employeeId, days]);

    const summary = summaryResult.rows[0];

    res.json({
      employeeId,
      period: { days: parseInt(days) },
      summary: {
        totalDetections: parseInt(summary.total_detections) || 0,
        uniqueCategories: parseInt(summary.unique_categories) || 0,
        uniqueEmails: parseInt(summary.unique_emails) || 0,
        avgRiskScore: parseFloat(summary.avg_risk_score) || 0,
        maxRiskScore: parseInt(summary.max_risk_score) || 0,
        criticalDetections: parseInt(summary.critical_detections) || 0,
        highRiskDetections: parseInt(summary.high_risk_detections) || 0
      },
      topCategories: topCategoriesResult.rows.map(row => ({
        categoryId: row.id,
        categoryName: row.name,
        severity: row.severity,
        detectionCount: parseInt(row.detection_count),
        avgRiskScore: parseFloat(row.avg_risk_score) || 0,
        maxRiskScore: parseInt(row.max_risk_score) || 0
      })),
      detections: detectionsResult.rows.map(row => ({
        id: row.id,
        emailId: row.email_id,
        riskScore: row.risk_score,
        confidenceScore: parseFloat(row.confidence_score) || 0,
        detectionContext: row.detection_context,
        matchedKeywords: row.matched_keywords,
        patternMatches: row.pattern_matches,
        analyzedAt: row.analyzed_at,
        analyzerVersion: row.analyzer_version,
        category: {
          id: row.category_id,
          name: row.category_name,
          severity: row.category_severity,
          description: row.category_description
        },
        email: row.email_id ? {
          subject: row.email_subject,
          senderEmail: row.sender_email,
          sentAt: row.email_sent_at
        } : null
      }))
    });

  } catch (error) {
    console.error('Get employee category detections error:', error);
    res.status(500).json({
      error: 'Failed to fetch employee category detections',
      code: 'CATEGORY_DETECTIONS_ERROR'
    });
  }
});

// Update employee (analyst+ required)
router.put('/:id', requireAnalyst, async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const { name, email, department, jobTitle, riskScore, riskLevel } = req.body;

    if (isNaN(employeeId)) {
      return res.status(400).json({
        error: 'Invalid employee ID',
        code: 'INVALID_ID'
      });
    }

    // Input validation
    if (riskScore !== undefined && (riskScore < 0 || riskScore > 100)) {
      return res.status(400).json({
        error: 'Risk score must be between 0 and 100',
        code: 'INVALID_RISK_SCORE'
      });
    }

    if (riskLevel && !['Critical', 'High', 'Medium', 'Low'].includes(riskLevel)) {
      return res.status(400).json({
        error: 'Invalid risk level',
        code: 'INVALID_RISK_LEVEL'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
    }

    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email.toLowerCase().trim());
    }

    if (department) {
      paramCount++;
      updates.push(`department = $${paramCount}`);
      values.push(department.trim());
    }

    if (jobTitle) {
      paramCount++;
      updates.push(`job_title = $${paramCount}`);
      values.push(jobTitle.trim());
    }

    if (riskScore !== undefined) {
      paramCount++;
      updates.push(`risk_score = $${paramCount}`);
      values.push(riskScore);
    }

    if (riskLevel) {
      paramCount++;
      updates.push(`risk_level = $${paramCount}`);
      values.push(riskLevel);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_UPDATES'
      });
    }

    // Add updated_at
    paramCount++;
    updates.push(`updated_at = NOW()`);

    // Add employee ID for WHERE clause
    paramCount++;
    values.push(employeeId);

    const result = await query(`
      UPDATE employees 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, name, email, department, job_title, risk_score, risk_level, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    res.json({
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('Update employee error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Email address already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to update employee',
      code: 'UPDATE_ERROR'
    });
  }
});

// Get employee departments list
router.get('/meta/departments', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        department,
        COUNT(*) as employee_count,
        AVG(risk_score) as avg_risk_score
      FROM employees 
      WHERE is_active = true 
        AND department IS NOT NULL
      GROUP BY department
      ORDER BY department
    `);

    res.json({
      departments: result.rows.map(row => ({
        name: row.department,
        employeeCount: parseInt(row.employee_count),
        avgRiskScore: parseFloat(row.avg_risk_score).toFixed(1)
      }))
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      error: 'Failed to fetch departments',
      code: 'DEPARTMENTS_ERROR'
    });
  }
});

// Get employee risk levels distribution
router.get('/meta/risk-levels', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM employees 
      WHERE is_active = true
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END
    `);

    res.json({
      riskLevels: result.rows.map(row => ({
        level: row.risk_level,
        count: parseInt(row.count)
      }))
    });

  } catch (error) {
    console.error('Get risk levels error:', error);
    res.status(500).json({
      error: 'Failed to fetch risk levels',
      code: 'RISK_LEVELS_ERROR'
    });
  }
});

module.exports = router; 