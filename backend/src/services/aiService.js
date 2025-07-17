const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

// AI Service Configuration
const AI_CONFIG = {
  model: 'gpt-4o-mini', // Cost-effective model for SQL generation
  maxTokens: 2000,
  temperature: 0.1, // Low temperature for consistent SQL generation
  responseModel: 'gpt-4o-mini', // Model for response generation
  responseMaxTokens: 1500,
  responseTemperature: 0.3 // Slightly higher for more natural responses
};

/**
 * Generate SQL queries from user input using OpenAI
 * @param {Object} input - Contains userMessage, employeeId, systemPrompt
 * @returns {Array} Array of SQL query strings
 */
async function generateSQLQueries(input) {
  try {
    console.log(`🤖 Calling OpenAI for SQL generation...`);
    
    const { userMessage, employeeId, systemPrompt } = input;
    
    // Prepare context for AI
    let contextMessage = `User Question: "${userMessage}"`;
    if (employeeId) {
      contextMessage += `\nEmployee Context: Analyzing employee ID ${employeeId}`;
    }
    
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: contextMessage
        }
      ]
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log(`📝 OpenAI SQL Response:`, response);
    
    // Parse SQL queries from response
    const queries = parseSQLQueries(response);
    console.log(`✅ Parsed ${queries.length} SQL queries`);
    
    return queries;

  } catch (error) {
    console.error('🚨 OpenAI SQL generation error:', error.message);
    
    // Fallback to keyword-based queries if AI fails
    console.log('🔄 Falling back to keyword-based SQL generation...');
    return generateFallbackSQLQueries(input);
  }
}

/**
 * Generate natural language response from query results using OpenAI
 * @param {Object} input - Contains userMessage, queryResults, employeeId, systemPrompt
 * @returns {string} Natural language response
 */
async function generateNaturalLanguageResponse(input) {
  try {
    console.log(`🤖 Calling OpenAI for response generation...`);
    
    const { userMessage, queryResults, employeeId, systemPrompt } = input;
    
    // Prepare data summary for AI
    const dataSummary = summarizeQueryResults(queryResults);
    
    let contextMessage = `Original Question: "${userMessage}"\n\n`;
    contextMessage += `Database Query Results:\n${dataSummary}`;
    
    if (employeeId) {
      contextMessage += `\n\nEmployee Context: Analysis requested for employee ID ${employeeId}`;
    }

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.responseModel,
      max_tokens: AI_CONFIG.responseMaxTokens,
      temperature: AI_CONFIG.responseTemperature,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: contextMessage
        }
      ]
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log(`✅ Generated natural language response (${response.length} chars)`);
    return response;

  } catch (error) {
    console.error('🚨 OpenAI response generation error:', error.message);
    
    // Fallback to template-based response if AI fails
    console.log('🔄 Falling back to template-based response generation...');
    return generateFallbackResponse(input);
  }
}

/**
 * Parse SQL queries from AI response
 * @param {string} response - Raw AI response
 * @returns {Array} Array of clean SQL queries
 */
function parseSQLQueries(response) {
  const queries = [];
  
  // Split by common SQL delimiters and clean up
  const lines = response.split('\n');
  let currentQuery = '';
  
  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Skip empty lines and comments
    if (!cleanLine || cleanLine.startsWith('--') || cleanLine.startsWith('/*')) {
      continue;
    }
    
    // If line starts with SELECT, UPDATE, INSERT, DELETE - new query
    if (/^(SELECT|UPDATE|INSERT|DELETE|WITH)\s/i.test(cleanLine)) {
      if (currentQuery) {
        queries.push(currentQuery.trim());
      }
      currentQuery = cleanLine;
    } else {
      currentQuery += ' ' + cleanLine;
    }
  }
  
  // Add final query
  if (currentQuery) {
    queries.push(currentQuery.trim());
  }
  
  // Clean up queries - remove markdown formatting, ensure they end properly
  return queries
    .filter(q => q.length > 10) // Filter out very short queries
    .map(q => q.replace(/```sql|```/g, '').trim())
    .map(q => q.endsWith(';') ? q : q + ';');
}

/**
 * Summarize query results for AI context
 * @param {Object} queryResults - Database query results
 * @returns {string} Summary of results
 */
function summarizeQueryResults(queryResults) {
  let summary = '';
  
  for (const [key, data] of Object.entries(queryResults)) {
    if (key.includes('error')) {
      summary += `${key}: ${data}\n`;
      continue;
    }
    
    if (Array.isArray(data)) {
      summary += `${key}: ${data.length} records found\n`;
      
      if (data.length > 0) {
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        summary += `  Columns: ${columns.join(', ')}\n`;
        
        // Add sample data for context (first 3 rows max)
        const sampleData = data.slice(0, 3).map(row => {
          return Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        });
        
        summary += `  Sample Data:\n${sampleData.map(row => `    - ${row}`).join('\n')}\n`;
      }
    } else {
      summary += `${key}: ${JSON.stringify(data)}\n`;
    }
    summary += '\n';
  }
  
  return summary;
}

/**
 * Fallback SQL generation when AI fails
 * @param {Object} input - Original input
 * @returns {Array} Array of fallback SQL queries
 */
function generateFallbackSQLQueries(input) {
  const message = input.userMessage.toLowerCase();
  const queries = [];
  
  if (message.includes('high risk') || message.includes('critical')) {
    queries.push("SELECT id, name, email, department, risk_score, risk_level FROM employees WHERE risk_level IN ('High', 'Critical') AND is_active = true ORDER BY risk_score DESC LIMIT 10;");
  } else if (message.includes('violation') || message.includes('incident')) {
    queries.push("SELECT v.id, v.type, v.severity, v.status, v.description, e.name as employee_name, v.created_at FROM violations v LEFT JOIN employees e ON v.employee_id = e.id ORDER BY v.created_at DESC LIMIT 10;");
  } else if (message.includes('email')) {
    queries.push("SELECT COUNT(*) as total_emails, COUNT(CASE WHEN risk_score > 70 THEN 1 END) as high_risk_emails, AVG(risk_score) as avg_risk_score FROM email_communications WHERE created_at >= NOW() - INTERVAL '30 days';");
  } else {
    // Default overview
    queries.push("SELECT COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_employees, COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_risk_employees, COUNT(*) as total_employees FROM employees WHERE is_active = true;");
  }
  
  if (input.employeeId) {
    queries.push(`SELECT id, name, email, department, risk_score, risk_level FROM employees WHERE id = ${input.employeeId};`);
  }
  
  return queries;
}

/**
 * Fallback response generation when AI fails
 * @param {Object} input - Original input with query results
 * @returns {string} Fallback response
 */
function generateFallbackResponse(input) {
  const { queryResults } = input;
  let response = "I found some information for you:\n\n";
  
  for (const [key, data] of Object.entries(queryResults)) {
    if (key.includes('error') || !Array.isArray(data) || data.length === 0) {
      continue;
    }
    
    const firstRow = data[0];
    
    if (firstRow.risk_level) {
      response += `**High Risk Employees:** Found ${data.length} employees\n`;
      data.slice(0, 3).forEach(emp => {
        response += `• ${emp.name} (${emp.risk_level} risk)\n`;
      });
    } else if (firstRow.type) {
      response += `**Security Violations:** Found ${data.length} incidents\n`;
      data.slice(0, 3).forEach(violation => {
        response += `• ${violation.type} (${violation.severity})\n`;
      });
    } else if (firstRow.total_employees !== undefined) {
      const stats = firstRow;
      response += `**Security Overview:**\n`;
      response += `• Total Employees: ${stats.total_employees}\n`;
      response += `• Critical Risk: ${stats.critical_employees || 0}\n`;
      response += `• High Risk: ${stats.high_risk_employees || 0}\n`;
    }
    response += '\n';
  }
  
  if (response === "I found some information for you:\n\n") {
    response = "I'm here to help with security analysis. You can ask about employees, violations, or security status.";
  }
  
  return response;
}

/**
 * Check if AI service is available
 * @returns {boolean} True if AI service is configured
 */
function isAIServiceAvailable() {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-api-key-here';
}

module.exports = {
  generateSQLQueries,
  generateNaturalLanguageResponse,
  isAIServiceAvailable,
  AI_CONFIG
}; 