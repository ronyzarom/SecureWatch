const express = require('express');
const { query } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Retrieve comprehensive dashboard metrics including employee counts, risk distribution, violations, and trends
 *     tags: [Dashboard]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardMetrics'
 *             example:
 *               summary:
 *                 totalEmployees: 6
 *                 criticalRisk: 1
 *                 highRisk: 3
 *                 mediumRisk: 1
 *                 lowRisk: 1
 *                 totalViolations: 3
 *                 activeViolations: 2
 *                 criticalViolations: 1
 *                 recentActivity: 5
 *               riskDistribution:
 *                 Critical: 1
 *                 High: 3
 *                 Medium: 1
 *                 Low: 1
 *               departmentBreakdown:
 *                 - department: Finance
 *                   count: 1
 *                   avgRiskScore: "92.0"
 *                 - department: Engineering
 *                   count: 1
 *                   avgRiskScore: "78.0"
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
// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    // Get employee counts by risk level
    const riskLevelCounts = await query(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM employees 
      WHERE is_active = true
      GROUP BY risk_level
    `);

    // Get total violations count
    const violationsResult = await query(`
      SELECT 
        COUNT(*) as total_violations,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_violations,
        COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_violations
      FROM violations
    `);

    // Get recent activity count (last 24 hours)
    const recentActivityResult = await query(`
      SELECT COUNT(*) as recent_activity
      FROM employees 
      WHERE last_activity > NOW() - INTERVAL '24 hours'
        AND is_active = true
    `);

    // Get department distribution
    const departmentCounts = await query(`
      SELECT 
        department,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score
      FROM employees 
      WHERE is_active = true
        AND department IS NOT NULL
      GROUP BY department
      ORDER BY avg_risk_score DESC
    `);

    // Get trend data (last 7 days)
    const trendData = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as violations_count,
        AVG(CASE 
          WHEN severity = 'Critical' THEN 4
          WHEN severity = 'High' THEN 3  
          WHEN severity = 'Medium' THEN 2
          WHEN severity = 'Low' THEN 1
          ELSE 0
        END) as avg_severity
      FROM violations
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Format risk level counts
    const riskLevelMap = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    riskLevelCounts.rows.forEach(row => {
      riskLevelMap[row.risk_level] = parseInt(row.count);
    });

    // Calculate total employees
    const totalEmployees = Object.values(riskLevelMap).reduce((sum, count) => sum + count, 0);

    res.json({
      summary: {
        totalEmployees,
        criticalRisk: riskLevelMap.Critical,
        highRisk: riskLevelMap.High,
        mediumRisk: riskLevelMap.Medium,
        lowRisk: riskLevelMap.Low,
        totalViolations: parseInt(violationsResult.rows[0].total_violations),
        activeViolations: parseInt(violationsResult.rows[0].active_violations),
        criticalViolations: parseInt(violationsResult.rows[0].critical_violations),
        recentActivity: parseInt(recentActivityResult.rows[0].recent_activity)
      },
      riskDistribution: riskLevelMap,
      departmentBreakdown: departmentCounts.rows.map(row => ({
        department: row.department,
        count: parseInt(row.count),
        avgRiskScore: parseFloat(row.avg_risk_score).toFixed(1)
      })),
      trend: trendData.rows.map(row => ({
        date: row.date,
        violations: parseInt(row.violations_count),
        avgSeverity: parseFloat(row.avg_severity).toFixed(2)
      }))
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      code: 'METRICS_ERROR'
    });
  }
});

// Get recent violations
router.get('/recent-violations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await query(`
      SELECT 
        v.id,
        v.type,
        v.severity,
        v.description,
        v.status,
        v.created_at,
        e.name as employee_name,
        e.email as employee_email,
        e.department as employee_department
      FROM violations v
      JOIN employees e ON v.employee_id = e.id
      ORDER BY v.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      violations: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        employee: {
          name: row.employee_name,
          email: row.employee_email,
          department: row.employee_department
        }
      }))
    });

  } catch (error) {
    console.error('Recent violations error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent violations',
      code: 'VIOLATIONS_ERROR'
    });
  }
});

// Get high-risk employees
router.get('/high-risk-employees', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await query(`
      SELECT 
        e.id,
        e.name,
        e.email,
        e.department,
        e.job_title,
        e.risk_score,
        e.risk_level,
        e.last_activity,
        COUNT(v.id) as violation_count,
        COUNT(CASE WHEN v.status = 'Active' THEN 1 END) as active_violations
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id
      WHERE e.is_active = true
        AND e.risk_level IN ('Critical', 'High')
      GROUP BY e.id, e.name, e.email, e.department, e.job_title, e.risk_score, e.risk_level, e.last_activity
      ORDER BY e.risk_score DESC, violation_count DESC
      LIMIT $1
    `, [limit]);

    res.json({
      employees: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        department: row.department,
        jobTitle: row.job_title,
        riskScore: row.risk_score,
        riskLevel: row.risk_level,
        lastActivity: row.last_activity,
        violationCount: parseInt(row.violation_count),
        activeViolations: parseInt(row.active_violations)
      }))
    });

  } catch (error) {
    console.error('High-risk employees error:', error);
    res.status(500).json({
      error: 'Failed to fetch high-risk employees',
      code: 'EMPLOYEES_ERROR'
    });
  }
});

// Get system alerts
router.get('/alerts', async (req, res) => {
  try {
    // Get critical violations that need attention
    const criticalViolations = await query(`
      SELECT 
        COUNT(*) as count
      FROM violations 
      WHERE severity = 'Critical' 
        AND status = 'Active'
    `);

    // Get employees with recent risk score increases
    const riskIncreases = await query(`
      SELECT 
        COUNT(*) as count
      FROM employees 
      WHERE risk_score > 80
        AND last_activity > NOW() - INTERVAL '24 hours'
    `);

    // Get stale investigations
    const staleInvestigations = await query(`
      SELECT 
        COUNT(*) as count
      FROM violations 
      WHERE status = 'Investigating'
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    res.json({
      alerts: [
        {
          id: 'critical_violations',
          type: 'critical',
          title: 'Critical Violations',
          message: `${criticalViolations.rows[0].count} critical violations require immediate attention`,
          count: parseInt(criticalViolations.rows[0].count),
          priority: 'high'
        },
        {
          id: 'risk_increases',
          type: 'warning',
          title: 'Risk Score Increases',
          message: `${riskIncreases.rows[0].count} employees have elevated risk scores`,
          count: parseInt(riskIncreases.rows[0].count),
          priority: 'medium'
        },
        {
          id: 'stale_investigations',
          type: 'info',
          title: 'Stale Investigations',
          message: `${staleInvestigations.rows[0].count} investigations are over 7 days old`,
          count: parseInt(staleInvestigations.rows[0].count),
          priority: 'low'
        }
      ].filter(alert => alert.count > 0)
    });

  } catch (error) {
    console.error('System alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch system alerts',
      code: 'ALERTS_ERROR'
    });
  }
});

// Get activity timeline
router.get('/activity', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    
    const result = await query(`
      SELECT 
        'violation' as type,
        v.id,
        v.type as event_type,
        v.severity,
        v.created_at as timestamp,
        e.name as employee_name,
        e.department as employee_department,
        v.description
      FROM violations v
      JOIN employees e ON v.employee_id = e.id
      WHERE v.created_at > NOW() - INTERVAL '${hours} hours'
      
      UNION ALL
      
      SELECT 
        'employee_update' as type,
        e.id,
        'Risk Level Change' as event_type,
        e.risk_level as severity,
        e.updated_at as timestamp,
        e.name as employee_name,
        e.department as employee_department,
        CONCAT('Risk level updated to ', e.risk_level) as description
      FROM employees e
      WHERE e.updated_at > NOW() - INTERVAL '${hours} hours'
        AND e.updated_at != e.created_at
      
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    res.json({
      activity: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        eventType: row.event_type,
        severity: row.severity,
        timestamp: row.timestamp,
        employee: {
          name: row.employee_name,
          department: row.employee_department
        },
        description: row.description
      }))
    });

  } catch (error) {
    console.error('Activity timeline error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity timeline',
      code: 'ACTIVITY_ERROR'
    });
  }
});

module.exports = router; 