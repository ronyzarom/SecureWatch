const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../utils/database');
const { generateSQLQueries, generateNaturalLanguageResponse, isAIServiceAvailable } = require('../services/aiService');

// Apply authentication middleware to all chat routes
router.use(requireAuth);

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : null;

    let whereClause = 'user_id = $1';
    let queryParams = [req.user.id];

    if (employeeId) {
      whereClause += ' AND employee_id = $2';
      queryParams.push(employeeId);
    }

    const result = await query(`
      SELECT 
        id, type, content, created_at, employee_id
      FROM chat_messages 
      WHERE ${whereClause}
      ORDER BY created_at ASC
      LIMIT 100
    `, queryParams);

    res.json({
      messages: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        createdAt: row.created_at,
        employeeId: row.employee_id
      }))
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      code: 'HISTORY_ERROR'
    });
  }
});

// Send message to chat
router.post('/message', async (req, res) => {
  try {
    const { message, employeeId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string',
        code: 'INVALID_MESSAGE'
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        error: 'Message is too long (maximum 2000 characters)',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    let validatedEmployeeId = null;
    
    if (employeeId !== undefined && employeeId !== null && employeeId !== '') {
      validatedEmployeeId = parseInt(employeeId);
      if (isNaN(validatedEmployeeId) || validatedEmployeeId <= 0) {
        return res.status(400).json({
          error: 'Invalid employee ID',
          code: 'INVALID_EMPLOYEE_ID'
        });
      }
    }

    // Store user message
    const userMessageResult = await query(`
      INSERT INTO chat_messages (user_id, employee_id, type, content)
      VALUES ($1, $2, 'user', $3)
      RETURNING id, created_at
    `, [req.user.id, validatedEmployeeId, message.trim()]);

    // Generate AI response using two-stage system
    const aiResponse = await generateTwoStageAIResponse(message.trim(), validatedEmployeeId, req.user.id);

    // Store AI response
    const aiMessageResult = await query(`
      INSERT INTO chat_messages (user_id, employee_id, type, content)
      VALUES ($1, $2, 'assistant', $3)
      RETURNING id, created_at
    `, [req.user.id, validatedEmployeeId, aiResponse]);

    res.json({
      userMessage: {
        id: userMessageResult.rows[0].id,
        type: 'user',
        content: message.trim(),
        createdAt: userMessageResult.rows[0].created_at
      },
      aiMessage: {
        id: aiMessageResult.rows[0].id,
        type: 'assistant',
        content: aiResponse,
        createdAt: aiMessageResult.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      code: 'MESSAGE_ERROR'
    });
  }
});

// Delete chat message (user can only delete their own messages)
router.delete('/message/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        error: 'Invalid message ID',
        code: 'INVALID_ID'
      });
    }

    const result = await query(`
      DELETE FROM chat_messages 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [messageId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Message not found or access denied',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    res.json({
      message: 'Message deleted successfully',
      deletedId: messageId
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Failed to delete message',
      code: 'DELETE_ERROR'
    });
  }
});

// Clear chat history for current user
router.delete('/history', async (req, res) => {
  try {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : null;

    let whereClause = 'user_id = $1';
    let queryParams = [req.user.id];

    if (employeeId) {
      whereClause += ' AND employee_id = $2';
      queryParams.push(employeeId);
    }

    const result = await query(`
      DELETE FROM chat_messages 
      WHERE ${whereClause}
      RETURNING id
    `, queryParams);

    res.json({
      message: 'Chat history cleared successfully',
      deletedCount: result.rows.length
    });

  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      error: 'Failed to clear chat history',
      code: 'CLEAR_ERROR'
    });
  }
});

// =============================================================================
// TWO-STAGE AI RESPONSE SYSTEM
// =============================================================================

// Database schema for AI context
const DATABASE_SCHEMA = `
-- EMPLOYEES TABLE
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(100),
  job_title VARCHAR(255),
  risk_score INTEGER DEFAULT 0, -- 0-100 scale
  risk_level VARCHAR(20) DEFAULT 'Low', -- Low, Medium, High, Critical
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- VIOLATIONS TABLE  
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  type VARCHAR(100) NOT NULL, -- Policy Violation, Data Breach, etc.
  severity VARCHAR(20) NOT NULL, -- Low, Medium, High, Critical
  status VARCHAR(20) DEFAULT 'Active', -- Active, Resolved, Under Review
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- EMAIL COMMUNICATIONS TABLE
CREATE TABLE email_communications (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  sender_email VARCHAR(255),
  recipient_emails TEXT, -- JSON array of recipients
  subject VARCHAR(500),
  body_text TEXT,
  sent_at TIMESTAMP,
  risk_score INTEGER DEFAULT 0, -- 0-100 scale
  risk_flags TEXT[], -- Array of risk indicators
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- USERS TABLE (for authentication)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'analyst', -- admin, analyst, viewer
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CHAT MESSAGES TABLE
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  employee_id INTEGER REFERENCES employees(id), -- Optional context
  type VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

// System instructions for Stage 1 (Query Generation)
const STAGE1_SYSTEM_PROMPT = `
You are a SQL expert for a security monitoring system. Your job is to generate PostgreSQL queries based on user questions.

DATABASE SCHEMA:
${DATABASE_SCHEMA}

INSTRUCTIONS:
1. Analyze the user's question and generate appropriate SQL queries
2. Return ONLY valid PostgreSQL SQL statements 
3. Use proper JOINs when needed
4. Include relevant LIMIT clauses (default 10, max 50)
5. For aggregations, use appropriate GROUP BY
6. Handle both specific and general security questions
7. If employee context is provided, filter by that employee_id

RESPONSE FORMAT:
Return only the SQL query/queries, one per line. No explanations or markdown.

EXAMPLES:
User: "Show me high risk employees"
SELECT name, email, department, risk_score, risk_level FROM employees WHERE risk_level IN ('High', 'Critical') AND is_active = true ORDER BY risk_score DESC LIMIT 10;

User: "How many violations do we have?"
SELECT COUNT(*) as total_violations, severity, COUNT(*) FROM violations GROUP BY severity ORDER BY COUNT(*) DESC;

User: "Recent security incidents"
SELECT v.type, v.severity, v.description, e.name, v.created_at FROM violations v JOIN employees e ON v.employee_id = e.id WHERE v.created_at >= NOW() - INTERVAL '30 days' ORDER BY v.created_at DESC LIMIT 10;
`;

// System instructions for Stage 2 (Response Generation)
const STAGE2_SYSTEM_PROMPT = `
You are an AI security analyst assistant. Your job is to convert database query results into helpful, professional security reports.

INSTRUCTIONS:
1. Analyze the query results and original user question
2. Create a clear, actionable response in markdown format
3. Include relevant security insights and recommendations
4. Use appropriate emojis and formatting for readability
5. If no data found, provide helpful guidance
6. Focus on security implications and next steps

RESPONSE STYLE:
- Professional but approachable
- Use bullet points and clear sections
- Include risk assessments when relevant
- Provide actionable recommendations
- Use security terminology appropriately

FORMATTING:
- Use **bold** for important items
- Use • for bullet points
- Use appropriate emojis (🚨 ⚠️ ✅ 📊 etc.)
- Structure with clear headings when needed
`;

// Two-Stage AI Response Generation
async function generateTwoStageAIResponse(userMessage, employeeId, userId) {
  try {
    console.log(`🎯 Starting two-stage AI response for: "${userMessage}"`);
    console.log(`📋 Context - Employee ID: ${employeeId}, User ID: ${userId}`);

    // STAGE 1: Generate SQL queries
    console.log(`🔍 STAGE 1: Generating SQL queries...`);
    const stage1Input = {
      userMessage,
      employeeId,
      systemPrompt: STAGE1_SYSTEM_PROMPT
    };

    const sqlQueries = await callAIForSQLGeneration(stage1Input);
    console.log(`📝 Generated SQL queries:`, sqlQueries);

    // Execute the generated SQL queries
    console.log(`⚡ Executing generated SQL queries...`);
    const queryResults = await executeGeneratedQueries(sqlQueries);
    console.log(`📊 Query results:`, Object.keys(queryResults).map(key => `${key}: ${Array.isArray(queryResults[key]) ? queryResults[key].length + ' rows' : typeof queryResults[key]}`));

    // STAGE 2: Generate natural language response
    console.log(`🎨 STAGE 2: Generating natural language response...`);
    const stage2Input = {
      userMessage,
      queryResults,
      employeeId,
      systemPrompt: STAGE2_SYSTEM_PROMPT
    };

    const finalResponse = await callAIForResponseGeneration(stage2Input);
    console.log(`✅ Generated final response (${finalResponse.length} chars)`);

    return finalResponse;

  } catch (error) {
    console.error('🚨 Two-stage AI error:', error);
    return `I apologize, but I encountered an error while processing your request. ${error.message}`;
  }
}

// SQL Generation using AI Service
async function callAIForSQLGeneration(input) {
  return await generateSQLQueries(input);
}

// Execute Generated SQL Queries
async function executeGeneratedQueries(sqlQueries) {
  const results = {};
  
  for (let i = 0; i < sqlQueries.length; i++) {
    const sql = sqlQueries[i].trim();
    if (!sql) continue;
    
    try {
      console.log(`🔍 Executing query ${i + 1}: ${sql.substring(0, 100)}...`);
      const result = await query(sql);
      results[`query_${i + 1}`] = result.rows;
      console.log(`✅ Query ${i + 1} returned ${result.rows.length} rows`);
    } catch (error) {
      console.error(`❌ Error executing query ${i + 1}:`, error.message);
      results[`query_${i + 1}_error`] = error.message;
    }
  }
  
  return results;
}

// Response Generation using AI Service
async function callAIForResponseGeneration(input) {
  return await generateNaturalLanguageResponse(input);
}

module.exports = router; 