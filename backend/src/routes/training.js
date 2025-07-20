/**
 * Training Management API Routes
 * Provides REST endpoints for the training management system
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { trainingAssignmentService } = require('../services/trainingAssignmentService');
const AITrainingContentGenerator = require('../services/aiTrainingContentGenerator');
const { requireAuth, requireAdmin, requireAnalyst } = require('../middleware/auth');

// Initialize services
const aiContentGenerator = new AITrainingContentGenerator();

// Middleware to ensure services are initialized
const ensureTrainingServices = async (req, res, next) => {
  try {
    if (!trainingAssignmentService.initialized) {
      await trainingAssignmentService.initialize();
    }
    next();
  } catch (error) {
    console.error('Failed to initialize training services:', error);
    res.status(500).json({ 
      error: 'Training services initialization failed',
      message: error.message 
    });
  }
};

// Apply authentication and service initialization to all routes
router.use(requireAuth);
router.use(ensureTrainingServices);

/**
 * =================================
 * TRAINING PROGRAMS ENDPOINTS
 * =================================
 */

// GET /api/training/programs - List all training programs
router.get('/programs', async (req, res) => {
  try {
    const { status, regulation, mandatory, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT tp.*, 
             (SELECT COUNT(*) FROM training_assignments ta WHERE ta.program_id = tp.id) as total_assignments,
             (SELECT COUNT(*) FROM training_assignments ta WHERE ta.program_id = tp.id AND ta.status = 'completed') as completed_assignments,
             (SELECT AVG(ta.final_score) FROM training_assignments ta WHERE ta.program_id = tp.id AND ta.final_score IS NOT NULL) as average_score
      FROM training_programs tp
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND tp.is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    if (regulation) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(tp.applicable_regulations)`;
      params.push(regulation);
    }

    if (mandatory !== undefined) {
      paramCount++;
      query += ` AND tp.is_mandatory = $${paramCount}`;
      params.push(mandatory === 'true');
    }

    if (type) {
      paramCount++;
      query += ` AND tp.program_type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY tp.is_mandatory DESC, tp.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    // Calculate completion rates
    const programs = result.rows.map(program => ({
      ...program,
      completion_rate: program.total_assignments > 0 
        ? Math.round((program.completed_assignments / program.total_assignments) * 100)
        : 0,
      average_score: program.average_score ? Math.round(program.average_score) : null
    }));

    res.json({
      programs,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching training programs:', error);
    res.status(500).json({ error: 'Failed to fetch training programs' });
  }
});

// GET /api/training/programs/:id - Get specific training program
router.get('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const programResult = await pool.query(`
      SELECT tp.*, 
             (SELECT COUNT(*) FROM training_assignments ta WHERE ta.program_id = tp.id) as total_assignments,
             (SELECT COUNT(*) FROM training_assignments ta WHERE ta.program_id = tp.id AND ta.status = 'completed') as completed_assignments,
             (SELECT AVG(ta.final_score) FROM training_assignments ta WHERE ta.program_id = tp.id AND ta.final_score IS NOT NULL) as average_score
      FROM training_programs tp
      WHERE tp.id = $1
    `, [id]);

    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training program not found' });
    }

    // Get program content
    const contentResult = await pool.query(`
      SELECT tc.*, tpc.sequence_order, tpc.is_required
      FROM training_content tc
      JOIN training_program_content tpc ON tc.id = tpc.content_id
      WHERE tpc.program_id = $1
      ORDER BY tpc.sequence_order
    `, [id]);

    const program = programResult.rows[0];
    program.content = contentResult.rows;
    program.completion_rate = program.total_assignments > 0 
      ? Math.round((program.completed_assignments / program.total_assignments) * 100)
      : 0;

    res.json({ program });

  } catch (error) {
    console.error('Error fetching training program:', error);
    res.status(500).json({ error: 'Failed to fetch training program' });
  }
});

// POST /api/training/programs - Create new training program (Admin only)
router.post('/programs', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      program_type = 'standard',
      applicable_regulations = [],
      is_mandatory = false,
      target_departments = [],
      target_roles = [],
      target_compliance_profiles = [],
      recurrence_type = 'once',
      grace_period_days = 7
    } = req.body;

    const result = await pool.query(`
      INSERT INTO training_programs (
        name, description, program_type, applicable_regulations, is_mandatory,
        target_departments, target_roles, target_compliance_profiles,
        recurrence_type, grace_period_days, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name, description, program_type, applicable_regulations, is_mandatory,
      target_departments, target_roles, target_compliance_profiles,
      recurrence_type, grace_period_days, req.user.id
    ]);

    res.status(201).json({
      message: 'Training program created successfully',
      program: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating training program:', error);
    res.status(500).json({ error: 'Failed to create training program' });
  }
});

/**
 * =================================
 * TRAINING CONTENT ENDPOINTS
 * =================================
 */

// GET /api/training/content - List training content
router.get('/content', async (req, res) => {
  try {
    const { category, regulation, type, status, ai_generated, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT tc.*, tcat.name as category_name
      FROM training_content tc
      LEFT JOIN training_categories tcat ON tc.category_id = tcat.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND tc.category_id = $${paramCount}`;
      params.push(category);
    }

    if (regulation) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(tc.applicable_regulations)`;
      params.push(regulation);
    }

    if (type) {
      paramCount++;
      query += ` AND tc.content_type = $${paramCount}`;
      params.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND tc.status = $${paramCount}`;
      params.push(status);
    }

    if (ai_generated !== undefined) {
      paramCount++;
      query += ` AND tc.ai_generated = $${paramCount}`;
      params.push(ai_generated === 'true');
    }

    query += ` ORDER BY tc.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      content: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching training content:', error);
    res.status(500).json({ error: 'Failed to fetch training content' });
  }
});

// GET /api/training/content/:id - Get specific training content
router.get('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT tc.*, 
             (SELECT COUNT(*) FROM training_assignments ta 
              JOIN training_program_content tpc ON ta.program_id = tpc.program_id 
              WHERE tpc.content_id = tc.id) as usage_count
      FROM training_content tc
      WHERE tc.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training content not found' });
    }

    res.json({
      success: true,
      content: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching training content:', error);
    res.status(500).json({ error: 'Failed to fetch training content' });
  }
});

// POST /api/training/content - Create new training content
router.post('/content', requireAnalyst, async (req, res) => {
  try {
    const {
      title,
      description,
      content_type,
      content_data,
      applicable_regulations,
      compliance_level,
      estimated_duration_minutes,
      status = 'draft',
      tags = [],
      difficulty_level = 1,
      learning_objectives = [],
      prerequisites = [],
      assessment_type = 'none',
      passing_score = 70
    } = req.body;

    if (!title || !description || !content_type) {
      return res.status(400).json({ error: 'Title, description, and content type are required' });
    }

    const query = `
      INSERT INTO training_content (
        title, description, content_type, content_data, applicable_regulations,
        compliance_level, estimated_duration_minutes, status, tags,
        difficulty_level, learning_objectives, prerequisites,
        assessment_type, passing_score, ai_generated, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, $15)
      RETURNING *
    `;

    const values = [
      title, description, content_type, content_data, applicable_regulations,
      compliance_level, estimated_duration_minutes, status, tags,
      difficulty_level, learning_objectives, prerequisites,
      assessment_type, passing_score, req.user.id
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Training content created successfully',
      content: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating training content:', error);
    res.status(500).json({ error: 'Failed to create training content' });
  }
});

// PUT /api/training/content/:id - Update training content
router.put('/content/:id', requireAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      content_type,
      content_data,
      applicable_regulations,
      compliance_level,
      estimated_duration_minutes,
      status,
      tags,
      difficulty_level,
      learning_objectives,
      prerequisites,
      assessment_type,
      passing_score
    } = req.body;

    // Check if content exists
    const existingContent = await pool.query('SELECT * FROM training_content WHERE id = $1', [id]);
    if (existingContent.rows.length === 0) {
      return res.status(404).json({ error: 'Training content not found' });
    }

    const query = `
      UPDATE training_content SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        content_type = COALESCE($3, content_type),
        content_data = COALESCE($4, content_data),
        applicable_regulations = COALESCE($5, applicable_regulations),
        compliance_level = COALESCE($6, compliance_level),
        estimated_duration_minutes = COALESCE($7, estimated_duration_minutes),
        status = COALESCE($8, status),
        tags = COALESCE($9, tags),
        difficulty_level = COALESCE($10, difficulty_level),
        learning_objectives = COALESCE($11, learning_objectives),
        prerequisites = COALESCE($12, prerequisites),
        assessment_type = COALESCE($13, assessment_type),
        passing_score = COALESCE($14, passing_score),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      title, description, content_type, content_data, applicable_regulations,
      compliance_level, estimated_duration_minutes, status, tags,
      difficulty_level, learning_objectives, prerequisites,
      assessment_type, passing_score, id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Training content updated successfully',
      content: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating training content:', error);
    res.status(500).json({ error: 'Failed to update training content' });
  }
});

// DELETE /api/training/content/:id - Delete training content
router.delete('/content/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if content exists
    const existingContent = await pool.query('SELECT * FROM training_content WHERE id = $1', [id]);
    if (existingContent.rows.length === 0) {
      return res.status(404).json({ error: 'Training content not found' });
    }

    // Check if content is being used in any programs
    const usageCheck = await pool.query(`
      SELECT COUNT(*) as usage_count
      FROM training_program_content tpc
      WHERE tpc.content_id = $1
    `, [id]);

    if (parseInt(usageCheck.rows[0].usage_count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete content that is being used in training programs'
      });
    }

    // Delete the content
    await pool.query('DELETE FROM training_content WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Training content deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting training content:', error);
    res.status(500).json({ error: 'Failed to delete training content' });
  }
});

// POST /api/training/content/upload - Upload content file
router.post('/content/upload', requireAnalyst, async (req, res) => {
  try {
    // This would handle file upload using multer or similar
    // For now, we'll return a mock response
    const { originalname, mimetype, size } = req.file || {};
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process the uploaded file (extract content, generate thumbnail, etc.)
    const content_type = mimetype.includes('video') ? 'video' : 
                        mimetype.includes('presentation') ? 'presentation' : 'document';

    // Mock file processing result
    const fileUrl = `/uploads/content/${Date.now()}-${originalname}`;
    const thumbnailUrl = content_type === 'video' ? `/uploads/thumbnails/${Date.now()}-thumb.jpg` : null;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      content_type: content_type,
      original_name: originalname,
      size: size,
      content: `Uploaded content from ${originalname}`
    });

  } catch (error) {
    console.error('Error uploading content:', error);
    res.status(500).json({ error: 'Failed to upload content' });
  }
});

// GET /api/training/content/:id/analytics - Get content analytics
router.get('/content/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    const analyticsQuery = `
      SELECT 
        tc.id,
        tc.title,
        tc.view_count,
        tc.completion_count,
        tc.average_rating,
        COUNT(DISTINCT ta.id) as total_assignments,
        COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN ta.id END) as completed_assignments,
        ROUND(AVG(ta.score), 2) as average_score,
        COUNT(DISTINCT ta.employee_id) as unique_learners,
        tc.created_at,
        tc.updated_at
      FROM training_content tc
      LEFT JOIN training_program_content tpc ON tc.id = tpc.content_id
      LEFT JOIN training_assignments ta ON tpc.program_id = ta.program_id
      WHERE tc.id = $1
      GROUP BY tc.id, tc.title, tc.view_count, tc.completion_count, tc.average_rating, tc.created_at, tc.updated_at
    `;

    const result = await pool.query(analyticsQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const analytics = result.rows[0];

    // Get usage over time (mock data for now)
    const usageOverTime = [
      { date: '2024-01-01', views: 10, completions: 8 },
      { date: '2024-01-02', views: 15, completions: 12 },
      { date: '2024-01-03', views: 8, completions: 6 },
      { date: '2024-01-04', views: 20, completions: 18 },
      { date: '2024-01-05', views: 12, completions: 10 }
    ];

    res.json({
      success: true,
      analytics: {
        ...analytics,
        usage_over_time: usageOverTime
      }
    });

  } catch (error) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({ error: 'Failed to fetch content analytics' });
  }
});

/**
 * =================================
 * AI CONTENT GENERATION ENDPOINTS
 * =================================
 */

// POST /api/training/generate-content - Generate training content with AI (Admin/Analyst)
router.post('/generate-content', requireAnalyst, async (req, res) => {
  try {
    const {
      regulation,
      content_type = 'overview',
      target_audience = 'all_employees',
      difficulty_level = 1,
      estimated_duration = 30,
      specific_topics = [],
      include_quiz = true,
      category_id
    } = req.body;

    if (!regulation) {
      return res.status(400).json({ error: 'Regulation is required' });
    }

    console.log(`🤖 AI content generation requested for ${regulation} by user ${req.user.id}`);

    const result = await aiContentGenerator.generateTrainingContent({
      regulation,
      contentType: content_type,
      targetAudience: target_audience,
      difficultyLevel: difficulty_level,
      estimatedDuration: estimated_duration,
      specificTopics: specific_topics,
      includeQuiz: include_quiz,
      requestedBy: req.user.id,
      categoryId: category_id
    });

    res.json({
      message: 'AI training content generated successfully',
      generation: result
    });

  } catch (error) {
    console.error('Error generating AI training content:', error);
    res.status(500).json({ 
      error: 'Failed to generate training content',
      details: error.message 
    });
  }
});

/**
 * =================================
 * TRAINING ASSIGNMENTS ENDPOINTS
 * =================================
 */

// GET /api/training/assignments - List training assignments (Admin view)
router.get('/assignments', requireAnalyst, async (req, res) => {
  try {
    const { employee_id, program_id, status, due_soon, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT ta.*, tp.name as program_name, tp.is_mandatory, tp.applicable_regulations,
             e.name as employee_name, e.department, e.email
      FROM training_assignments ta
      JOIN training_programs tp ON ta.program_id = tp.id
      JOIN employees e ON ta.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (employee_id) {
      paramCount++;
      query += ` AND ta.employee_id = $${paramCount}`;
      params.push(employee_id);
    }

    if (program_id) {
      paramCount++;
      query += ` AND ta.program_id = $${paramCount}`;
      params.push(program_id);
    }

    if (status) {
      paramCount++;
      query += ` AND ta.status = $${paramCount}`;
      params.push(status);
    }

    if (due_soon === 'true') {
      query += ` AND ta.due_date <= NOW() + INTERVAL '7 days' AND ta.status != 'completed'`;
    }

    query += ` ORDER BY ta.due_date ASC, ta.priority DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      assignments: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching training assignments:', error);
    res.status(500).json({ error: 'Failed to fetch training assignments' });
  }
});

// PUT /api/training/assignments/:id/progress - Update assignment progress
router.put('/assignments/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress_percentage, status, score, completion_time } = req.body;

    // Verify assignment belongs to current user (unless admin)
    if (!req.user.is_admin) {
      const verifyResult = await pool.query(`
        SELECT employee_id FROM training_assignments WHERE id = $1
      `, [id]);

      if (verifyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (verifyResult.rows[0].employee_id !== req.user.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updatedAssignment = await trainingAssignmentService.updateAssignmentProgress(id, {
      progressPercentage: progress_percentage,
      status,
      score,
      completionTime: completion_time
    });

    res.json({
      message: 'Assignment progress updated successfully',
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Error updating assignment progress:', error);
    res.status(500).json({ error: 'Failed to update assignment progress' });
  }
});

/**
 * =================================
 * CERTIFICATES ENDPOINTS
 * =================================
 */

// GET /api/training/certificates - List all certificates (Admin view)
router.get('/certificates', requireAnalyst, async (req, res) => {
  try {
    const { employee_id, program_id, status, expiring_soon, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT tc.*, tp.name as program_name, e.name as employee_name, e.department
      FROM training_certificates tc
      JOIN training_programs tp ON tc.program_id = tp.id
      JOIN employees e ON tc.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (employee_id) {
      paramCount++;
      query += ` AND tc.employee_id = $${paramCount}`;
      params.push(employee_id);
    }

    if (program_id) {
      paramCount++;
      query += ` AND tc.program_id = $${paramCount}`;
      params.push(program_id);
    }

    if (status) {
      paramCount++;
      query += ` AND tc.status = $${paramCount}`;
      params.push(status);
    }

    if (expiring_soon === 'true') {
      query += ` AND tc.expires_at <= NOW() + INTERVAL '30 days' AND tc.expires_at > NOW()`;
    }

    query += ` ORDER BY tc.issued_date DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      certificates: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

/**
 * =================================
 * STATISTICS AND REPORTING ENDPOINTS
 * =================================
 */

// GET /api/training/stats - Training system statistics
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM training_programs WHERE is_active = true) as total_programs,
        (SELECT COUNT(*) FROM training_programs WHERE is_active = true) as active_programs,
        (SELECT COUNT(*) FROM training_assignments) as total_assignments,
        (SELECT COUNT(*) FROM training_assignments WHERE status = 'completed') as completed_assignments,
        (SELECT COUNT(*) FROM training_assignments WHERE status = 'overdue') as overdue_assignments,
        (SELECT COUNT(*) FROM training_certificates WHERE status = 'active') as certificates_issued,
        (SELECT COUNT(*) FROM training_content WHERE ai_generated = true) as ai_generated_content
    `);

    const stats = statsResult.rows[0];
    stats.completion_rate = stats.total_assignments > 0 
      ? Math.round((stats.completed_assignments / stats.total_assignments) * 100)
      : 0;

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching training stats:', error);
    res.status(500).json({ error: 'Failed to fetch training statistics' });
  }
});

/**
 * =================================
 * COMPLIANCE REQUIREMENTS ENDPOINTS
 * =================================
 */

// GET /api/training/compliance-requirements - List compliance requirements
router.get('/compliance-requirements', async (req, res) => {
  try {
    const { regulation } = req.query;

    let query = `
      SELECT * FROM training_compliance_requirements 
      WHERE is_active = true
    `;
    const params = [];

    if (regulation) {
      query += ` AND regulation_code = $1`;
      params.push(regulation);
    }

    query += ` ORDER BY regulation_code, requirement_section`;

    const result = await pool.query(query, params);

    res.json({
      requirements: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching compliance requirements:', error);
    res.status(500).json({ error: 'Failed to fetch compliance requirements' });
  }
});

/**
 * =================================
 * AUTOMATED TRAINING ASSIGNMENT
 * =================================
 */

// POST /api/training/auto-assign - Run automatic compliance training assignment (Admin only)
router.post('/auto-assign', requireAdmin, async (req, res) => {
  try {
    console.log('🤖 Starting automatic compliance training assignment...');

    const results = await trainingAssignmentService.autoAssignComplianceTraining();

    res.json({
      message: 'Automatic training assignment completed',
      results
    });

  } catch (error) {
    console.error('Error in automatic training assignment:', error);
    res.status(500).json({ 
      error: 'Failed to run automatic training assignment',
      details: error.message 
    });
  }
});

/**
 * =================================
 * TRAINING REPORTS ENDPOINTS
 * =================================
 */

// GET /api/training/reports/completion - Generate completion report
router.get('/reports/completion', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.name as employee_name,
        e.email as employee_email,
        e.department,
        tp.name as program_name,
        ta.status,
        ta.assigned_date,
        ta.completed_date,
        ta.score,
        ta.certificate_id,
        tp.applicable_regulations
      FROM training_assignments ta
      JOIN employees e ON ta.employee_id = e.id
      JOIN training_programs tp ON ta.program_id = tp.id
      ORDER BY ta.assigned_date DESC
    `;

    const result = await pool.query(query);
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=training-completion-report.csv');
    
    // Generate CSV content
    const csvHeaders = [
      'Employee Name', 'Email', 'Department', 'Program Name', 'Status',
      'Assigned Date', 'Completed Date', 'Score', 'Certificate ID', 'Regulations'
    ].join(',') + '\n';
    
    let csvContent = csvHeaders;
    
    result.rows.forEach(row => {
      const csvRow = [
        `"${row.employee_name || ''}"`,
        `"${row.employee_email || ''}"`,
        `"${row.department || ''}"`,
        `"${row.program_name || ''}"`,
        `"${row.status || ''}"`,
        `"${row.assigned_date ? new Date(row.assigned_date).toLocaleDateString() : ''}"`,
        `"${row.completed_date ? new Date(row.completed_date).toLocaleDateString() : ''}"`,
        `"${row.score || ''}"`,
        `"${row.certificate_id || ''}"`,
        `"${row.applicable_regulations ? row.applicable_regulations.join(', ') : ''}"`
      ].join(',') + '\n';
      
      csvContent += csvRow;
    });
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating completion report:', error);
    res.status(500).json({ 
      error: 'Failed to generate completion report',
      details: error.message 
    });
  }
});

// GET /api/training/reports/compliance - Generate compliance report
router.get('/reports/compliance', async (req, res) => {
  try {
    const query = `
      SELECT 
        cr.regulation_code,
        cr.requirement_title,
        cr.required_frequency,
        cr.minimum_training_hours,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN e.id END) as compliant_employees,
        ROUND(
          (COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN e.id END)::decimal / 
           NULLIF(COUNT(DISTINCT e.id), 0)) * 100, 2
        ) as compliance_percentage
      FROM compliance_requirements cr
      CROSS JOIN employees e
      LEFT JOIN training_programs tp ON tp.applicable_regulations @> ARRAY[cr.regulation_code]
      LEFT JOIN training_assignments ta ON ta.program_id = tp.id AND ta.employee_id = e.id
      WHERE cr.is_active = true
      GROUP BY cr.id, cr.regulation_code, cr.requirement_title, cr.required_frequency, cr.minimum_training_hours
      ORDER BY cr.regulation_code, cr.requirement_title
    `;

    const result = await pool.query(query);
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=training-compliance-report.csv');
    
    // Generate CSV content
    const csvHeaders = [
      'Regulation', 'Requirement Title', 'Required Frequency', 'Min Hours',
      'Total Employees', 'Compliant Employees', 'Compliance %'
    ].join(',') + '\n';
    
    let csvContent = csvHeaders;
    
    result.rows.forEach(row => {
      const csvRow = [
        `"${row.regulation_code || ''}"`,
        `"${row.requirement_title || ''}"`,
        `"${row.required_frequency || ''}"`,
        `"${row.minimum_training_hours || ''}"`,
        `"${row.total_employees || 0}"`,
        `"${row.compliant_employees || 0}"`,
        `"${row.compliance_percentage || 0}%"`
      ].join(',') + '\n';
      
      csvContent += csvRow;
    });
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ 
      error: 'Failed to generate compliance report',
      details: error.message 
    });
  }
});

// GET /api/training/reports/analytics - Generate analytics report
router.get('/reports/analytics', async (req, res) => {
  try {
    const analyticsQuery = `
      SELECT 
        tp.name as program_name,
        tp.program_type,
        tp.applicable_regulations,
        COUNT(ta.id) as total_assignments,
        COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments,
        COUNT(CASE WHEN ta.status = 'in_progress' THEN 1 END) as in_progress_assignments,
        COUNT(CASE WHEN ta.status = 'not_started' THEN 1 END) as not_started_assignments,
        ROUND(AVG(CASE WHEN ta.score IS NOT NULL THEN ta.score END), 2) as average_score,
        ROUND(
          (COUNT(CASE WHEN ta.status = 'completed' THEN 1 END)::decimal / 
           NULLIF(COUNT(ta.id), 0)) * 100, 2
        ) as completion_rate
      FROM training_programs tp
      LEFT JOIN training_assignments ta ON tp.id = ta.program_id
      WHERE tp.is_active = true
      GROUP BY tp.id, tp.name, tp.program_type, tp.applicable_regulations
      ORDER BY tp.name
    `;

    const result = await pool.query(analyticsQuery);
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=training-analytics-report.csv');
    
    // Generate CSV content
    const csvHeaders = [
      'Program Name', 'Program Type', 'Regulations', 'Total Assignments',
      'Completed', 'In Progress', 'Not Started', 'Average Score', 'Completion Rate %'
    ].join(',') + '\n';
    
    let csvContent = csvHeaders;
    
    result.rows.forEach(row => {
      const csvRow = [
        `"${row.program_name || ''}"`,
        `"${row.program_type || ''}"`,
        `"${row.applicable_regulations ? row.applicable_regulations.join(', ') : ''}"`,
        `"${row.total_assignments || 0}"`,
        `"${row.completed_assignments || 0}"`,
        `"${row.in_progress_assignments || 0}"`,
        `"${row.not_started_assignments || 0}"`,
        `"${row.average_score || ''}"`,
        `"${row.completion_rate || 0}%"`
      ].join(',') + '\n';
      
      csvContent += csvRow;
    });
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({ 
      error: 'Failed to generate analytics report',
      details: error.message 
    });
  }
});

module.exports = router; 