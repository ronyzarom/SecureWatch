const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

// All activity reports routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Activity Reports
 *   description: Employee activity reporting and analytics API
 */

/**
 * @swagger
 * /api/activity-reports/overview:
 *   get:
 *     summary: Get activity overview statistics
 *     tags: [Activity Reports]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by specific department
 *     responses:
 *       200:
 *         description: Activity overview statistics
 *       401:
 *         description: Authentication required
 */
router.get('/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const department = req.query.department;
    
    let queryParams = [days];
    let departmentCondition = '';
    
    if (department) {
      departmentCondition = ' AND e.department = $2';
      queryParams.push(department);
    }

    // Get overall activity statistics
    const overviewQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT CASE WHEN e.risk_level IN ('High', 'Critical') THEN e.id END) as high_risk_employees,
        COUNT(v.id) as total_violations,
        COUNT(CASE WHEN v.severity = 'Critical' THEN 1 END) as critical_violations,
        COUNT(ec.id) as total_emails,
        COUNT(CASE WHEN ec.is_flagged = true THEN 1 END) as flagged_emails,
        ROUND(AVG(e.risk_score), 2) as avg_risk_score,
        ROUND(AVG(em.email_volume), 2) as avg_email_volume,
        ROUND(AVG(em.external_contacts), 2) as avg_external_contacts,
        ROUND(AVG(em.after_hours_activity), 2) as avg_after_hours_activity,
        ROUND(AVG(em.data_transfer), 2) as avg_data_transfer
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id 
        AND v.created_at > NOW() - INTERVAL '1 day' * $1
      LEFT JOIN email_communications ec ON e.id = ec.sender_employee_id 
        AND ec.sent_at > NOW() - INTERVAL '1 day' * $1
      LEFT JOIN employee_metrics em ON e.id = em.employee_id 
        AND em.date > NOW() - INTERVAL '1 day' * $1
      WHERE e.is_active = true${departmentCondition}
    `;

    const overviewResult = await query(overviewQuery, queryParams);
    
    // Get department breakdown
    const departmentQuery = `
      SELECT 
        e.department,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(v.id) as violation_count,
        ROUND(AVG(e.risk_score), 2) as avg_risk_score,
        COUNT(CASE WHEN e.risk_level IN ('High', 'Critical') THEN 1 END) as high_risk_count
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id 
        AND v.created_at > NOW() - INTERVAL '1 day' * $1
      WHERE e.is_active = true${departmentCondition}
      GROUP BY e.department
      ORDER BY violation_count DESC, avg_risk_score DESC
    `;

    const departmentResult = await query(departmentQuery, queryParams);

    // Get trending violations
    const trendingQuery = `
      SELECT 
        v.type,
        COUNT(*) as count,
        v.severity,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - v.created_at))/3600), 2) as avg_hours_ago
      FROM violations v
      JOIN employees e ON v.employee_id = e.id
      WHERE v.created_at > NOW() - INTERVAL '1 day' * $1${departmentCondition}
      GROUP BY v.type, v.severity
      ORDER BY count DESC
      LIMIT 10
    `;

    const trendingResult = await query(trendingQuery, queryParams);

    // Convert string numbers to actual numbers for frontend compatibility
    const convertedOverview = overviewResult.rows[0] ? {
      total_employees: parseInt(overviewResult.rows[0].total_employees) || 0,
      high_risk_employees: parseInt(overviewResult.rows[0].high_risk_employees) || 0,
      total_violations: parseInt(overviewResult.rows[0].total_violations) || 0,
      critical_violations: parseInt(overviewResult.rows[0].critical_violations) || 0,
      total_emails: parseInt(overviewResult.rows[0].total_emails) || 0,
      flagged_emails: parseInt(overviewResult.rows[0].flagged_emails) || 0,
      avg_risk_score: parseFloat(overviewResult.rows[0].avg_risk_score) || 0,
      avg_email_volume: parseFloat(overviewResult.rows[0].avg_email_volume) || 0,
      avg_external_contacts: parseFloat(overviewResult.rows[0].avg_external_contacts) || 0,
      avg_after_hours_activity: parseFloat(overviewResult.rows[0].avg_after_hours_activity) || 0,
      avg_data_transfer: parseFloat(overviewResult.rows[0].avg_data_transfer) || 0
    } : {};

    // Convert department data
    const convertedDepartments = departmentResult.rows.map(dept => ({
      department: dept.department,
      employee_count: parseInt(dept.employee_count) || 0,
      violation_count: parseInt(dept.violation_count) || 0,
      avg_risk_score: parseFloat(dept.avg_risk_score) || 0,
      high_risk_count: parseInt(dept.high_risk_count) || 0
    }));

    // Convert trending violations data
    const convertedTrending = trendingResult.rows.map(violation => ({
      type: violation.type,
      count: parseInt(violation.count) || 0,
      severity: violation.severity,
      avg_hours_ago: parseFloat(violation.avg_hours_ago) || 0
    }));

    res.json({
      overview: convertedOverview,
      departments: convertedDepartments,
      trendingViolations: convertedTrending,
      period: {
        days: days,
        department: department || 'All Departments'
      }
    });

  } catch (error) {
    console.error('Activity overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity overview',
      code: 'ACTIVITY_OVERVIEW_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/activity-reports/employee/{id}:
 *   get:
 *     summary: Get detailed activity report for specific employee
 *     tags: [Activity Reports]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Detailed employee activity report
 *       401:
 *         description: Authentication required
 */
router.get('/employee/:id', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const days = parseInt(req.query.days) || 30;

    // Get employee basic info
    const employeeQuery = `
      SELECT 
        e.*,
        COUNT(v.id) as total_violations,
        COUNT(CASE WHEN v.status = 'Active' THEN 1 END) as active_violations,
        COUNT(ec.id) as total_emails,
        COUNT(CASE WHEN ec.is_flagged = true THEN 1 END) as flagged_emails
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id 
        AND v.created_at > NOW() - INTERVAL '1 day' * $2
      LEFT JOIN email_communications ec ON e.id = ec.sender_employee_id 
        AND ec.sent_at > NOW() - INTERVAL '1 day' * $2
      WHERE e.id = $1
      GROUP BY e.id
    `;

    const employeeResult = await query(employeeQuery, [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Get daily metrics trend
    const metricsQuery = `
      SELECT 
        date,
        email_volume,
        external_contacts,
        after_hours_activity,
        data_transfer,
        security_events,
        behavior_change
      FROM employee_metrics
      WHERE employee_id = $1 
        AND date > NOW() - INTERVAL '1 day' * $2
      ORDER BY date DESC
    `;

    const metricsResult = await query(metricsQuery, [employeeId]);

    // Get violations history
    const violationsQuery = `
      SELECT 
        id,
        type,
        severity,
        status,
        description,
        evidence,
        created_at,
        resolved_at,
        metadata
      FROM violations
      WHERE employee_id = $1 
        AND created_at > NOW() - INTERVAL '1 day' * $2
      ORDER BY created_at DESC
    `;

    const violationsResult = await query(violationsQuery, [employeeId]);

    // Get email activity breakdown
    const emailQuery = `
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as email_count,
        COUNT(CASE WHEN is_flagged = true THEN 1 END) as flagged_count,
        ROUND(AVG(risk_score), 2) as avg_risk_score,
        COUNT(CASE WHEN category = 'external' THEN 1 END) as external_count
      FROM email_communications
      WHERE sender_employee_id = $1 
        AND sent_at > NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(sent_at)
      ORDER BY date DESC
    `;

    const emailResult = await query(emailQuery, [employeeId]);

    // Get activity timeline
    const timelineQuery = `
      SELECT 
        'violation' as type,
        v.id,
        v.type as event_type,
        v.severity,
        v.created_at as timestamp,
        v.description,
        NULL as risk_score
      FROM violations v
      WHERE v.employee_id = $1 
        AND v.created_at > NOW() - INTERVAL '1 day' * $2
      
      UNION ALL
      
      SELECT 
        'email_flagged' as type,
        ec.id,
        'Flagged Email' as event_type,
        CASE 
          WHEN ec.risk_score >= 80 THEN 'Critical'
          WHEN ec.risk_score >= 60 THEN 'High'
          WHEN ec.risk_score >= 40 THEN 'Medium'
          ELSE 'Low'
        END as severity,
        ec.sent_at as timestamp,
        ec.subject as description,
        ec.risk_score
      FROM email_communications ec
      WHERE ec.sender_employee_id = $1 
        AND ec.is_flagged = true
        AND ec.sent_at > NOW() - INTERVAL '1 day' * $2
      
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    const timelineResult = await query(timelineQuery, [employeeId]);

    res.json({
      employee: {
        ...employeeResult.rows[0],
        totalViolations: employeeResult.rows[0].total_violations,
        activeViolations: employeeResult.rows[0].active_violations,
        totalEmails: employeeResult.rows[0].total_emails,
        flaggedEmails: employeeResult.rows[0].flagged_emails
      },
      metrics: metricsResult.rows,
      violations: violationsResult.rows,
      emailActivity: emailResult.rows,
      timeline: timelineResult.rows,
      period: {
        days: days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Employee activity report error:', error);
    res.status(500).json({
      error: 'Failed to fetch employee activity report',
      code: 'EMPLOYEE_ACTIVITY_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/activity-reports/trends:
 *   get:
 *     summary: Get activity trends and patterns
 *     tags: [Activity Reports]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Time grouping for trends
 *     responses:
 *       200:
 *         description: Activity trends and patterns
 *       401:
 *         description: Authentication required
 */
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const groupBy = req.query.groupBy || 'day';
    
    let dateFormat;
    let groupInterval;
    
    switch (groupBy) {
      case 'week':
        dateFormat = "TO_CHAR(DATE_TRUNC('week', %s), 'YYYY-MM-DD')";
        groupInterval = "DATE_TRUNC('week', %s)";
        break;
      case 'month':
        dateFormat = "TO_CHAR(DATE_TRUNC('month', %s), 'YYYY-MM')";
        groupInterval = "DATE_TRUNC('month', %s)";
        break;
      default: // day
        dateFormat = "TO_CHAR(%s, 'YYYY-MM-DD')";
        groupInterval = "DATE_TRUNC('day', %s)";
    }

    // Get violation trends
    const violationTrendsQuery = `
      WITH grouped_violations AS (
        SELECT 
          ${groupInterval.replace('%s', 'v.created_at')} as group_period,
          v.severity
        FROM violations v
        WHERE v.created_at > NOW() - INTERVAL '1 day' * $1
      )
      SELECT 
        ${dateFormat.replace('%s', 'group_period')} as period,
        COUNT(*) as violation_count,
        COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'High' THEN 1 END) as high_count,
        COUNT(CASE WHEN severity = 'Medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN severity = 'Low' THEN 1 END) as low_count
      FROM grouped_violations
      GROUP BY group_period
      ORDER BY group_period DESC
    `;

    const violationTrends = await query(violationTrendsQuery, [days]);

    // Get email activity trends
    const emailTrendsQuery = `
      WITH grouped_emails AS (
        SELECT 
          ${groupInterval.replace('%s', 'ec.sent_at')} as group_period,
          ec.is_flagged,
          ec.risk_score,
          ec.category
        FROM email_communications ec
        WHERE ec.sent_at > NOW() - INTERVAL '1 day' * $1
      )
      SELECT 
        ${dateFormat.replace('%s', 'group_period')} as period,
        COUNT(*) as email_count,
        COUNT(CASE WHEN is_flagged = true THEN 1 END) as flagged_count,
        ROUND(AVG(risk_score), 2) as avg_risk_score,
        COUNT(CASE WHEN category = 'external' THEN 1 END) as external_count
      FROM grouped_emails
      GROUP BY group_period
      ORDER BY group_period DESC
    `;

    const emailTrends = await query(emailTrendsQuery, [days]);

    // Get employee metrics trends  
    const metricsTrendsQuery = `
      WITH grouped_metrics AS (
        SELECT 
          ${groupInterval.replace('%s', 'em.date')} as group_period,
          em.email_volume,
          em.external_contacts,
          em.after_hours_activity,
          em.data_transfer,
          em.security_events,
          em.behavior_change
        FROM employee_metrics em
        WHERE em.date > NOW() - INTERVAL '1 day' * $1
      )
      SELECT 
        ${dateFormat.replace('%s', 'group_period')} as period,
        ROUND(AVG(email_volume), 2) as avg_email_volume,
        ROUND(AVG(external_contacts), 2) as avg_external_contacts,
        ROUND(AVG(after_hours_activity), 2) as avg_after_hours_activity,
        ROUND(AVG(data_transfer), 2) as avg_data_transfer,
        ROUND(AVG(security_events), 2) as avg_security_events,
        ROUND(AVG(behavior_change), 2) as avg_behavior_change
      FROM grouped_metrics
      GROUP BY group_period
      ORDER BY group_period DESC
    `;

    const metricsTrends = await query(metricsTrendsQuery, [days]);

    // Get top risk patterns
    const riskPatternsQuery = `
      SELECT 
        e.department,
        e.risk_level,
        COUNT(*) as employee_count,
        ROUND(AVG(e.risk_score), 2) as avg_risk_score,
        COUNT(v.id) as violation_count
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id 
        AND v.created_at > NOW() - INTERVAL '1 day' * $1
      WHERE e.is_active = true
      GROUP BY e.department, e.risk_level
      ORDER BY avg_risk_score DESC, violation_count DESC
    `;

    const riskPatterns = await query(riskPatternsQuery, [days]);

    // Convert data types for frontend compatibility
    const convertedViolationTrends = violationTrends.rows.map(trend => ({
      period: trend.period,
      violation_count: parseInt(trend.violation_count) || 0,
      critical_count: parseInt(trend.critical_count) || 0,
      high_count: parseInt(trend.high_count) || 0,
      medium_count: parseInt(trend.medium_count) || 0,
      low_count: parseInt(trend.low_count) || 0
    }));

    const convertedEmailTrends = emailTrends.rows.map(trend => ({
      period: trend.period,
      email_count: parseInt(trend.email_count) || 0,
      flagged_count: parseInt(trend.flagged_count) || 0,
      avg_risk_score: parseFloat(trend.avg_risk_score) || 0,
      external_count: parseInt(trend.external_count) || 0
    }));

    const convertedMetricsTrends = metricsTrends.rows.map(trend => ({
      period: trend.period,
      avg_email_volume: parseFloat(trend.avg_email_volume) || 0,
      avg_external_contacts: parseFloat(trend.avg_external_contacts) || 0,
      avg_after_hours_activity: parseFloat(trend.avg_after_hours_activity) || 0,
      avg_data_transfer: parseFloat(trend.avg_data_transfer) || 0,
      avg_security_events: parseFloat(trend.avg_security_events) || 0,
      avg_behavior_change: parseFloat(trend.avg_behavior_change) || 0
    }));

    const convertedRiskPatterns = riskPatterns.rows.map(pattern => ({
      department: pattern.department,
      risk_level: pattern.risk_level,
      employee_count: parseInt(pattern.employee_count) || 0,
      avg_risk_score: parseFloat(pattern.avg_risk_score) || 0,
      violation_count: parseInt(pattern.violation_count) || 0
    }));

    res.json({
      violationTrends: convertedViolationTrends,
      emailTrends: convertedEmailTrends,
      metricsTrends: convertedMetricsTrends,
      riskPatterns: convertedRiskPatterns,
      period: {
        days: days,
        groupBy: groupBy
      }
    });

  } catch (error) {
    console.error('Activity trends error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity trends',
      code: 'ACTIVITY_TRENDS_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/activity-reports/anomalies:
 *   get:
 *     summary: Detect activity anomalies and unusual patterns
 *     tags: [Activity Reports]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to analyze for anomalies
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 2.0
 *         description: Standard deviation threshold for anomaly detection
 *     responses:
 *       200:
 *         description: Detected activity anomalies
 *       401:
 *         description: Authentication required
 */
router.get('/anomalies', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const threshold = parseFloat(req.query.threshold) || 2.0;

    // Detect email volume anomalies
    const emailAnomaliesQuery = `
      WITH email_stats AS (
        SELECT 
          e.id,
          e.name,
          e.department,
          COUNT(ec.id) as current_emails,
          AVG(em.email_volume) as avg_email_volume,
          STDDEV(em.email_volume) as stddev_email_volume
        FROM employees e
        LEFT JOIN email_communications ec ON e.id = ec.sender_employee_id 
          AND ec.sent_at > NOW() - INTERVAL '30 days'
        LEFT JOIN employee_metrics em ON e.id = em.employee_id 
          AND em.date > NOW() - INTERVAL '30 days'
        WHERE e.is_active = true
        GROUP BY e.id, e.name, e.department
        HAVING STDDEV(em.email_volume) > 0
      )
      SELECT 
        id,
        name,
        department,
        current_emails,
        ROUND(avg_email_volume, 2) as avg_email_volume,
        ROUND((current_emails - avg_email_volume) / NULLIF(stddev_email_volume, 0), 2) as z_score,
        'email_volume' as anomaly_type
      FROM email_stats
      WHERE ABS((current_emails - avg_email_volume) / NULLIF(stddev_email_volume, 0)) > $1::FLOAT
      ORDER BY ABS((current_emails - avg_email_volume) / NULLIF(stddev_email_volume, 0)) DESC
    `;

    const emailAnomalies = await query(emailAnomaliesQuery, [threshold]);

    // Detect after-hours activity anomalies
    const afterHoursAnomaliesQuery = `
      WITH after_hours_stats AS (
        SELECT 
          e.id,
          e.name,
          e.department,
          AVG(CASE WHEN em.date > NOW() - INTERVAL '1 day' * $2 THEN em.after_hours_activity END) as recent_after_hours,
          AVG(em.after_hours_activity) as avg_after_hours,
          STDDEV(em.after_hours_activity) as stddev_after_hours
        FROM employees e
        LEFT JOIN employee_metrics em ON e.id = em.employee_id 
          AND em.date > NOW() - INTERVAL '30 days'
        WHERE e.is_active = true
        GROUP BY e.id, e.name, e.department
        HAVING STDDEV(em.after_hours_activity) > 0
      )
      SELECT 
        id,
        name,
        department,
        ROUND(recent_after_hours, 2) as recent_value,
        ROUND(avg_after_hours, 2) as avg_value,
        ROUND((recent_after_hours - avg_after_hours) / NULLIF(stddev_after_hours, 0), 2) as z_score,
        'after_hours_activity' as anomaly_type
      FROM after_hours_stats
      WHERE ABS((recent_after_hours - avg_after_hours) / NULLIF(stddev_after_hours, 0)) > $1::FLOAT
        AND recent_after_hours IS NOT NULL
      ORDER BY ABS((recent_after_hours - avg_after_hours) / NULLIF(stddev_after_hours, 0)) DESC
    `;

    const afterHoursAnomalies = await query(afterHoursAnomaliesQuery, [threshold, days]);

    // Detect risk score spikes
    const riskAnomaliesQuery = `
      SELECT 
        e.id,
        e.name,
        e.department,
        e.risk_score as current_risk,
        COUNT(v.id) as recent_violations,
        'risk_spike' as anomaly_type
      FROM employees e
      LEFT JOIN violations v ON e.id = v.employee_id 
        AND v.created_at > NOW() - INTERVAL '1 day' * $1
      WHERE e.is_active = true
        AND e.risk_score > 75
        AND e.updated_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY e.id, e.name, e.department, e.risk_score
      ORDER BY e.risk_score DESC, recent_violations DESC
    `;

    const riskAnomalies = await query(riskAnomaliesQuery, [days]);

    // Convert data types for frontend compatibility
    const convertedEmailAnomalies = emailAnomalies.rows.map(anomaly => ({
      id: parseInt(anomaly.id) || 0,
      name: anomaly.name,
      department: anomaly.department,
      current_emails: parseInt(anomaly.current_emails) || 0,
      avg_email_volume: parseFloat(anomaly.avg_email_volume) || 0,
      z_score: parseFloat(anomaly.z_score) || 0,
      anomaly_type: anomaly.anomaly_type
    }));

    const convertedAfterHoursAnomalies = afterHoursAnomalies.rows.map(anomaly => ({
      id: parseInt(anomaly.id) || 0,
      name: anomaly.name,
      department: anomaly.department,
      recent_value: parseFloat(anomaly.recent_value) || 0,
      avg_value: parseFloat(anomaly.avg_value) || 0,
      z_score: parseFloat(anomaly.z_score) || 0,
      anomaly_type: anomaly.anomaly_type
    }));

    const convertedRiskAnomalies = riskAnomalies.rows.map(anomaly => ({
      id: parseInt(anomaly.id) || 0,
      name: anomaly.name,
      department: anomaly.department,
      current_risk: parseFloat(anomaly.current_risk) || 0,
      recent_violations: parseInt(anomaly.recent_violations) || 0,
      anomaly_type: anomaly.anomaly_type
    }));

    res.json({
      emailAnomalies: convertedEmailAnomalies,
      afterHoursAnomalies: convertedAfterHoursAnomalies,
      riskAnomalies: convertedRiskAnomalies,
      detection: {
        period: `${days} days`,
        threshold: threshold,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Activity anomalies error:', error);
    res.status(500).json({
      error: 'Failed to detect activity anomalies',
      code: 'ACTIVITY_ANOMALIES_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/activity-reports/comparison:
 *   get:
 *     summary: Compare activity between employees or departments
 *     tags: [Activity Reports]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [employees, departments]
 *           default: departments
 *         description: Type of comparison
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of employee IDs (for employee comparison)
 *       - in: query
 *         name: departments
 *         schema:
 *           type: string
 *         description: Comma-separated list of department names
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Comparison analysis results
 *       401:
 *         description: Authentication required
 */
router.get('/comparison', async (req, res) => {
  try {
    const type = req.query.type || 'departments';
    const days = parseInt(req.query.days) || 30;
    
    if (type === 'employees') {
      const employeeIds = req.query.ids ? req.query.ids.split(',').map(id => parseInt(id.trim())) : [];
      
      if (employeeIds.length === 0) {
        return res.status(400).json({
          error: 'Employee IDs are required for employee comparison',
          code: 'MISSING_EMPLOYEE_IDS'
        });
      }

      const placeholders = employeeIds.map((_, index) => `$${index + 2}`).join(',');
      
      const employeeComparisonQuery = `
        SELECT 
          e.id,
          e.name,
          e.department,
          e.risk_score,
          e.risk_level,
          COUNT(v.id) as violation_count,
          COUNT(ec.id) as email_count,
          COUNT(CASE WHEN ec.is_flagged = true THEN 1 END) as flagged_email_count,
          ROUND(AVG(em.email_volume), 2) as avg_email_volume,
          ROUND(AVG(em.external_contacts), 2) as avg_external_contacts,
          ROUND(AVG(em.after_hours_activity), 2) as avg_after_hours_activity,
          ROUND(AVG(em.data_transfer), 2) as avg_data_transfer
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id 
          AND v.created_at > NOW() - INTERVAL '1 day' * $1
        LEFT JOIN email_communications ec ON e.id = ec.sender_employee_id 
          AND ec.sent_at > NOW() - INTERVAL '1 day' * $1
        LEFT JOIN employee_metrics em ON e.id = em.employee_id 
          AND em.date > NOW() - INTERVAL '1 day' * $1
        WHERE e.id IN (${placeholders})
        GROUP BY e.id, e.name, e.department, e.risk_score, e.risk_level
        ORDER BY e.risk_score DESC
      `;

      const result = await query(employeeComparisonQuery, [days, ...employeeIds]);
      
      // Convert data types for frontend compatibility
      const convertedComparison = result.rows.map(employee => ({
        id: parseInt(employee.id) || 0,
        name: employee.name,
        department: employee.department,
        risk_score: parseFloat(employee.risk_score) || 0,
        risk_level: employee.risk_level,
        violation_count: parseInt(employee.violation_count) || 0,
        email_count: parseInt(employee.email_count) || 0,
        flagged_email_count: parseInt(employee.flagged_email_count) || 0,
        avg_email_volume: parseFloat(employee.avg_email_volume) || 0,
        avg_external_contacts: parseFloat(employee.avg_external_contacts) || 0,
        avg_after_hours_activity: parseFloat(employee.avg_after_hours_activity) || 0,
        avg_data_transfer: parseFloat(employee.avg_data_transfer) || 0
      }));
      
      res.json({
        type: 'employees',
        comparison: convertedComparison,
        period: { days }
      });

    } else { // departments
      const departments = req.query.departments ? 
        req.query.departments.split(',').map(dept => dept.trim()) : [];
      
      let departmentFilter = '';
      let queryParams = [days];
      
      if (departments.length > 0) {
        const placeholders = departments.map((_, index) => `$${index + 2}`).join(',');
        departmentFilter = `AND e.department IN (${placeholders})`;
        queryParams.push(...departments);
      }

      const departmentComparisonQuery = `
        SELECT 
          e.department,
          COUNT(DISTINCT e.id) as employee_count,
          ROUND(AVG(e.risk_score), 2) as avg_risk_score,
          COUNT(v.id) as total_violations,
          COUNT(CASE WHEN v.severity = 'Critical' THEN 1 END) as critical_violations,
          COUNT(ec.id) as total_emails,
          COUNT(CASE WHEN ec.is_flagged = true THEN 1 END) as flagged_emails,
          ROUND(AVG(em.email_volume), 2) as avg_email_volume,
          ROUND(AVG(em.external_contacts), 2) as avg_external_contacts,
          ROUND(AVG(em.after_hours_activity), 2) as avg_after_hours_activity,
          ROUND(AVG(em.data_transfer), 2) as avg_data_transfer
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id 
          AND v.created_at > NOW() - INTERVAL '1 day' * $1
        LEFT JOIN email_communications ec ON e.id = ec.sender_employee_id 
          AND ec.sent_at > NOW() - INTERVAL '1 day' * $1
        LEFT JOIN employee_metrics em ON e.id = em.employee_id 
          AND em.date > NOW() - INTERVAL '1 day' * $1
        WHERE e.is_active = true ` + departmentFilter + `
        GROUP BY e.department
        ORDER BY avg_risk_score DESC, total_violations DESC
      `;

      const result = await query(departmentComparisonQuery, queryParams);
      
      // Convert data types for frontend compatibility
      const convertedComparison = result.rows.map(department => ({
        department: department.department,
        employee_count: parseInt(department.employee_count) || 0,
        avg_risk_score: parseFloat(department.avg_risk_score) || 0,
        total_violations: parseInt(department.total_violations) || 0,
        critical_violations: parseInt(department.critical_violations) || 0,
        total_emails: parseInt(department.total_emails) || 0,
        flagged_emails: parseInt(department.flagged_emails) || 0,
        avg_email_volume: parseFloat(department.avg_email_volume) || 0,
        avg_external_contacts: parseFloat(department.avg_external_contacts) || 0,
        avg_after_hours_activity: parseFloat(department.avg_after_hours_activity) || 0,
        avg_data_transfer: parseFloat(department.avg_data_transfer) || 0
      }));
      
      res.json({
        type: 'departments',
        comparison: convertedComparison,
        period: { days }
      });
    }

  } catch (error) {
    console.error('Activity comparison error:', error);
    res.status(500).json({
      error: 'Failed to perform activity comparison',
      code: 'ACTIVITY_COMPARISON_ERROR'
    });
  }
});

module.exports = router; 