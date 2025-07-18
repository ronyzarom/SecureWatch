const express = require('express');
const { query } = require('../utils/database');
const { requireAuth, requireAnalyst, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All category routes require authentication
router.use(requireAuth);

// =============================================================================
// GET ALL THREAT CATEGORIES
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      categoryType = 'all',
      industry = 'all',
      severity = 'all',
      isActive = 'all',
      includeKeywords = 'false',
      includePolicyRules = 'false'
    } = req.query;

    let whereClause = '1=1';
    const queryParams = [];
    let paramCount = 0;

    // Apply filters
    if (search) {
      paramCount++;
      whereClause += ` AND (tc.name ILIKE $${paramCount} OR tc.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (categoryType !== 'all') {
      paramCount++;
      whereClause += ` AND tc.category_type = $${paramCount}`;
      queryParams.push(categoryType);
    }

    if (industry !== 'all') {
      paramCount++;
      whereClause += ` AND tc.industry = $${paramCount}`;
      queryParams.push(industry);
    }

    if (severity !== 'all') {
      paramCount++;
      whereClause += ` AND tc.severity = $${paramCount}`;
      queryParams.push(severity);
    }

    if (isActive !== 'all') {
      paramCount++;
      whereClause += ` AND tc.is_active = $${paramCount}`;
      queryParams.push(isActive === 'true');
    }

    // Base query - PostgreSQL
    const categoriesResult = await query(`
      SELECT 
        tc.id,
        tc.name,
        tc.description,
        tc.category_type,
        tc.industry,
        tc.base_risk_score,
        tc.severity,
        tc.alert_threshold,
        tc.investigation_threshold,
        tc.critical_threshold,
        tc.detection_patterns,
        tc.risk_multipliers,
        tc.is_active,
        json_agg(
          json_build_object(
            'keyword', ck.keyword,
            'weight', ck.weight,
            'isPhrase', ck.is_phrase
          )
        ) FILTER (WHERE ck.keyword IS NOT NULL) as keywords
      FROM threat_categories tc
      LEFT JOIN category_keywords ck ON tc.id = ck.category_id
      WHERE ${whereClause}
      GROUP BY tc.id, tc.name, tc.description, tc.category_type, tc.industry, 
               tc.base_risk_score, tc.severity, tc.alert_threshold, 
               tc.investigation_threshold, tc.critical_threshold, 
               tc.detection_patterns, tc.risk_multipliers, tc.is_active
      ORDER BY tc.name
    `, queryParams);

    // Transform to frontend format
    const categories = categoriesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      categoryType: row.category_type,
      industry: row.industry,
      baseRiskScore: row.base_risk_score,
      severity: row.severity,
      alertThreshold: row.alert_threshold,
      investigationThreshold: row.investigation_threshold,
      criticalThreshold: row.critical_threshold,
      detectionPatterns: row.detection_patterns,
      riskMultipliers: row.risk_multipliers,
      isActive: row.is_active,
      isSystemCategory: row.is_system_category,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: {
        keywordCount: parseInt(row.keyword_count) || 0,
        policyRuleCount: parseInt(row.policy_rule_count) || 0,
        detectionCount: parseInt(row.detection_count) || 0,
        avgRiskScore: parseFloat(row.avg_risk_score) || 0
      }
    }));

    // Include keywords if requested
    if (includeKeywords === 'true' && categories.length > 0) {
      const categoryIds = categories.map(c => c.id);
      
      const keywordsResult = await query(`
        SELECT category_id, keyword, weight, is_phrase, context_required
        FROM category_keywords
        WHERE category_id = ANY($1)
        ORDER BY weight DESC, keyword ASC
      `, [categoryIds]);

      const keywordsByCategory = keywordsResult.rows.reduce((acc, row) => {
        if (!acc[row.category_id]) acc[row.category_id] = [];
        acc[row.category_id].push({
          keyword: row.keyword,
          weight: parseFloat(row.weight),
          isPhrase: row.is_phrase,
          contextRequired: row.context_required
        });
        return acc;
      }, {});

      categories.forEach(category => {
        category.keywords = keywordsByCategory[category.id] || [];
      });
    }

    res.json({
      categories,
      total: categories.length
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to fetch threat categories',
      code: 'CATEGORIES_FETCH_ERROR'
    });
  }
});

// =============================================================================
// GET SINGLE THREAT CATEGORY
// =============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const categoryResult = await query(`
      SELECT 
        tc.*,
        u.name as created_by_name
      FROM threat_categories tc
      LEFT JOIN users u ON tc.created_by = u.id
      WHERE tc.id = $1
    `, [id]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Threat category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const category = categoryResult.rows[0];

    // Get keywords
    const keywordsResult = await query(`
      SELECT keyword, weight, is_phrase, context_required, created_at
      FROM category_keywords
      WHERE category_id = $1
      ORDER BY weight DESC, keyword ASC
    `, [id]);

    // Get policy rules
    const policyRulesResult = await query(`
      SELECT 
        pcr.*,
        sp.name as policy_name
      FROM policy_category_rules pcr
      JOIN security_policies sp ON pcr.policy_id = sp.id
      WHERE pcr.category_id = $1
      ORDER BY sp.name ASC
    `, [id]);

    // Get recent detection results
    const detectionResults = await query(`
      SELECT 
        cdr.*,
        e.name as employee_name,
        e.email as employee_email
      FROM category_detection_results cdr
      JOIN employees e ON cdr.employee_id = e.id
      WHERE cdr.category_id = $1
      ORDER BY cdr.analyzed_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      ...{
        id: category.id,
        name: category.name,
        description: category.description,
        categoryType: category.category_type,
        industry: category.industry,
        baseRiskScore: category.base_risk_score,
        severity: category.severity,
        alertThreshold: category.alert_threshold,
        investigationThreshold: category.investigation_threshold,
        criticalThreshold: category.critical_threshold,
        detectionPatterns: category.detection_patterns,
        riskMultipliers: category.risk_multipliers,
        isActive: category.is_active,
        isSystemCategory: category.is_system_category,
        createdBy: category.created_by,
        createdByName: category.created_by_name,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      },
      keywords: keywordsResult.rows.map(row => ({
        keyword: row.keyword,
        weight: parseFloat(row.weight),
        isPhrase: row.is_phrase,
        contextRequired: row.context_required,
        createdAt: row.created_at
      })),
      policyRules: policyRulesResult.rows.map(row => ({
        id: row.id,
        policyId: row.policy_id,
        policyName: row.policy_name,
        isEnabled: row.is_enabled,
        customThreshold: row.custom_threshold,
        customRiskScore: row.custom_risk_score,
        customKeywords: row.custom_keywords,
        frequencyLimit: row.frequency_limit,
        timeWindowHours: row.time_window_hours,
        requireMultipleIndicators: row.require_multiple_indicators,
        actionConfig: row.action_config
      })),
      recentDetections: detectionResults.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeEmail: row.employee_email,
        riskScore: row.risk_score,
        confidenceScore: parseFloat(row.confidence_score),
        matchedKeywords: row.matched_keywords,
        patternMatches: row.pattern_matches,
        analyzedAt: row.analyzed_at
      }))
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: 'Failed to fetch threat category',
      code: 'CATEGORY_FETCH_ERROR'
    });
  }
});

// =============================================================================
// CREATE NEW THREAT CATEGORY
// =============================================================================
router.post('/', requireAnalyst, async (req, res) => {
  try {
    const {
      name,
      description,
      categoryType = 'custom',
      industry,
      baseRiskScore = 50,
      severity = 'Medium',
      alertThreshold = 70,
      investigationThreshold = 85,
      criticalThreshold = 95,
      detectionPatterns = {},
      riskMultipliers = {},
      keywords = [],
      isActive = true
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Category name is required',
        code: 'MISSING_CATEGORY_NAME'
      });
    }

    if (!['predefined', 'custom', 'industry_specific'].includes(categoryType)) {
      return res.status(400).json({
        error: 'Invalid category type',
        code: 'INVALID_CATEGORY_TYPE'
      });
    }

    if (!['Critical', 'High', 'Medium', 'Low'].includes(severity)) {
      return res.status(400).json({
        error: 'Invalid severity level',
        code: 'INVALID_SEVERITY'
      });
    }

    // Check for duplicate names
    const existingCategory = await query(`
      SELECT id FROM threat_categories WHERE name = $1
    `, [name.trim()]);

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        error: 'Category with this name already exists',
        code: 'CATEGORY_NAME_EXISTS'
      });
    }

    // Begin transaction
    await query('BEGIN');

    try {
      // Create category
      const categoryResult = await query(`
        INSERT INTO threat_categories (
          name, description, category_type, industry, base_risk_score,
          severity, alert_threshold, investigation_threshold, critical_threshold,
          detection_patterns, risk_multipliers, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        name.trim(),
        description?.trim() || null,
        categoryType,
        industry?.trim() || null,
        baseRiskScore,
        severity,
        alertThreshold,
        investigationThreshold,
        criticalThreshold,
        JSON.stringify(detectionPatterns),
        JSON.stringify(riskMultipliers),
        isActive,
        req.user.id
      ]);

      const newCategory = categoryResult.rows[0];

      // Add keywords if provided
      if (keywords.length > 0) {
        for (const keywordItem of keywords) {
          // Handle both string arrays and object arrays
          let keyword, weight, isPhrase;
          if (typeof keywordItem === 'string') {
            keyword = keywordItem;
            weight = 1.0;
            isPhrase = false;
          } else {
            keyword = keywordItem.keyword;
            weight = keywordItem.weight || 1.0;
            isPhrase = keywordItem.isPhrase || false;
          }
          
          if (keyword && keyword.trim()) {
            await query(`
              INSERT INTO category_keywords (category_id, keyword, weight, is_phrase)
              VALUES ($1, $2, $3, $4)
            `, [newCategory.id, keyword.trim(), weight, isPhrase]);
          }
        }
      }

      await query('COMMIT');

      res.status(201).json({
        message: 'Threat category created successfully',
        category: {
          id: newCategory.id,
          name: newCategory.name,
          description: newCategory.description,
          categoryType: newCategory.category_type,
          industry: newCategory.industry,
          baseRiskScore: newCategory.base_risk_score,
          severity: newCategory.severity,
          alertThreshold: newCategory.alert_threshold,
          investigationThreshold: newCategory.investigation_threshold,
          criticalThreshold: newCategory.critical_threshold,
          detectionPatterns: newCategory.detection_patterns,
          riskMultipliers: newCategory.risk_multipliers,
          isActive: newCategory.is_active,
          isSystemCategory: newCategory.is_system_category,
          createdBy: newCategory.created_by,
          createdAt: newCategory.created_at,
          updatedAt: newCategory.updated_at
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Create category error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Category with this name already exists',
        code: 'CATEGORY_NAME_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to create threat category',
      code: 'CATEGORY_CREATE_ERROR'
    });
  }
});

// =============================================================================
// UPDATE THREAT CATEGORY
// =============================================================================
router.put('/:id', requireAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      industry,
      baseRiskScore,
      severity,
      alertThreshold,
      investigationThreshold,
      criticalThreshold,
      detectionPatterns,
      riskMultipliers,
      keywords,
      isActive
    } = req.body;

    // Check if category exists and user can edit it
    const existingCategory = await query(`
      SELECT * FROM threat_categories WHERE id = $1
    `, [id]);

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        error: 'Threat category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const category = existingCategory.rows[0];

    // Prevent modification of system categories by non-admins
    if (category.is_system_category && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Cannot modify system categories',
        code: 'SYSTEM_CATEGORY_READONLY'
      });
    }

    // Begin transaction
    await query('BEGIN');

    try {
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 0;

      if (name !== undefined) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        values.push(name.trim());
      }

      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        values.push(description?.trim() || null);
      }

      if (industry !== undefined) {
        paramCount++;
        updates.push(`industry = $${paramCount}`);
        values.push(industry?.trim() || null);
      }

      if (baseRiskScore !== undefined) {
        paramCount++;
        updates.push(`base_risk_score = $${paramCount}`);
        values.push(baseRiskScore);
      }

      if (severity !== undefined) {
        paramCount++;
        updates.push(`severity = $${paramCount}`);
        values.push(severity);
      }

      if (alertThreshold !== undefined) {
        paramCount++;
        updates.push(`alert_threshold = $${paramCount}`);
        values.push(alertThreshold);
      }

      if (investigationThreshold !== undefined) {
        paramCount++;
        updates.push(`investigation_threshold = $${paramCount}`);
        values.push(investigationThreshold);
      }

      if (criticalThreshold !== undefined) {
        paramCount++;
        updates.push(`critical_threshold = $${paramCount}`);
        values.push(criticalThreshold);
      }

      if (detectionPatterns !== undefined) {
        paramCount++;
        updates.push(`detection_patterns = $${paramCount}`);
        values.push(JSON.stringify(detectionPatterns));
      }

      if (riskMultipliers !== undefined) {
        paramCount++;
        updates.push(`risk_multipliers = $${paramCount}`);
        values.push(JSON.stringify(riskMultipliers));
      }

      if (isActive !== undefined) {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        values.push(isActive);
      }

      // Update category
      if (updates.length > 0) {
        paramCount++;
        values.push(id);
        
        await query(`
          UPDATE threat_categories 
          SET ${updates.join(', ')} 
          WHERE id = $${paramCount}
        `, values);
      }

      // Update keywords if provided
      if (keywords !== undefined) {
        // Delete existing keywords
        await query(`DELETE FROM category_keywords WHERE category_id = $1`, [id]);

        // Add new keywords
        if (keywords.length > 0) {
          for (const keywordItem of keywords) {
            // Handle both string arrays and object arrays
            let keyword, weight, isPhrase;
            if (typeof keywordItem === 'string') {
              keyword = keywordItem;
              weight = 1.0;
              isPhrase = false;
            } else {
              keyword = keywordItem.keyword;
              weight = keywordItem.weight || 1.0;
              isPhrase = keywordItem.isPhrase || false;
            }
            
            if (keyword && keyword.trim()) {
              await query(`
                INSERT INTO category_keywords (category_id, keyword, weight, is_phrase)
                VALUES ($1, $2, $3, $4)
              `, [id, keyword.trim(), weight, isPhrase]);
            }
          }
        }
      }

      await query('COMMIT');

      // Get updated category
      const updatedCategory = await query(`
        SELECT * FROM threat_categories WHERE id = $1
      `, [id]);

      res.json({
        message: 'Threat category updated successfully',
        category: {
          id: updatedCategory.rows[0].id,
          name: updatedCategory.rows[0].name,
          description: updatedCategory.rows[0].description,
          categoryType: updatedCategory.rows[0].category_type,
          industry: updatedCategory.rows[0].industry,
          baseRiskScore: updatedCategory.rows[0].base_risk_score,
          severity: updatedCategory.rows[0].severity,
          alertThreshold: updatedCategory.rows[0].alert_threshold,
          investigationThreshold: updatedCategory.rows[0].investigation_threshold,
          criticalThreshold: updatedCategory.rows[0].critical_threshold,
          detectionPatterns: updatedCategory.rows[0].detection_patterns,
          riskMultipliers: updatedCategory.rows[0].risk_multipliers,
          isActive: updatedCategory.rows[0].is_active,
          isSystemCategory: updatedCategory.rows[0].is_system_category,
          createdBy: updatedCategory.rows[0].created_by,
          createdAt: updatedCategory.rows[0].created_at,
          updatedAt: updatedCategory.rows[0].updated_at
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Update category error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Category with this name already exists',
        code: 'CATEGORY_NAME_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to update threat category',
      code: 'CATEGORY_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// DELETE THREAT CATEGORY
// =============================================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await query(`
      SELECT * FROM threat_categories WHERE id = $1
    `, [id]);

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        error: 'Threat category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const category = existingCategory.rows[0];

    // Prevent deletion of system categories
    if (category.is_system_category) {
      return res.status(403).json({
        error: 'Cannot delete system categories',
        code: 'SYSTEM_CATEGORY_READONLY'
      });
    }

    // Check if category is used in policies
    const policyUsage = await query(`
      SELECT COUNT(*) as count FROM policy_category_rules WHERE category_id = $1
    `, [id]);

    if (parseInt(policyUsage.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete category that is used in policies',
        code: 'CATEGORY_IN_USE'
      });
    }

    // Delete category (CASCADE will handle related records)
    await query(`DELETE FROM threat_categories WHERE id = $1`, [id]);

    res.json({
      message: 'Threat category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: 'Failed to delete threat category',
      code: 'CATEGORY_DELETE_ERROR'
    });
  }
});

// =============================================================================
// GET CATEGORY TEMPLATES
// =============================================================================
router.get('/templates/predefined', async (req, res) => {
  try {
    const { industry = 'all' } = req.query;

    let whereClause = 'category_type = $1';
    const params = ['predefined'];

    if (industry !== 'all') {
      whereClause += ' AND (industry = $2 OR industry = $3)';
      params.push(industry, 'All');
    }

    const templatesResult = await query(`
      SELECT 
        id, name, description, industry, severity, base_risk_score,
        detection_patterns, risk_multipliers,
        (SELECT COUNT(*) FROM category_keywords WHERE category_id = threat_categories.id) as keyword_count
      FROM threat_categories
      WHERE ${whereClause} AND is_active = true
      ORDER BY severity DESC, name ASC
    `, params);

    const templates = templatesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      industry: row.industry,
      severity: row.severity,
      baseRiskScore: row.base_risk_score,
      detectionPatterns: row.detection_patterns,
      riskMultipliers: row.risk_multipliers,
      keywordCount: parseInt(row.keyword_count),
      icon: getSeverityIcon(row.severity),
      color: getSeverityColor(row.severity)
    }));

    res.json({ templates });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Failed to fetch category templates',
      code: 'TEMPLATES_FETCH_ERROR'
    });
  }
});

// =============================================================================
// GET CATEGORY STATISTICS
// =============================================================================
router.get('/stats/overview', async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_categories,
        COUNT(*) FILTER (WHERE is_active = true) as active_categories,
        COUNT(*) FILTER (WHERE category_type = 'custom') as custom_categories,
        COUNT(*) FILTER (WHERE category_type = 'predefined') as predefined_categories,
        COUNT(*) FILTER (WHERE category_type = 'industry_specific') as industry_categories
      FROM threat_categories
    `);

    const detectionStatsResult = await query(`
      SELECT 
        COUNT(*) as total_detections,
        COUNT(*) FILTER (WHERE analyzed_at >= NOW() - INTERVAL '24 hours') as recent_detections,
        COUNT(*) FILTER (WHERE analyzed_at >= NOW() - INTERVAL '7 days') as weekly_detections,
        AVG(risk_score)::numeric(5,2) as avg_risk_score
      FROM category_detection_results
    `);

    const topCategoriesResult = await query(`
      SELECT 
        tc.id as category_id,
        tc.name as category_name,
        tc.severity,
        COUNT(cdr.id) as detection_count,
        AVG(cdr.risk_score)::numeric(5,2) as avg_risk_score
      FROM threat_categories tc
      LEFT JOIN category_detection_results cdr ON tc.id = cdr.category_id
        AND cdr.analyzed_at >= NOW() - INTERVAL '30 days'
      WHERE tc.is_active = true
      GROUP BY tc.id, tc.name, tc.severity
      ORDER BY detection_count DESC, avg_risk_score DESC
      LIMIT 10
    `);

    const stats = statsResult.rows[0];
    const detectionStats = detectionStatsResult.rows[0];

    res.json({
      totalCategories: parseInt(stats.total_categories),
      activeCategories: parseInt(stats.active_categories),
      customCategories: parseInt(stats.custom_categories),
      predefinedCategories: parseInt(stats.predefined_categories),
      industryCategories: parseInt(stats.industry_categories),
      detectionResults: parseInt(detectionStats.total_detections),
      recentDetections: parseInt(detectionStats.recent_detections),
      weeklyDetections: parseInt(detectionStats.weekly_detections),
      avgRiskScore: parseFloat(detectionStats.avg_risk_score) || 0,
      topCategories: topCategoriesResult.rows.map(row => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        severity: row.severity,
        detectionCount: parseInt(row.detection_count),
        averageRiskScore: parseFloat(row.avg_risk_score) || 0
      }))
    });

  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch category statistics',
      code: 'STATS_FETCH_ERROR'
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSeverityIcon(severity) {
  const icons = {
    'Critical': 'alert-triangle',
    'High': 'alert-circle',
    'Medium': 'info',
    'Low': 'check-circle'
  };
  return icons[severity] || 'info';
}

function getSeverityColor(severity) {
  const colors = {
    'Critical': 'red',
    'High': 'orange',
    'Medium': 'yellow',
    'Low': 'green'
  };
  return colors[severity] || 'gray';
}

// =============================================================================
// TEST LLM CATEGORY ANALYSIS
// =============================================================================
router.post('/analyze-email', requireAnalyst, async (req, res) => {
  try {
    const { 
      emailContent, 
      subject = '',
      categoryIds = [],
      useLLM = true 
    } = req.body;

    if (!emailContent) {
      return res.status(400).json({
        error: 'Email content is required',
        code: 'MISSING_EMAIL_CONTENT'
      });
    }

    // Get active categories to analyze against
    let whereClause = 'tc.is_active = $1';
    let queryParams = [true];

    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map((_, i) => `$${i + 2}`).join(',');
      whereClause += ` AND tc.id IN (${placeholders})`;
      queryParams.push(...categoryIds);
    }

    const categoriesResult = await query(`
      SELECT 
        tc.*,
        json_agg(
          json_build_object(
            'keyword', ck.keyword,
            'weight', ck.weight,
            'isPhrase', ck.is_phrase
          )
        ) FILTER (WHERE ck.keyword IS NOT NULL) as keywords
      FROM threat_categories tc
      LEFT JOIN category_keywords ck ON tc.id = ck.category_id
      WHERE ${whereClause}
      GROUP BY tc.id
      ORDER BY tc.name
    `, queryParams);

    const categories = categoriesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      categoryType: row.category_type,
      industry: row.industry,
      baseRiskScore: row.base_risk_score,
      severity: row.severity,
      alertThreshold: row.alert_threshold,
      investigationThreshold: row.investigation_threshold,
      criticalThreshold: row.critical_threshold,
      detectionPatterns: row.detection_patterns,
      riskMultipliers: row.risk_multipliers,
      isActive: row.is_active,
      keywords: row.keywords || []
    }));

    // Initialize email risk analyzer
    const EmailRiskAnalyzer = require('../services/emailRiskAnalyzer');
    const analyzer = new EmailRiskAnalyzer();

    // Create mock email object
    const mockEmail = {
      id: `test-${Date.now()}`,
      subject: subject,
      bodyText: emailContent,
      body: emailContent,
      timestamp: new Date().toISOString(),
      recipients: ['test@external.com'] // Mock external recipient for testing
    };

    // Analyze email with custom categories
    const analysisResults = await analyzer.analyzeWithCustomCategories(mockEmail, categories);

    // Prepare response with detailed analysis
    const response = {
      email: {
        subject: subject,
        contentLength: emailContent.length,
        analyzedAt: new Date().toISOString()
      },
      categories: {
        total: categories.length,
        analyzed: analysisResults.length,
        llmEnabled: analyzer.isLLMAvailable()
      },
      results: analysisResults.map(result => ({
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        riskScore: result.riskScore,
        finalRiskScore: result.finalRiskScore,
        confidence: result.confidence,
        analysisMethod: result.llmAnalysis ? 'LLM' : 'Keyword',
        reasoning: result.reasoning,
        detectedPatterns: result.detectedPatterns,
        violations: result.violations,
        recommendations: result.recommendations,
        alerts: {
          triggersAlert: result.triggersAlert,
          triggersInvestigation: result.triggersInvestigation,
          triggersCritical: result.triggersCritical
        },
        matchedKeywords: result.matchedKeywords || []
      })),
      summary: {
        maxRiskScore: Math.max(...(analysisResults.map(r => r.finalRiskScore).concat([0]))),
        totalViolations: analysisResults.reduce((sum, r) => sum + r.violations.length, 0),
        alertsTriggered: analysisResults.filter(r => r.triggersAlert).length,
        investigationsTriggered: analysisResults.filter(r => r.triggersInvestigation).length,
        criticalAlertsTriggered: analysisResults.filter(r => r.triggersCritical).length
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Email analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze email',
      code: 'EMAIL_ANALYSIS_ERROR',
      details: error.message
    });
  }
});

module.exports = router; 