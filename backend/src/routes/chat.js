const express = require('express');
const { query } = require('../utils/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All chat routes require authentication
router.use(requireAuth);

// Get chat history for current user
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : null;

    let whereClause = 'user_id = $1';
    let queryParams = [req.user.id];

    if (employeeId) {
      whereClause += ' AND employee_id = $2';
      queryParams.push(employeeId);
    }

    const result = await query(`
      SELECT 
        cm.id,
        cm.type,
        cm.content,
        cm.created_at,
        cm.employee_id,
        e.name as employee_name,
        e.email as employee_email
      FROM chat_messages cm
      LEFT JOIN employees e ON cm.employee_id = e.id
      WHERE ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT $${queryParams.length + 1}
    `, [...queryParams, limit]);

    res.json({
      messages: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        createdAt: row.created_at,
        employee: row.employee_id ? {
          id: row.employee_id,
          name: row.employee_name,
          email: row.employee_email
        } : null
      })).reverse() // Reverse to show oldest first
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      code: 'CHAT_HISTORY_ERROR'
    });
  }
});

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send chat message to AI assistant
 *     description: Send a message to the AI security assistant and receive a context-aware response
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message content to send to AI assistant
 *                 example: "What are the current security risks?"
 *               employeeId:
 *                 type: integer
 *                 description: Optional employee ID for context-specific responses
 *                 example: 1
 *           example:
 *             message: "Tell me about Sarah Mitchell's risk level"
 *             employeeId: 1
 *     responses:
 *       200:
 *         description: Chat message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userMessage:
 *                   $ref: '#/components/schemas/ChatMessage'
 *                 aiMessage:
 *                   $ref: '#/components/schemas/ChatMessage'
 *             example:
 *               userMessage:
 *                 id: 1
 *                 type: user
 *                 content: "Tell me about Sarah Mitchell's risk level"
 *                 createdAt: "2025-01-27T20:30:57.597Z"
 *               aiMessage:
 *                 id: 2
 *                 type: assistant
 *                 content: "Sarah Mitchell currently has a critical risk level with a score of 92/100. This is based on recent behavioral patterns and security events. I recommend increased monitoring and potential investigation."
 *                 createdAt: "2025-01-27T20:30:57.598Z"
 *       400:
 *         description: Invalid request or missing message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Message content is required
 *               code: MISSING_MESSAGE
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
// Send chat message and get AI response
router.post('/message', async (req, res) => {
  try {
    const { message, employeeId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message content is required',
        code: 'MISSING_MESSAGE'
      });
    }

    // Validate employee ID if provided
    let validatedEmployeeId = null;
    if (employeeId) {
      const employeeResult = await query(
        'SELECT id FROM employees WHERE id = $1 AND is_active = true',
        [employeeId]
      );
      
      if (employeeResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Invalid employee ID',
          code: 'INVALID_EMPLOYEE'
        });
      }
      validatedEmployeeId = employeeId;
    }

    // Store user message
    const userMessageResult = await query(`
      INSERT INTO chat_messages (user_id, employee_id, type, content)
      VALUES ($1, $2, 'user', $3)
      RETURNING id, created_at
    `, [req.user.id, validatedEmployeeId, message.trim()]);

    // Generate AI response based on message content
    console.log(`🤖 Generating AI response for: "${message.trim()}" (employee: ${validatedEmployeeId})`);
    const aiResponse = await generateAIResponse(message.trim(), validatedEmployeeId, req.user.id);
    console.log(`✅ AI response generated: ${aiResponse.substring(0, 100)}...`);

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

// AI Response Generation Function
async function generateAIResponse(userMessage, employeeId, userId) {
  try {
    const lowerMessage = userMessage.toLowerCase();
    console.log(`🧠 AI analyzing message: "${lowerMessage}"`);

    // Check for specific patterns
    if (lowerMessage.includes('highest risk') || lowerMessage.includes('top risk') || 
        lowerMessage.includes('most risky') || lowerMessage.includes('show me the highest')) {
      console.log('📊 Matched: highest risk employees query');
    } else if (lowerMessage.includes('security threats') || lowerMessage.includes('current threats')) {
      console.log('🛡️ Matched: security threats query');
    } else if (lowerMessage.includes('all employees') || lowerMessage.includes('list employees')) {
      console.log('👥 Matched: employee list query');
    } else if (employeeId) {
      console.log('👤 Matched: employee-specific query');
    } else {
      console.log('❓ No specific pattern matched, checking general patterns...');
    }

    // Context-aware responses based on employee ID
    if (employeeId) {
      const employeeResult = await query(`
        SELECT 
          e.name, e.email, e.department, e.risk_score, e.risk_level,
          COUNT(v.id) as violation_count,
          COUNT(CASE WHEN v.status = 'Active' THEN 1 END) as active_violations
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id
        WHERE e.id = $1
        GROUP BY e.id, e.name, e.email, e.department, e.risk_score, e.risk_level
      `, [employeeId]);

      if (employeeResult.rows.length > 0) {
        const employee = employeeResult.rows[0];
        
        if (lowerMessage.includes('risk') || lowerMessage.includes('score')) {
          return `${employee.name} currently has a ${employee.risk_level.toLowerCase()} risk level with a score of ${employee.risk_score}/100. This is based on recent behavioral patterns and security events. ${employee.risk_score > 70 ? 'I recommend increased monitoring and potential investigation.' : 'The risk level appears manageable with standard monitoring.'}`;
        }
        
        if (lowerMessage.includes('violation') || lowerMessage.includes('incident')) {
          return `${employee.name} has ${employee.violation_count} total violations, with ${employee.active_violations} currently active. ${employee.active_violations > 0 ? 'I recommend reviewing the active violations and taking appropriate action.' : 'No active violations require immediate attention.'}`;
        }
        
        if (lowerMessage.includes('recommend') || lowerMessage.includes('action')) {
          if (employee.risk_score > 80) {
            return `For ${employee.name}, I recommend: 1) Immediate investigation of recent activities, 2) Temporary access restrictions, 3) Direct supervisor notification, 4) Enhanced monitoring for the next 30 days.`;
          } else if (employee.risk_score > 60) {
            return `For ${employee.name}, I recommend: 1) Review recent security events, 2) Schedule security awareness training, 3) Monitor for 2 weeks, 4) Document any policy violations.`;
          } else {
            return `${employee.name} appears to be following security policies well. Standard monitoring procedures should be sufficient.`;
          }
        }
      }
    }

    // General security-related responses
    if (lowerMessage.includes('highest risk') || lowerMessage.includes('top risk') || 
        lowerMessage.includes('most risky') || lowerMessage.includes('show me the highest')) {
      const highRiskResult = await query(`
        SELECT 
          name, email, department, risk_score, risk_level,
          COUNT(v.id) as violation_count
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id AND v.status = 'Active'
        WHERE e.is_active = true
        GROUP BY e.id, e.name, e.email, e.department, e.risk_score, e.risk_level
        ORDER BY e.risk_score DESC
        LIMIT 5
      `);
      
      if (highRiskResult.rows.length > 0) {
        let response = "**🚨 Top 5 Highest Risk Employees:**\n\n";
        highRiskResult.rows.forEach((emp, index) => {
          response += `${index + 1}. **${emp.name}** (${emp.department})\n`;
          response += `   • Risk Score: **${emp.risk_score}/100** (${emp.risk_level})\n`;
          response += `   • Active Violations: ${emp.violation_count}\n`;
          response += `   • Email: ${emp.email}\n\n`;
        });
        response += "💡 **Recommendation:** Prioritize investigation of Critical/High risk employees and review their recent activities.";
        return response;
      }
      return "No high-risk employees found in the system.";
    }

    if (lowerMessage.includes('high risk') || lowerMessage.includes('critical')) {
      const highRiskResult = await query(`
        SELECT COUNT(*) as count FROM employees 
        WHERE risk_level IN ('Critical', 'High') AND is_active = true
      `);
      return `There are currently ${highRiskResult.rows[0].count} employees with high or critical risk levels. I recommend prioritizing review of critical risk employees and investigating any recent violations.`;
    }

    if (lowerMessage.includes('security threats') || lowerMessage.includes('current threats') || 
        lowerMessage.includes('threats') || lowerMessage.includes('security issues')) {
      const threatsResult = await query(`
        SELECT 
          COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_employees,
          COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_risk_employees,
          COUNT(CASE WHEN v.status = 'Active' AND v.severity = 'Critical' THEN 1 END) as critical_violations,
          COUNT(CASE WHEN v.status = 'Active' THEN 1 END) as active_violations
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id
        WHERE e.is_active = true
      `);
      
      const threats = threatsResult.rows[0];
      let response = "**🛡️ Current Security Threat Assessment:**\n\n";
      response += `• **Critical Risk Employees:** ${threats.critical_employees}\n`;
      response += `• **High Risk Employees:** ${threats.high_risk_employees}\n`;
      response += `• **Critical Violations:** ${threats.critical_violations}\n`;
      response += `• **Active Violations:** ${threats.active_violations}\n\n`;
      
      if (threats.critical_employees > 0 || threats.critical_violations > 0) {
        response += "⚠️ **Immediate Action Required:** Review critical risk employees and violations.";
      } else if (threats.high_risk_employees > 0) {
        response += "📊 **Monitor Closely:** High-risk employees require increased monitoring.";
      } else {
        response += "✅ **Security Status:** All threats are manageable with standard monitoring.";
      }
      
      return response;
    }

    if (lowerMessage.includes('violation') || lowerMessage.includes('alert')) {
      const violationResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
          COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical
        FROM violations
      `);
      return `Current violation status: ${violationResult.rows[0].active} active violations out of ${violationResult.rows[0].total} total. ${violationResult.rows[0].critical} are marked as critical severity and require immediate attention.`;
    }

    if (lowerMessage.includes('department') || lowerMessage.includes('team')) {
      const deptResult = await query(`
        SELECT 
          department,
          COUNT(*) as emp_count,
          AVG(risk_score) as avg_risk,
          COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_count
        FROM employees 
        WHERE is_active = true AND department IS NOT NULL
        GROUP BY department
        ORDER BY avg_risk DESC
        LIMIT 3
      `);
      
      if (deptResult.rows.length > 0) {
        const topDept = deptResult.rows[0];
        return `The ${topDept.department} department has the highest average risk score (${Math.round(topDept.avg_risk)}/100) with ${topDept.critical_count} critical risk employees. I recommend increased focus on this department's security training and monitoring.`;
      }
    }

    if (lowerMessage.includes('trend') || lowerMessage.includes('pattern')) {
      return `Based on recent data analysis, I've identified several trends: 1) After-hours activity correlates with higher risk scores, 2) External email volume spikes often precede violations, 3) Employees with recent department changes show increased risk. Would you like me to analyze specific patterns for any employee?`;
    }

    if (lowerMessage.includes('all employees') || lowerMessage.includes('list employees') || 
        lowerMessage.includes('employee list') || lowerMessage.includes('show employees')) {
      const employeesResult = await query(`
        SELECT 
          name, department, risk_score, risk_level,
          COUNT(v.id) as violation_count
        FROM employees e
        LEFT JOIN violations v ON e.id = v.employee_id AND v.status = 'Active'
        WHERE e.is_active = true
        GROUP BY e.id, e.name, e.department, e.risk_score, e.risk_level
        ORDER BY e.risk_score DESC
        LIMIT 10
      `);
      
      if (employeesResult.rows.length > 0) {
        let response = "**👥 Employee Risk Overview (Top 10):**\n\n";
        employeesResult.rows.forEach((emp, index) => {
          const riskIcon = emp.risk_level === 'Critical' ? '🔴' : 
                          emp.risk_level === 'High' ? '🟠' : 
                          emp.risk_level === 'Medium' ? '🟡' : '🟢';
          response += `${riskIcon} **${emp.name}** (${emp.department}) - ${emp.risk_score}/100 (${emp.risk_level})\n`;
        });
        response += `\n📊 Showing top 10 employees by risk score. Total active employees: ${employeesResult.rows.length}`;
        return response;
      }
      return "No employees found in the system.";
    }

    if (lowerMessage.includes('recent activity') || lowerMessage.includes('latest') || 
        lowerMessage.includes('recent violations') || lowerMessage.includes('new violations')) {
      const recentResult = await query(`
        SELECT 
          v.type, v.severity, v.description, e.name, e.department,
          v.created_at
        FROM violations v
        JOIN employees e ON v.employee_id = e.id
        WHERE v.status = 'Active'
        ORDER BY v.created_at DESC
        LIMIT 5
      `);
      
      if (recentResult.rows.length > 0) {
        let response = "**📋 Recent Security Violations:**\n\n";
        recentResult.rows.forEach((violation, index) => {
          const severityIcon = violation.severity === 'Critical' ? '🚨' : 
                              violation.severity === 'High' ? '⚠️' : 
                              violation.severity === 'Medium' ? '⚡' : 'ℹ️';
          response += `${severityIcon} **${violation.type}** - ${violation.name} (${violation.department})\n`;
          response += `   ${violation.description}\n`;
          response += `   ${new Date(violation.created_at).toLocaleDateString()}\n\n`;
        });
        return response;
      }
      return "No recent violations found.";
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return `🤖 **SecurityWatch AI Assistant**

I can help you with comprehensive security analysis and monitoring:

**📊 Employee Analysis:**
• "Show me the highest risk employees"
• "List all employees" 
• "What's [employee name]'s risk level?"

**🛡️ Security Overview:**
• "What are the current security threats?"
• "Show recent violations"
• "Department security overview"

**📈 Risk Assessment:**
• "Analyze employee behavior patterns"
• "Risk trends and patterns"
• "Security recommendations"

**💬 Interactive Queries:**
Just ask me about any employee, department, or security concern in natural language!

Try: "Show me critical risk employees" or "What security issues need attention?"`;
    }

    // Default responses for general queries
    const defaultResponses = [
      "I'm here to help with security analysis. You can ask me about employee risk levels, violations, or specific security concerns.",
      "As your security assistant, I can analyze employee behavior patterns and provide recommendations. What would you like to know?",
      "I can help you investigate security concerns, analyze risk patterns, or provide recommendations for specific employees. How can I assist?",
      "I'm designed to help with security monitoring and analysis. Ask me about any employee or security-related concerns.",
      "I can provide insights on employee risk levels, violation trends, and security recommendations. What specific information do you need?"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];

  } catch (error) {
    console.error('AI response generation error:', error);
    return "I'm experiencing some technical difficulties. Please try your question again, or contact your system administrator if the issue persists.";
  }
}

module.exports = router; 