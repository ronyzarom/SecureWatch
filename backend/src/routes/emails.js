const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const EmailRiskAnalyzer = require('../services/emailRiskAnalyzer');

// Initialize AI risk analyzer
const riskAnalyzer = new EmailRiskAnalyzer();

/**
 * @swagger
 * /api/emails:
 *   get:
 *     summary: Get email communications
 *     description: Retrieve email communications with filtering and pagination
 *     tags: [Emails]
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
 *         description: Number of emails per page
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [internal, external, suspicious, policy_violation]
 *         description: Filter by email category
 *       - in: query
 *         name: is_flagged
 *         schema:
 *           type: boolean
 *         description: Filter by flagged status
 *       - in: query
 *         name: integration_source
 *         schema:
 *           type: string
 *           enum: [office365, google_workspace]
 *         description: Filter by integration source
 *     responses:
 *       200:
 *         description: Email communications retrieved successfully
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (req.query.employee_id) {
      paramCount++;
      whereConditions.push(`ec.sender_employee_id = $${paramCount}`);
      queryParams.push(parseInt(req.query.employee_id));
    }

    if (req.query.category) {
      paramCount++;
      whereConditions.push(`ec.category = $${paramCount}`);
      queryParams.push(req.query.category);
    }

    if (req.query.is_flagged !== undefined) {
      paramCount++;
      whereConditions.push(`ec.is_flagged = $${paramCount}`);
      queryParams.push(req.query.is_flagged === 'true');
    }

    if (req.query.integration_source) {
      paramCount++;
      whereConditions.push(`ec.integration_source = $${paramCount}`);
      queryParams.push(req.query.integration_source);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM email_communications ec 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get emails with pagination
    queryParams.push(limit, offset);
    const emailsQuery = `
      SELECT 
        ec.*,
        e.name as sender_name,
        e.department as sender_department,
        v.id as violation_id,
        v.type as violation_type,
        v.severity as violation_severity
      FROM email_communications ec
      LEFT JOIN employees e ON ec.sender_employee_id = e.id
      LEFT JOIN violations v ON ec.violation_trigger_id = v.id
      ${whereClause}
      ORDER BY ec.sent_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await query(emailsQuery, queryParams);

    res.json({
      emails: result.rows.map(row => ({
        id: row.id,
        messageId: row.message_id,
        threadId: row.thread_id,
        integrationSource: row.integration_source,
        sender: {
          employeeId: row.sender_employee_id,
          email: row.sender_email,
          name: row.sender_name,
          department: row.sender_department
        },
        recipients: row.recipients,
        subject: row.subject,
        bodyText: row.body_text,
        attachments: row.attachments,
        sentAt: row.sent_at,
        riskScore: row.risk_score,
        riskFlags: row.risk_flags,
        category: row.category,
        isFlagged: row.is_flagged,
        isAnalyzed: row.is_analyzed,
        syncStatus: row.sync_status,
        createdAt: row.created_at,
        violation: row.violation_id ? {
          id: row.violation_id,
          type: row.violation_type,
          severity: row.violation_severity
        } : null
      })),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: result.rows.length,
        totalEmails: total
      }
    });

  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({
      error: 'Failed to fetch emails',
      code: 'EMAILS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/emails/analytics:
 *   get:
 *     summary: Get email analytics
 *     description: Retrieve email communication analytics and statistics
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Email analytics retrieved successfully
 */
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    // Get overall statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN is_flagged = true THEN 1 END) as flagged_emails,
        COUNT(CASE WHEN category = 'external' THEN 1 END) as external_emails,
        COUNT(CASE WHEN category = 'suspicious' THEN 1 END) as suspicious_emails,
        AVG(risk_score) as avg_risk_score,
        COUNT(CASE WHEN integration_source = 'office365' THEN 1 END) as office365_emails,
        COUNT(CASE WHEN integration_source = 'google_workspace' THEN 1 END) as google_workspace_emails
      FROM email_communications
    `);

    // Get top senders by risk
    const topRiskSendersResult = await query(`
      SELECT 
        e.name,
        e.email,
        COUNT(*) as email_count,
        AVG(ec.risk_score) as avg_risk_score,
        COUNT(CASE WHEN ec.is_flagged = true THEN 1 END) as flagged_count
      FROM email_communications ec
      JOIN employees e ON ec.sender_employee_id = e.id
      GROUP BY e.id, e.name, e.email
      ORDER BY avg_risk_score DESC
      LIMIT 10
    `);

    // Get email volume by day (last 7 days)
    const volumeResult = await query(`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN is_flagged = true THEN 1 END) as flagged_count
      FROM email_communications
      WHERE sent_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(sent_at)
      ORDER BY date DESC
    `);

    const stats = statsResult.rows[0];

    res.json({
      overview: {
        totalEmails: parseInt(stats.total_emails),
        flaggedEmails: parseInt(stats.flagged_emails),
        externalEmails: parseInt(stats.external_emails),
        suspiciousEmails: parseInt(stats.suspicious_emails),
        avgRiskScore: parseFloat(stats.avg_risk_score || 0).toFixed(1),
        office365Emails: parseInt(stats.office365_emails),
        googleWorkspaceEmails: parseInt(stats.google_workspace_emails)
      },
      topRiskSenders: topRiskSendersResult.rows.map(row => ({
        name: row.name,
        email: row.email,
        emailCount: parseInt(row.email_count),
        avgRiskScore: parseFloat(row.avg_risk_score).toFixed(1),
        flaggedCount: parseInt(row.flagged_count)
      })),
      volumeByDay: volumeResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count),
        flaggedCount: parseInt(row.flagged_count)
      }))
    });

  } catch (error) {
    console.error('Get email analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch email analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/emails/thread/{threadId}:
 *   get:
 *     summary: Get email thread
 *     description: Retrieve all emails in a conversation thread
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Thread ID
 *     responses:
 *       200:
 *         description: Email thread retrieved successfully
 */
router.get('/thread/:threadId', requireAuth, async (req, res) => {
  try {
    const threadId = req.params.threadId;

    const result = await query(`
      SELECT 
        ec.*,
        e.name as sender_name,
        e.department as sender_department,
        e.photo_url as sender_photo
      FROM email_communications ec
      LEFT JOIN employees e ON ec.sender_employee_id = e.id
      WHERE ec.thread_id = $1
      ORDER BY ec.sent_at ASC
    `, [threadId]);

    const emails = result.rows.map(email => ({
      id: email.id,
      messageId: email.message_id,
      sender: {
        employeeId: email.sender_employee_id,
        email: email.sender_email,
        name: email.sender_name,
        department: email.sender_department,
        photo: email.sender_photo
      },
      recipients: email.recipients,
      subject: email.subject,
      bodyText: email.body_text,
      sentAt: email.sent_at,
      riskScore: email.risk_score,
      category: email.category,
      isFlagged: email.is_flagged
    }));

    res.json({
      threadId,
      emails,
      count: emails.length
    });

  } catch (error) {
    console.error('Get email thread error:', error);
    res.status(500).json({
      error: 'Failed to fetch email thread',
      code: 'THREAD_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/emails/{id}:
 *   get:
 *     summary: Get email by ID
 *     description: Retrieve a specific email communication by ID
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email ID
 *     responses:
 *       200:
 *         description: Email retrieved successfully
 *       404:
 *         description: Email not found
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);

    const result = await query(`
      SELECT 
        ec.*,
        e.name as sender_name,
        e.department as sender_department,
        e.photo_url as sender_photo
      FROM email_communications ec
      LEFT JOIN employees e ON ec.sender_employee_id = e.id
      WHERE ec.id = $1
    `, [emailId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email not found',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    const email = result.rows[0];

    res.json({
      id: email.id,
      messageId: email.message_id,
      threadId: email.thread_id,
      integrationSource: email.integration_source,
      sender: {
        employeeId: email.sender_employee_id,
        email: email.sender_email,
        name: email.sender_name,
        department: email.sender_department,
        photo: email.sender_photo
      },
      recipients: email.recipients,
      subject: email.subject,
      bodyText: email.body_text,
      bodyHtml: email.body_html,
      attachments: email.attachments,
      sentAt: email.sent_at,
      receivedAt: email.received_at,
      riskScore: email.risk_score,
      riskFlags: email.risk_flags,
      category: email.category,
      isFlagged: email.is_flagged,
      isAnalyzed: email.is_analyzed,
      analyzedAt: email.analyzed_at,
      analyzerVersion: email.analyzer_version,
      syncStatus: email.sync_status,
      syncError: email.sync_error,
      createdAt: email.created_at,
      updatedAt: email.updated_at
    });

  } catch (error) {
    console.error('Get email by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch email',
      code: 'EMAIL_FETCH_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/emails/{id}/flag:
 *   post:
 *     summary: Flag/unflag email
 *     description: Toggle the flagged status of an email
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flagged:
 *                 type: boolean
 *                 description: Whether to flag or unflag the email
 *     responses:
 *       200:
 *         description: Email flag status updated
 */
router.post('/:id/flag', requireAuth, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);
    const { flagged } = req.body;

    if (typeof flagged !== 'boolean') {
      return res.status(400).json({
        error: 'Flagged status must be a boolean',
        code: 'INVALID_FLAG_STATUS'
      });
    }

    const result = await query(`
      UPDATE email_communications 
      SET is_flagged = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, is_flagged
    `, [flagged, emailId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email not found',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    res.json({
      message: `Email ${flagged ? 'flagged' : 'unflagged'} successfully`,
      email: {
        id: result.rows[0].id,
        isFlagged: result.rows[0].is_flagged
      }
    });

  } catch (error) {
    console.error('Flag email error:', error);
    res.status(500).json({
      error: 'Failed to update email flag status',
      code: 'FLAG_UPDATE_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/emails/analyze:
 *   post:
 *     summary: Run AI risk analysis on emails
 *     description: Analyze emails using AI to assess security risks and update risk scores
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of email IDs to analyze (optional - analyzes all if not provided)
 *               employeeId:
 *                 type: integer
 *                 description: Specific employee ID to analyze emails for (optional)
 *     responses:
 *       200:
 *         description: AI analysis completed successfully
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { emailIds, employeeId } = req.body;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build query conditions
    if (emailIds && emailIds.length > 0) {
      paramCount++;
      whereConditions.push(`ec.id = ANY($${paramCount})`);
      queryParams.push(emailIds);
    }

    if (employeeId) {
      paramCount++;
      whereConditions.push(`ec.sender_employee_id = $${paramCount}`);
      queryParams.push(employeeId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get emails to analyze
    const emailsResult = await query(`
      SELECT 
        ec.*,
        e.name as sender_name,
        e.department as sender_department
      FROM email_communications ec
      LEFT JOIN employees e ON ec.sender_employee_id = e.id
      ${whereClause}
      ORDER BY ec.sent_at DESC
      LIMIT 100
    `, queryParams);

    const emails = emailsResult.rows;
    const analysisResults = [];
    let updatedEmails = 0;

    console.log(`🤖 Starting AI analysis of ${emails.length} emails...`);

    for (const email of emails) {
      try {
        // Transform database row to expected email format
        const emailForAnalysis = {
          id: email.id,
          subject: email.subject || '',
          bodyText: email.body_text || '',
          recipients: email.recipients || [],
          attachments: email.attachments || [],
          sentAt: email.sent_at,
          sender: {
            employeeId: email.sender_employee_id,
            email: email.sender_email,
            name: email.sender_name,
            department: email.sender_department
          }
        };

        // Run AI analysis
        const analysis = await riskAnalyzer.analyzeEmail(emailForAnalysis);
        analysisResults.push(analysis);

        // Update email with AI analysis results
        const updateResult = await query(`
          UPDATE email_communications 
          SET 
            risk_score = $1,
            risk_flags = $2,
            is_analyzed = true,
            analyzed_at = NOW(),
            analyzer_version = $3,
            updated_at = NOW()
          WHERE id = $4
          RETURNING id
        `, [
          Math.round(analysis.riskScore),
          JSON.stringify({
            ...email.risk_flags,
            ai_analysis: {
              riskFactors: analysis.riskFactors,
              patterns: analysis.patterns,
              confidence: analysis.confidence,
              recommendations: analysis.recommendations
            }
          }),
          '1.0.0',
          email.id
        ]);

        if (updateResult.rows.length > 0) {
          updatedEmails++;
        }

        console.log(`📧 Analyzed email ${email.id}: Risk ${analysis.riskScore} (${analysis.riskLevel})`);

      } catch (emailError) {
        console.error(`❌ Error analyzing email ${email.id}:`, emailError.message);
        analysisResults.push({
          emailId: email.id,
          error: emailError.message,
          riskScore: 50,
          riskLevel: 'Medium'
        });
      }
    }

    // Update employee risk scores based on their email analysis
    if (employeeId) {
      await updateEmployeeRiskScore(employeeId);
    } else {
      // Update all employees mentioned in the analyzed emails
      const employeeIds = [...new Set(emails.map(e => e.sender_employee_id).filter(Boolean))];
      for (const empId of employeeIds) {
        await updateEmployeeRiskScore(empId);
      }
    }

    console.log(`✅ AI analysis completed: ${updatedEmails} emails updated`);

    res.json({
      message: 'AI analysis completed successfully',
      summary: {
        totalEmails: emails.length,
        updatedEmails,
        avgRiskScore: analysisResults.reduce((sum, a) => sum + (a.riskScore || 50), 0) / analysisResults.length,
        highRiskEmails: analysisResults.filter(a => (a.riskScore || 50) >= 70).length,
        patternsDetected: [...new Set(analysisResults.flatMap(a => a.patterns || []))],
      },
      analysisResults: analysisResults.slice(0, 10) // Return first 10 for preview
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      error: 'Failed to run AI analysis',
      code: 'AI_ANALYSIS_ERROR',
      details: error.message
    });
  }
});

/**
 * Helper function to update employee risk score based on their emails
 */
async function updateEmployeeRiskScore(employeeId) {
  try {
    // Get employee's email risk scores from last 30 days
    const emailRisksResult = await query(`
      SELECT risk_score, sent_at
      FROM email_communications 
      WHERE sender_employee_id = $1 
        AND sent_at >= NOW() - INTERVAL '30 days'
        AND is_analyzed = true
      ORDER BY sent_at DESC
    `, [employeeId]);

    if (emailRisksResult.rows.length === 0) {
      return; // No emails to base risk on
    }

    const emailRisks = emailRisksResult.rows;
    
    // Calculate weighted risk score (recent emails have more weight)
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    emailRisks.forEach((email, index) => {
      const age = index + 1; // 1 = most recent
      const weight = Math.max(1, 30 - age); // More recent = higher weight
      totalWeightedScore += email.risk_score * weight;
      totalWeight += weight;
    });

    const avgEmailRisk = totalWeightedScore / totalWeight;
    
    // Calculate final employee risk score (email risk + violation risk + behavioral factors)
    const violationsResult = await query(`
      SELECT AVG(
        CASE 
          WHEN severity = 'Critical' THEN 90
          WHEN severity = 'High' THEN 70
          WHEN severity = 'Medium' THEN 50
          ELSE 30
        END
      ) as avg_violation_risk
      FROM violations 
      WHERE employee_id = $1 AND status = 'Active'
    `, [employeeId]);

    const avgViolationRisk = violationsResult.rows[0]?.avg_violation_risk || 0;
    
    // Weighted combination: 60% email risk + 40% violation risk
    const finalRiskScore = Math.round((avgEmailRisk * 0.6) + (avgViolationRisk * 0.4));
    const riskLevel = finalRiskScore >= 80 ? 'Critical' : 
                     finalRiskScore >= 60 ? 'High' : 
                     finalRiskScore >= 40 ? 'Medium' : 'Low';

    // Update employee risk score
    await query(`
      UPDATE employees 
      SET 
        risk_score = $1,
        risk_level = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [finalRiskScore, riskLevel, employeeId]);

    console.log(`👤 Updated employee ${employeeId} risk: ${finalRiskScore} (${riskLevel})`);

  } catch (error) {
    console.error(`Error updating employee ${employeeId} risk score:`, error);
  }
}

/**
 * @swagger
 * /api/emails/{id}/analysis:
 *   get:
 *     summary: Get AI analysis details for a specific email
 *     description: Retrieve detailed AI risk analysis for a specific email
 *     tags: [Emails]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Email ID
 *     responses:
 *       200:
 *         description: AI analysis details retrieved successfully
 */
router.get('/:id/analysis', requireAuth, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);

    const result = await query(`
      SELECT 
        ec.*,
        e.name as sender_name,
        e.department as sender_department
      FROM email_communications ec
      LEFT JOIN employees e ON ec.sender_employee_id = e.id
      WHERE ec.id = $1
    `, [emailId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Email not found',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    const email = result.rows[0];
    
    // If not analyzed yet, run analysis now
    if (!email.is_analyzed) {
      const emailForAnalysis = {
        id: email.id,
        subject: email.subject || '',
        bodyText: email.body_text || '',
        recipients: email.recipients || [],
        attachments: email.attachments || [],
        sentAt: email.sent_at,
        sender: {
          employeeId: email.sender_employee_id,
          email: email.sender_email,
          name: email.sender_name,
          department: email.sender_department
        }
      };

      const analysis = await riskAnalyzer.analyzeEmail(emailForAnalysis);
      
      // Update database with fresh analysis
      await query(`
        UPDATE email_communications 
        SET 
          risk_score = $1,
          risk_flags = $2,
          is_analyzed = true,
          analyzed_at = NOW(),
          analyzer_version = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        Math.round(analysis.riskScore),
        JSON.stringify({
          ...email.risk_flags,
          ai_analysis: analysis
        }),
        '1.0.0',
        email.id
      ]);

      res.json({
        emailId: email.id,
        analysis,
        freshAnalysis: true
      });
    } else {
      // Return existing analysis
      const aiAnalysis = email.risk_flags?.ai_analysis || {};
      res.json({
        emailId: email.id,
        analysis: {
          riskScore: email.risk_score,
          riskLevel: email.risk_score >= 80 ? 'Critical' : 
                    email.risk_score >= 60 ? 'High' : 
                    email.risk_score >= 40 ? 'Medium' : 'Low',
          analyzedAt: email.analyzed_at,
          analyzerVersion: email.analyzer_version,
          ...aiAnalysis
        },
        freshAnalysis: false
      });
    }

  } catch (error) {
    console.error('Get email analysis error:', error);
    res.status(500).json({
      error: 'Failed to get email analysis',
      code: 'ANALYSIS_FETCH_ERROR'
    });
  }
});

module.exports = router; 