const natural = require('natural');
const sentiment = require('sentiment');
const OpenAI = require('openai');

/**
 * AI-Powered Email Risk Analysis Service
 * 
 * This service analyzes employee emails to assess security risks using:
 * - Natural Language Processing
 * - LLM-Powered Category Analysis
 * - Behavioral Pattern Analysis
 * - Anomaly Detection
 * - Risk Scoring Algorithms
 * - Office 365 Specific Analysis
 */

class EmailRiskAnalyzer {
  constructor() {
    this.sentiment = new sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize OpenAI for LLM analysis
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
    });
    
    // LLM Configuration
    this.llmConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.1, // Low temperature for consistent analysis
      maxTokens: 1000
    };
    
    // Risk patterns and keywords
    this.riskPatterns = {
      // Financial/Confidential Information
      financial: [
        'bank account', 'credit card', 'ssn', 'social security', 'routing number',
        'financial records', 'salary', 'bonus', 'quarterly results', 'revenue',
        'profit', 'budget', 'confidential', 'proprietary', 'trade secret',
        'invoice', 'payment', 'wire transfer', 'account number', 'tax return'
      ],
      
      // Data Exfiltration Indicators
      dataExfiltration: [
        'customer data', 'user database', 'employee records', 'source code',
        'backup', 'download', 'export', 'transfer', 'copy', 'share',
        'personal account', 'dropbox', 'google drive', 'onedrive',
        'zip file', 'encrypted file', 'usb drive', 'external drive',
        'cloud storage', 'file sharing', 'data dump', 'extract data'
      ],
      
      // External Communication Risk
      external: [
        'competitor', 'job interview', 'resignation', 'opportunity',
        'headhunter', 'recruiter', 'new position', 'leaving company',
        'other company', 'external partner', 'vendor', 'supplier'
      ],
      
      // Policy Violations
      policy: [
        'personal use', 'side business', 'freelance', 'moonlighting',
        'conflict of interest', 'insider trading', 'non-disclosure',
        'policy violation', 'against policy', 'not allowed', 'prohibited'
      ],
      
      // Urgent/Pressure Tactics
      urgency: [
        'urgent', 'asap', 'immediately', 'deadline', 'emergency',
        'time sensitive', 'critical', 'rush', 'priority',
        'last chance', 'expires today', 'act now'
      ],
      
      // Security Bypass Attempts
      security: [
        'bypass', 'workaround', 'alternative', 'unauthorized access',
        'permission', 'admin rights', 'password', 'credentials',
        'security bypass', 'access denied', 'permission denied'
      ],

      // Suspicious Attachments
      suspiciousAttachments: [
        'exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'js',
        'jar', 'zip', 'rar', '7z', 'encrypted', 'password protected'
      ],

      // Intellectual Property
      intellectualProperty: [
        'patent', 'trademark', 'copyright', 'intellectual property',
        'proprietary technology', 'trade secret', 'know-how',
        'research data', 'prototype', 'blueprint', 'design'
      ],

      // Compliance Issues
      compliance: [
        'hipaa', 'gdpr', 'sox', 'pci', 'compliance violation',
        'regulatory', 'audit', 'investigation', 'whistleblower',
        'legal action', 'lawsuit', 'settlement'
      ]
    };

    // Time-based risk factors
    this.timeRiskFactors = {
      afterHours: 1.5,    // 50% increase in risk
      weekends: 1.3,      // 30% increase in risk
      holidays: 1.7,      // 70% increase in risk
      lateNight: 2.0      // 100% increase in risk (11PM - 5AM)
    };

    // Domain risk levels
    this.domainRiskLevels = {
      high: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'],
      medium: ['protonmail.com', 'tutanota.com', 'guerrillamail.com'],
      low: [] // Company domains will be dynamically added
    };
  }

  /**
   * Main email analysis function - Enhanced with Database Threat Categories
   * @param {Object} email - Email object to analyze
   * @param {Object} employeeProfile - Employee's historical data
   * @returns {Object} Risk analysis results
   */
  async analyzeEmail(email, employeeProfile = {}) {
    const analysis = {
      emailId: email.id,
      riskScore: 0,
      riskLevel: 'Low',
      riskFactors: [],
      patterns: [],
      recommendations: [],
      violations: [],
      confidence: 0,
      analyzedAt: new Date().toISOString(),
      // Enhanced fields for database category analysis
      categoryAnalysis: [],
      detectionMethod: 'hybrid', // 'legacy', 'database', 'hybrid'
      databaseCategoriesUsed: false
    };

    try {
      console.log(`🔍 Enhanced email analysis starting for: ${email.subject || 'No subject'}`);

      // 🆕 ENHANCED: Fetch active threat categories from database
      let databaseCategories = [];
      try {
        const { query } = require('../utils/database');
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
            COALESCE(
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'keyword', ck.keyword,
                  'weight', ck.weight,
                  'isPhrase', ck.is_phrase,
                  'contextRequired', ck.context_required
                )
              ) FROM category_keywords ck WHERE ck.category_id = tc.id),
              '[]'::jsonb
            ) as keywords
          FROM threat_categories tc
          WHERE tc.is_active = true
          ORDER BY tc.base_risk_score DESC, tc.name ASC
        `);

        databaseCategories = categoriesResult.rows.map(row => ({
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

        if (databaseCategories.length > 0) {
          analysis.databaseCategoriesUsed = true;
          console.log(`📚 Loaded ${databaseCategories.length} database threat categories`);
        }
      } catch (dbError) {
        console.warn('⚠️ Could not fetch database categories, falling back to legacy analysis:', dbError.message);
        analysis.detectionMethod = 'legacy';
      }

      // 🆕 ENHANCED: Database Category Analysis (if available)
      if (databaseCategories.length > 0) {
        try {
          console.log('🤖 Running database category analysis...');
          const categoryResults = await this.analyzeWithCustomCategories(email, databaseCategories);
          
          if (categoryResults.length > 0) {
            analysis.categoryAnalysis = categoryResults;
            
            // 🔧 IMPROVED: Only consider categories with meaningful risk scores (>= 30)
            const significantResults = categoryResults.filter(result => 
              (result.finalRiskScore || result.riskScore || 0) >= 30
            );
            
            if (significantResults.length > 0) {
              // Add category-specific risk scores only for significant threats
              const categoryRiskScore = significantResults.reduce((total, result) => {
                return total + (result.finalRiskScore || result.riskScore || 0);
              }, 0);
              
              // 🔧 IMPROVED: Implement risk score normalization and contribution limits
              let normalizedCategoryScore;
              
              if (significantResults.length === 1) {
                // Single category: use 70% of its score
                normalizedCategoryScore = Math.round(categoryRiskScore * 0.7);
              } else if (significantResults.length <= 3) {
                // 2-3 categories: average and boost slightly  
                normalizedCategoryScore = Math.round((categoryRiskScore / significantResults.length) * 1.2);
              } else {
                // 4+ categories: average with diminishing returns
                normalizedCategoryScore = Math.round((categoryRiskScore / significantResults.length) * 1.1);
              }
              
              // Cap database category contribution at 60 points max
              normalizedCategoryScore = Math.min(60, normalizedCategoryScore);
              
              // Weight database analysis at 40% (reduced from 60%) for more conservative scoring
              analysis.riskScore += Math.round(normalizedCategoryScore * 0.4);
              
              // Add category-specific factors and violations only for significant results
              significantResults.forEach(result => {
                analysis.riskFactors.push(`${result.categoryName}: ${result.reasoning || 'Significant threat pattern detected'}`);
                
                if (result.violations && result.violations.length > 0) {
                  analysis.violations.push(...result.violations);
                }
                
                if (result.detectedPatterns && result.detectedPatterns.length > 0) {
                  analysis.patterns.push({
                    category: result.categoryName,
                    matches: result.detectedPatterns,
                    severity: result.categoryName.includes('Critical') ? 'Critical' : 'High',
                    source: 'database_category',
                    riskScore: result.finalRiskScore || result.riskScore
                  });
                }
                
                if (result.recommendations && result.recommendations.length > 0) {
                  analysis.recommendations.push(...result.recommendations);
                }
              });
              
              console.log(`✅ Database category analysis completed: ${significantResults.length}/${categoryResults.length} categories triggered (threshold >= 30)`);
            } else {
              console.log(`📊 Database category analysis completed: No significant threats detected (all scores < 30)`);
            }
          }
        } catch (categoryError) {
          console.error('❌ Error in database category analysis:', categoryError);
          analysis.riskFactors.push('Database category analysis error occurred');
        }
      }

      // EXISTING ANALYSIS METHODS (Enhanced with weighting)
      console.log('📊 Running legacy pattern analysis...');

      // 1. Content Analysis (weighted at 50% since database analysis is now more conservative)
      const contentRisk = this.analyzeContent(email);
      analysis.riskScore += Math.round(contentRisk.score * 0.5);
      analysis.riskFactors.push(...contentRisk.factors);
      analysis.patterns.push(...contentRisk.patterns.map(p => ({...p, source: 'legacy_pattern'})));
      analysis.violations.push(...contentRisk.violations);

      // 2. Recipient Analysis
      const recipientRisk = this.analyzeRecipients(email);
      analysis.riskScore += recipientRisk.score;
      analysis.riskFactors.push(...recipientRisk.factors);
      analysis.violations.push(...recipientRisk.violations);

      // 3. Timing Analysis
      const timingRisk = this.analyzeTiming(email);
      analysis.riskScore += timingRisk.score; // Changed from multiplication to addition
      analysis.riskFactors.push(...timingRisk.factors);

      // 4. Attachment Analysis
      const attachmentRisk = this.analyzeAttachments(email);
      analysis.riskScore += attachmentRisk.score;
      analysis.riskFactors.push(...attachmentRisk.factors);
      analysis.violations.push(...attachmentRisk.violations);

      // 5. Behavioral Analysis (compared to employee's normal patterns)
      const behavioralRisk = this.analyzeBehavioralPattern(email, employeeProfile);
      analysis.riskScore += behavioralRisk.score;
      analysis.riskFactors.push(...behavioralRisk.factors);

      // 6. Sentiment Analysis
      const sentimentRisk = this.analyzeSentiment(email);
      analysis.riskScore += sentimentRisk.score;
      analysis.riskFactors.push(...sentimentRisk.factors);

      // 7. Header Analysis (Office 365 specific)
      const headerRisk = this.analyzeHeaders(email);
      analysis.riskScore += headerRisk.score;
      analysis.riskFactors.push(...headerRisk.factors);
      analysis.violations.push(...headerRisk.violations);

      // 8. Data Loss Prevention Analysis
      const dlpRisk = this.analyzeDLP(email);
      analysis.riskScore += dlpRisk.score;
      analysis.riskFactors.push(...dlpRisk.factors);
      analysis.violations.push(...dlpRisk.violations);

      // 9. Calculate final risk level and confidence
      // Ensure riskScore is a valid integer between 0-100 for database constraint
      analysis.riskScore = this.validateAndFixRiskScore(analysis.riskScore);
      analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);
      analysis.confidence = this.calculateConfidence(analysis);

      // 🆕 ENHANCED: Adjust confidence based on detection methods used
      if (analysis.databaseCategoriesUsed && analysis.categoryAnalysis.length > 0) {
        analysis.confidence = Math.min(100, analysis.confidence + 15); // Boost confidence with database analysis
        analysis.detectionMethod = analysis.patterns.some(p => p.source === 'legacy_pattern') ? 'hybrid' : 'database';
      }

      // 10. Generate enhanced recommendations
      analysis.recommendations = this.generateEnhancedRecommendations(analysis);

      console.log(`🎯 Enhanced analysis completed: Score ${analysis.riskScore}, Method: ${analysis.detectionMethod}, Categories: ${analysis.categoryAnalysis.length}`);
      
      return analysis;

    } catch (error) {
      console.error('Error in enhanced email analysis:', error);
      analysis.riskFactors.push('Enhanced analysis error occurred');
      analysis.confidence = 0;
      analysis.detectionMethod = 'error';
      // Ensure we return a valid score even on error
      analysis.riskScore = 0;
      return analysis;
    }
  }

  /**
   * Validate and fix risk score to ensure database constraint compliance
   * Risk score must be an integer between 0-100 for PostgreSQL constraint
   */
  validateAndFixRiskScore(score) {
    // Handle null, undefined, or NaN values
    if (score === null || score === undefined || isNaN(score)) {
      return 0;
    }

    // Ensure it's a number
    const numericScore = typeof score === 'number' ? score : parseFloat(score);
    
    // Handle invalid conversions
    if (isNaN(numericScore)) {
      return 0;
    }

    // Round to integer and clamp to 0-100 range
    return Math.round(Math.max(0, Math.min(100, numericScore)));
  }

  /**
   * Analyze email headers for security indicators
   */
  analyzeHeaders(email) {
    const result = {
      score: 0,
      factors: [],
      violations: []
    };

    try {
      // Check for SPF, DKIM, DMARC failures (would be in headers if available)
      if (email.headers) {
        if (email.headers['Authentication-Results']) {
          const authResults = email.headers['Authentication-Results'].toLowerCase();
          if (authResults.includes('spf=fail')) {
            result.score += 15;
            result.factors.push('SPF authentication failed');
            result.violations.push('Email Authentication Failure');
          }
          if (authResults.includes('dkim=fail')) {
            result.score += 15;
            result.factors.push('DKIM authentication failed');
            result.violations.push('Email Authentication Failure');
          }
          if (authResults.includes('dmarc=fail')) {
            result.score += 20;
            result.factors.push('DMARC authentication failed');
            result.violations.push('Email Authentication Failure');
          }
        }

        // Check for suspicious message routes
        if (email.headers['Received']) {
          const received = Array.isArray(email.headers['Received']) 
            ? email.headers['Received'] 
            : [email.headers['Received']];
          
          const suspiciousRoutes = received.some(route => 
            route.includes('tor') || 
            route.includes('proxy') || 
            route.includes('suspicious')
          );

          if (suspiciousRoutes) {
            result.score += 25;
            result.factors.push('Email routed through suspicious networks');
            result.violations.push('Suspicious Email Routing');
          }
        }
      }

      // Check sender reputation based on domain
      if (email.sender && email.sender.email) {
        const domain = email.sender.email.split('@')[1];
        if (this.domainRiskLevels.high.includes(domain)) {
          result.score += 10;
          result.factors.push(`High-risk email domain: ${domain}`);
        }
      }

    } catch (error) {
      console.error('Error analyzing headers:', error);
    }

    return result;
  }

  /**
   * Data Loss Prevention Analysis
   */
  analyzeDLP(email) {
    const result = {
      score: 0,
      factors: [],
      violations: []
    };

    try {
      const content = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase();

      // Credit Card Pattern Detection
      const creditCardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
      if (creditCardPattern.test(content)) {
        result.score += 30;
        result.factors.push('Credit card number detected');
        result.violations.push('Credit Card Information Disclosure');
      }

      // SSN Pattern Detection
      const ssnPattern = /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g;
      if (ssnPattern.test(content)) {
        result.score += 35;
        result.factors.push('Social Security Number detected');
        result.violations.push('PII Disclosure');
      }

      // Bank Account Pattern
      const bankAccountPattern = /\b(?:account|acct)[\s#]*\d{8,17}\b/gi;
      if (bankAccountPattern.test(content)) {
        result.score += 25;
        result.factors.push('Bank account number detected');
        result.violations.push('Financial Information Disclosure');
      }

      // Email Pattern (potential data leakage)
      const emailPattern = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = content.match(emailPattern);
      if (emailMatches && emailMatches.length > 10) {
        result.score += 20;
        result.factors.push(`Large number of email addresses detected (${emailMatches.length})`);
        result.violations.push('Potential Email List Disclosure');
      }

      // IP Address Pattern
      const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
      const ipMatches = content.match(ipPattern);
      if (ipMatches && ipMatches.length > 3) {
        result.score += 15;
        result.factors.push('Multiple IP addresses detected');
        result.violations.push('Network Information Disclosure');
      }

      // Database Connection String Pattern
      const dbPattern = /(server|host|database|uid|pwd|password)\s*=\s*[^;\s]+/gi;
      if (dbPattern.test(content)) {
        result.score += 40;
        result.factors.push('Database connection information detected');
        result.violations.push('Database Credential Disclosure');
      }

      // API Key Pattern
      const apiKeyPattern = /(api[_-]?key|token|secret)["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/gi;
      if (apiKeyPattern.test(content)) {
        result.score += 35;
        result.factors.push('API key or token detected');
        result.violations.push('API Credential Disclosure');
      }

    } catch (error) {
      console.error('Error in DLP analysis:', error);
    }

    return result;
  }

  /**
   * Enhanced content analysis with better pattern matching
   */
  analyzeContent(email) {
    const result = {
      score: 0,
      factors: [],
      patterns: [],
      violations: []
    };

    try {
      const content = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase();
      const tokens = this.tokenizer.tokenize(content) || [];

      // Analyze against each risk pattern category
      Object.entries(this.riskPatterns).forEach(([category, patterns]) => {
        const matches = patterns.filter(pattern => 
          content.includes(pattern.toLowerCase())
        );

        if (matches.length > 0) {
          const categoryScore = this.calculateCategoryScore(category, matches.length);
          result.score += categoryScore;
          result.patterns.push({
            category,
            matches,
            severity: this.getCategorySeverity(category)
          });

          matches.forEach(match => {
            result.factors.push(`${category}: "${match}"`);
            
            // Add specific violations
            if (category === 'financial' || category === 'intellectualProperty') {
              result.violations.push('Confidential Information Disclosure');
            } else if (category === 'dataExfiltration') {
              result.violations.push('Data Exfiltration Attempt');
            } else if (category === 'compliance') {
              result.violations.push('Compliance Violation');
            } else if (category === 'security') {
              result.violations.push('Security Policy Violation');
            }
          });
        }
      });

      // Analyze text sentiment and urgency
      const sentimentScore = this.sentiment.analyze(content);
      if (sentimentScore.score < -3) {
        result.score += 10;
        result.factors.push('Negative sentiment detected');
      }

    } catch (error) {
      console.error('Error analyzing content:', error);
    }

    return result;
  }

  /**
   * Extract JSON from LLM response, handling markdown code blocks
   * @param {string} content - Raw LLM response content
   * @returns {object} Parsed JSON object
   */
  extractJSONFromLLMResponse(content) {
    try {
      // First, try to parse as pure JSON
      return JSON.parse(content);
    } catch (error) {
      // If that fails, try to extract JSON from markdown code blocks
      try {
        // Look for ```json...``` or ```...``` blocks
        const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
        const match = content.match(jsonBlockRegex);
        
        if (match && match[1]) {
          return JSON.parse(match[1].trim());
        }
        
        // Try to find JSON-like content between { and }
        const jsonContentRegex = /\{[\s\S]*\}/;
        const jsonMatch = content.match(jsonContentRegex);
        
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // If no JSON found, return a default structure
        console.warn('Could not extract JSON from LLM response, using fallback');
        return {
          risk_score: 0,
          confidence: 0,
          reasoning: 'LLM response parsing failed',
          detected_patterns: [],
          violations: [],
          recommendations: []
        };
        
      } catch (extractionError) {
        console.error('Failed to extract JSON from LLM response:', extractionError.message);
        console.error('Raw content:', content.substring(0, 200) + '...');
        
        // Return safe fallback
        return {
          risk_score: 0,
          confidence: 0,
          reasoning: 'LLM response parsing failed completely',
          detected_patterns: [],
          violations: [],
          recommendations: []
        };
      }
    }
  }

  /**
   * LLM-Powered Category Analysis
   * Uses sophisticated AI to analyze email content for specific threat categories
   */
  async analyzeCategoryWithLLM(email, category) {
    try {
      const content = `Subject: ${email.subject || 'No subject'}\n\nBody: ${email.bodyText || email.body || 'No body content'}`;
      
      // Create category-specific analysis prompt
      const prompt = this.createCategoryPrompt(category, content);
      
      console.log(`🤖 LLM analyzing email for category: ${category.name}`);
      
      const response = await this.openai.chat.completions.create({
        model: this.llmConfig.model,
        temperature: this.llmConfig.temperature,
        max_tokens: this.llmConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: "You are a cybersecurity expert analyzing employee emails for security threats. Provide precise, actionable analysis. ALWAYS respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user", 
            content: prompt
          }
        ]
      });

      // 🔧 FIXED: Use robust JSON extraction instead of direct JSON.parse
      const analysis = this.extractJSONFromLLMResponse(response.choices[0].message.content);
      
      return {
        categoryId: category.id,
        categoryName: category.name,
        riskScore: analysis.risk_score || 0,
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || '',
        detectedPatterns: analysis.detected_patterns || [],
        recommendations: analysis.recommendations || [],
        violations: analysis.violations || [],
        llmAnalysis: true
      };

    } catch (error) {
      console.error(`Error in LLM category analysis for ${category.name}:`, error);
      return {
        categoryId: category.id,
        categoryName: category.name,
        riskScore: 0,
        confidence: 0,
        reasoning: 'LLM analysis failed',
        detectedPatterns: [],
        recommendations: [],
        violations: [],
        llmAnalysis: false
      };
    }
  }

  /**
   * Create category-specific prompts for LLM analysis
   */
  createCategoryPrompt(category, emailContent) {
    const basePrompt = `
Analyze this email for threats related to "${category.name}":
Category Description: ${category.description}
Severity Level: ${category.severity}
Base Risk Score: ${category.baseRiskScore}

EMAIL CONTENT:
${emailContent}

ANALYSIS TASK:
1. Determine if this email contains indicators of "${category.name}"
2. Consider context, intent, and subtle indicators beyond simple keyword matching
3. Account for false positives (normal business communication that might contain similar words)
4. Evaluate the severity and immediacy of any threats detected

Respond with JSON in this exact format:
{
  "risk_score": [MUST be whole number integer 0-100, NO decimals],
  "confidence": [MUST be whole number integer 0-100, NO decimals],
  "reasoning": "[detailed explanation of analysis]",
  "detected_patterns": ["pattern1", "pattern2"],
  "violations": ["violation1", "violation2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

CRITICAL: risk_score and confidence MUST be integers (0, 1, 2, ..., 100). 
DO NOT use decimal numbers like 67.5 or 89.3. Use whole numbers only.`;

    // Add category-specific guidance
    if (category.name.toLowerCase().includes('data exfiltration')) {
      return basePrompt + `\n\nSPECIFIC FOCUS:
- Look for attempts to export, download, or transfer sensitive data
- Consider external recipients, personal accounts, cloud storage mentions
- Evaluate data volume indicators and urgency patterns
- Distinguish between legitimate data sharing and potential theft`;
    }
    
    if (category.name.toLowerCase().includes('intellectual property')) {
      return basePrompt + `\n\nSPECIFIC FOCUS:
- Identify mentions of proprietary information, trade secrets, source code
- Look for competitor-related communications
- Evaluate research data, design files, patent information sharing
- Consider the recipient context and business justification`;
    }

    if (category.name.toLowerCase().includes('expense fraud')) {
      return basePrompt + `\n\nSPECIFIC FOCUS:
- Detect suspicious expense claims, duplicate receipts, inflated amounts
- Look for personal expenses being claimed as business expenses
- Identify vendor manipulation or kickback schemes
- Consider submission timing and approval bypass attempts`;
    }

    if (category.name.toLowerCase().includes('pre-termination')) {
      return basePrompt + `\n\nSPECIFIC FOCUS:
- Identify signs of employee planning to leave (job search, resignation hints)
- Look for data hoarding or access pattern changes
- Detect competitor communication or external job opportunities
- Consider behavioral changes and meeting decline patterns`;
    }

    return basePrompt;
  }

  /**
   * Enhanced category analysis combining keywords and LLM
   */
  async analyzeWithCustomCategories(email, categories) {
    const results = [];
    
    for (const category of categories) {
      if (!category.isActive) continue;
      
      try {
        // Determine analysis method based on category configuration
        const useLLM = this.shouldUseLLMForCategory(category);
        
        let analysis;
        if (useLLM && this.isLLMAvailable()) {
          // Use sophisticated LLM analysis for complex categories
          analysis = await this.analyzeCategoryWithLLM(email, category);
        } else {
          // Fall back to keyword-based analysis
          analysis = this.analyzeKeywordBased(email, category);
        }
        
        // Apply category-specific risk multipliers
        analysis.finalRiskScore = this.applyRiskMultipliers(
          analysis.riskScore, 
          category.riskMultipliers, 
          email
        );
        
        // Check if score exceeds thresholds
        analysis.triggersAlert = analysis.finalRiskScore >= category.alertThreshold;
        analysis.triggersInvestigation = analysis.finalRiskScore >= category.investigationThreshold;
        analysis.triggersCritical = analysis.finalRiskScore >= category.criticalThreshold;
        
        if (analysis.finalRiskScore > 0) {
          results.push(analysis);
        }
        
      } catch (error) {
        console.error(`Error analyzing category ${category.name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Determine if category should use LLM analysis
   */
  shouldUseLLMForCategory(category) {
    // Use LLM for complex behavioral and contextual categories
    const llmCategories = [
      'data exfiltration',
      'intellectual property',
      'pre-termination indicators',
      'competitor communication',
      'expense fraud',
      'vendor kickbacks'
    ];
    
    return llmCategories.some(llmCat => 
      category.name.toLowerCase().includes(llmCat.toLowerCase())
    );
  }

  /**
   * Keyword-based analysis for simpler categories
   */
  analyzeKeywordBased(email, category) {
    const content = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase();
    let score = 0;
    const detectedPatterns = [];
    const matchedKeywords = [];
    
    // Analyze keywords if available
    if (category.keywords && category.keywords.length > 0) {
      category.keywords.forEach(keywordObj => {
        const keyword = typeof keywordObj === 'string' ? keywordObj : keywordObj.keyword;
        const weight = typeof keywordObj === 'string' ? 1.0 : (keywordObj.weight || 1.0);
        
        if (content.includes(keyword.toLowerCase())) {
          score += category.baseRiskScore * weight * 0.1; // Scale factor
          matchedKeywords.push(keyword);
          detectedPatterns.push(`Keyword match: "${keyword}"`);
        }
      });
    }
    
    return {
      categoryId: category.id,
      categoryName: category.name,
      riskScore: Math.min(score, 100),
      confidence: matchedKeywords.length > 0 ? 75 : 0,
      reasoning: `Keyword analysis detected ${matchedKeywords.length} matching terms`,
      detectedPatterns,
      recommendations: score > 50 ? ['Review email context', 'Verify business justification'] : [],
      violations: score > 70 ? [`${category.name} policy violation`] : [],
      llmAnalysis: false,
      matchedKeywords
    };
  }

  /**
   * Apply risk multipliers based on email context
   */
  applyRiskMultipliers(baseScore, multipliers, email) {
    let finalScore = baseScore;
    
    if (multipliers && typeof multipliers === 'object') {
      // Time-based multipliers
      if (multipliers.after_hours && this.isAfterHours(email.timestamp)) {
        finalScore *= multipliers.after_hours;
      }
      
      // External recipient multiplier
      if (multipliers.external_recipient && this.hasExternalRecipients(email)) {
        finalScore *= multipliers.external_recipient;
      }
      
      // Frequency multiplier (would need historical data)
      if (multipliers.frequency) {
        // This would require analyzing email frequency patterns
        // For now, apply a moderate increase for high-frequency categories
        finalScore *= 1.1;
      }
    }
    
    return Math.min(finalScore, 100);
  }

  /**
   * Check if LLM is available and configured
   */
  isLLMAvailable() {
    return !!(process.env.OPENAI_API_KEY && 
             process.env.OPENAI_API_KEY !== 'your-api-key-here');
  }

  /**
   * Helper: Check if email was sent after hours
   */
  isAfterHours(timestamp) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const hour = date.getHours();
    return hour < 8 || hour > 18; // Outside 8 AM - 6 PM
  }

  /**
   * Helper: Check if email has external recipients
   */
  hasExternalRecipients(email) {
    try {
      // This would need to be enhanced with actual domain checking
      const externalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const recipients = email.recipients || [];
      
      return recipients.some(recipient => {
        // Handle different recipient formats safely
        let emailAddress = '';
        
        if (typeof recipient === 'string') {
          emailAddress = recipient;
        } else if (recipient && typeof recipient === 'object') {
          emailAddress = recipient.email || recipient.emailAddress || recipient.address || '';
        }
        
        // Only check if we have a valid email string
        if (typeof emailAddress === 'string' && emailAddress.length > 0) {
          return externalDomains.some(domain => emailAddress.toLowerCase().includes(domain));
        }
        
        return false;
      });
    } catch (error) {
      console.warn('Error checking external recipients:', error.message);
      return false;
    }
  }

  /**
   * Enhanced recipient analysis
   */
  analyzeRecipients(email) {
    const result = {
      score: 0,
      factors: [],
      violations: []
    };

    try {
      const recipients = email.recipients || [];
      
      if (recipients.length === 0) return result;

      // Analyze external recipients
      const externalRecipients = recipients.filter(r => {
        const email = typeof r === 'string' ? r : (r && r.email ? r.email : '');
        return email && !email.includes('@company.com'); // Should be dynamic based on company domain
      });

      if (externalRecipients.length > 0) {
        result.score += externalRecipients.length * 5;
        result.factors.push(`${externalRecipients.length} external recipients`);

        // Check for high-risk domains
        const highRiskDomains = externalRecipients.filter(r => {
          const email = typeof r === 'string' ? r : (r && r.email ? r.email : '');
          return email && this.domainRiskLevels.high.some(domain => email.includes(domain));
        });

        if (highRiskDomains.length > 0) {
          result.score += highRiskDomains.length * 10;
          result.factors.push(`Recipients from high-risk domains: ${highRiskDomains.length}`);
          result.violations.push('Communication with High-Risk Domains');
        }
      }

      // Mass email detection
      if (recipients.length > 50) {
        result.score += 20;
        result.factors.push(`Mass email with ${recipients.length} recipients`);
        result.violations.push('Mass Email Distribution');
      }

      // BCC usage analysis
      const bccRecipients = recipients.filter(r => r.type === 'bcc');
      if (bccRecipients.length > 5) {
        result.score += 15;
        result.factors.push(`High number of BCC recipients: ${bccRecipients.length}`);
        result.violations.push('Suspicious BCC Usage');
      }

    } catch (error) {
      console.error('Error analyzing recipients:', error);
    }

    return result;
  }

  /**
   * Enhanced attachment analysis
   */
  analyzeAttachments(email) {
    const result = {
      score: 0,
      factors: [],
      violations: []
    };

    try {
      const attachments = email.attachments || [];
      
      if (attachments.length === 0) return result;

      attachments.forEach(attachment => {
        const filename = attachment.filename.toLowerCase();
        const fileExtension = filename.split('.').pop();

        // Check for suspicious file types
        if (this.riskPatterns.suspiciousAttachments.includes(fileExtension)) {
          result.score += 25;
          result.factors.push(`Suspicious attachment: ${attachment.filename}`);
          result.violations.push('Suspicious Attachment');
        }

        // Check for large files
        if (attachment.size > 10 * 1024 * 1024) { // 10MB
          result.score += 15;
          result.factors.push(`Large attachment: ${attachment.filename} (${Math.round(attachment.size / 1024 / 1024)}MB)`);
        }

        // Check for password-protected or encrypted files
        if (filename.includes('password') || filename.includes('encrypted')) {
          result.score += 20;
          result.factors.push(`Encrypted/password-protected file: ${attachment.filename}`);
          result.violations.push('Encrypted File Transfer');
        }

        // Multiple attachments risk
        if (attachments.length > 5) {
          result.score += 10;
          result.factors.push(`Multiple attachments: ${attachments.length} files`);
        }
      });

    } catch (error) {
      console.error('Error analyzing attachments:', error);
    }

    return result;
  }

  /**
   * Calculate category-specific scores
   */
  calculateCategoryScore(category, matchCount) {
    const baseScores = {
      financial: 20,
      dataExfiltration: 25,
      intellectualProperty: 22,
      compliance: 30,
      security: 18,
      external: 10,
      policy: 15,
      urgency: 8,
      suspiciousAttachments: 25
    };

    return (baseScores[category] || 10) * Math.min(matchCount, 3);
  }

  /**
   * Get category severity level
   */
  getCategorySeverity(category) {
    const severityMap = {
      financial: 'High',
      dataExfiltration: 'Critical',
      intellectualProperty: 'High',
      compliance: 'Critical',
      security: 'High',
      external: 'Medium',
      policy: 'Medium',
      urgency: 'Low',
      suspiciousAttachments: 'High'
    };

    return severityMap[category] || 'Medium';
  }

  /**
   * Analyze behavioral patterns compared to employee's normal behavior
   */
  analyzeBehavioralPattern(email, employeeProfile) {
    const result = { score: 0, factors: [] };
    
    if (!employeeProfile.emailBehavior) {
      return result; // No baseline to compare against
    }

    const profile = employeeProfile.emailBehavior;

    // Check for unusual volume
    if (email.volumeDeviation && email.volumeDeviation > 2) { // 2 standard deviations
      result.score += 20;
      result.factors.push({
        type: 'behavioral',
        category: 'volume_anomaly',
        score: 20,
        description: `Unusual email volume detected (${email.volumeDeviation.toFixed(1)}x normal)`
      });
    }

    // Check for unusual external communication
    const externalRatio = email.recipients.filter(r => !this.isInternalEmail(r.email)).length / email.recipients.length;
    if (externalRatio > (profile.averageExternalRatio || 0.1) * 3) {
      result.score += 25;
      result.factors.push({
        type: 'behavioral',
        category: 'external_anomaly',
        score: 25,
        description: `Unusual external communication pattern detected`
      });
    }

    return result;
  }

  /**
   * Analyze email sentiment for stress, urgency, or deception indicators
   */
  analyzeSentiment(email) {
    const result = { score: 0, factors: [] };
    const content = `${email.subject} ${email.bodyText}`;
    const sentimentResult = this.sentiment.analyze(content);

    // Very negative sentiment might indicate stress or malicious intent
    if (sentimentResult.score < -5) {
      result.score += 10;
      result.factors.push({
        type: 'sentiment',
        category: 'negative',
        score: 10,
        description: `Highly negative sentiment detected (score: ${sentimentResult.score})`,
        sentimentScore: sentimentResult.score
      });
    }

    // Check for deception indicators
    const deceptionWords = ['honestly', 'believe me', 'trust me', 'to be honest', 'frankly'];
    const deceptionCount = deceptionWords.filter(word => 
      content.toLowerCase().includes(word)
    ).length;

    if (deceptionCount > 0) {
      result.score += deceptionCount * 5;
      result.factors.push({
        type: 'sentiment',
        category: 'deception_indicators',
        score: deceptionCount * 5,
        description: `Potential deception indicators detected`,
        count: deceptionCount
      });
    }

    return result;
  }

  /**
   * Detect suspicious patterns in content
   */
  detectSuspiciousPatterns(content, tokens) {
    const result = { score: 0, factors: [] };

    // Check for base64 encoded content (possible data exfiltration)
    const base64Pattern = /[A-Za-z0-9+/]{40,}={0,2}/g;
    const base64Matches = content.match(base64Pattern);
    if (base64Matches && base64Matches.length > 0) {
      result.score += 30;
      result.factors.push({
        type: 'pattern',
        category: 'encoded_content',
        score: 30,
        description: 'Potential encoded data detected',
        matches: base64Matches.length
      });
    }

    // Check for excessive capitalization (shouting/urgency)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      result.score += 10;
      result.factors.push({
        type: 'pattern',
        category: 'excessive_caps',
        score: 10,
        description: 'Excessive capitalization detected (urgency indicator)',
        ratio: capsRatio
      });
    }

    // Check for URL shorteners (potential phishing)
    const shortUrlPattern = /(bit\.ly|tinyurl|t\.co|goo\.gl|short\.link)/gi;
    if (shortUrlPattern.test(content)) {
      result.score += 15;
      result.factors.push({
        type: 'pattern',
        category: 'url_shorteners',
        score: 15,
        description: 'URL shorteners detected (potential phishing risk)'
      });
    }

    return result;
  }

  /**
   * Helper methods
   */
  getCategoryWeight(category) {
    const weights = {
      financial: 8,
      dataExfiltration: 10,
      external: 6,
      policy: 7,
      urgency: 4,
      security: 9
    };
    return weights[category] || 5;
  }

  isInternalEmail(email) {
    // Check against company domain(s)
    const companyDomains = ['company.com', 'securewatch.com']; // Configure based on company
    return companyDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`));
  }

  isSuspiciousDomain(email) {
    const suspiciousDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return suspiciousDomains.includes(domain);
  }

  calculateRiskLevel(riskScore) {
    if (riskScore >= 80) return 'Critical';
    if (riskScore >= 60) return 'High';
    if (riskScore >= 40) return 'Medium';
    return 'Low';
  }

  calculateConfidence(analysis) {
    let confidence = 50; // Base confidence
    
    if (analysis.patterns.length > 0) confidence += 20;
    if (analysis.violations.length > 0) confidence += 25;
    if (analysis.riskFactors.length > 3) confidence += 15;
    
    return Math.min(confidence, 95);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.riskScore >= 80) {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider blocking sender/recipients');
    }

    if (analysis.violations.includes('Data Exfiltration Attempt')) {
      recommendations.push('Review data access permissions');
      recommendations.push('Monitor employee data download activity');
    }

    if (analysis.violations.includes('Confidential Information Disclosure')) {
      recommendations.push('Implement additional DLP controls');
      recommendations.push('Provide data handling training');
    }

    if (analysis.riskFactors.some(f => f.includes('external'))) {
      recommendations.push('Review external communication policies');
    }

    return recommendations;
  }

  /**
   * Enhanced recommendations based on analysis results
   */
  generateEnhancedRecommendations(analysis) {
    const recommendations = [];

    // Add recommendations from database categories
    analysis.categoryAnalysis.forEach(categoryResult => {
      if (categoryResult.recommendations && categoryResult.recommendations.length > 0) {
        recommendations.push({
          type: 'category_specific',
          category: categoryResult.categoryName,
          priority: categoryResult.severity,
          action: categoryResult.reasoning || 'Review email content',
          description: categoryResult.reasoning || 'Consider this category for further investigation'
        });
      }
    });

    // Add general recommendations based on overall risk
    if (analysis.riskScore >= 80) {
      recommendations.push({
        type: 'investigate',
        priority: 'high',
        action: 'Comprehensive security review required',
        description: 'Employee shows consistently high risk behavior patterns'
      });
    }

    const externalComms = analysis.riskFactors.some(f => f.includes('external'));
    if (externalComms) {
      recommendations.push({
        type: 'policy',
        priority: 'medium',
        action: 'Review external communication policies with employee',
        description: 'High frequency of external communications detected'
      });
    }

    // Add recommendations from legacy patterns
    if (analysis.patterns.length > 0) {
      analysis.patterns.forEach(pattern => {
        if (pattern.severity === 'Critical') {
          recommendations.push({
            type: 'pattern',
            category: pattern.category,
            priority: 'critical',
            action: 'Investigate this specific pattern',
            description: `Highly suspicious pattern detected: ${pattern.matches.join(', ')}`
          });
        } else if (pattern.severity === 'High') {
          recommendations.push({
            type: 'pattern',
            category: pattern.category,
            priority: 'high',
            action: 'Review this pattern',
            description: `Suspicious pattern detected: ${pattern.matches.join(', ')}`
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * Batch analyze multiple emails for an employee
   */
  async analyzeEmployeeEmails(employeeId, emails, timeframe = '30d') {
    const analyses = [];
    let totalRiskScore = 0;
    const riskTrends = [];
    const behaviorProfile = await this.buildBehaviorProfile(employeeId, timeframe);

    for (const email of emails) {
      const analysis = await this.analyzeEmail(email, { emailBehavior: behaviorProfile });
      analyses.push(analysis);
      totalRiskScore += analysis.riskScore;
    }

    const avgRiskScore = emails.length > 0 ? totalRiskScore / emails.length : 0;

    return {
      employeeId,
      totalEmails: emails.length,
      avgRiskScore: Math.round(avgRiskScore * 100) / 100,
      riskLevel: this.calculateRiskLevel(avgRiskScore),
      analyses,
      behaviorProfile,
      summary: this.generateEmployeeSummary(analyses),
      recommendations: this.generateEmployeeRecommendations(analyses, avgRiskScore)
    };
  }

  /**
   * Build behavior profile for an employee
   */
  async buildBehaviorProfile(employeeId, timeframe) {
    // This would typically query historical email data
    // For now, return a default profile structure
    return {
      averageEmailsPerDay: 15,
      averageExternalRatio: 0.15,
      commonSendTimes: [9, 10, 14, 15, 16], // Hours
      topRecipients: [],
      topKeywords: [],
      riskScoreHistory: []
    };
  }

  generateEmployeeSummary(analyses) {
    const highRiskEmails = analyses.filter(a => a.riskScore >= 60).length;
    const flaggedCategories = new Set();
    
    analyses.forEach(analysis => {
      analysis.riskFactors.forEach(factor => {
        flaggedCategories.add(factor.category);
      });
    });

    return {
      highRiskEmails,
      totalRiskFactors: analyses.reduce((sum, a) => sum + a.riskFactors.length, 0),
      flaggedCategories: Array.from(flaggedCategories),
      mostCommonRisks: this.getMostCommonRisks(analyses)
    };
  }

  getMostCommonRisks(analyses) {
    const riskCounts = {};
    analyses.forEach(analysis => {
      analysis.riskFactors.forEach(factor => {
        riskCounts[factor.category] = (riskCounts[factor.category] || 0) + 1;
      });
    });

    return Object.entries(riskCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  generateEmployeeRecommendations(analyses, avgRiskScore) {
    const recommendations = [];
    
    if (avgRiskScore > 60) {
      recommendations.push({
        type: 'investigate',
        priority: 'high',
        action: 'Comprehensive security review required',
        description: 'Employee shows consistently high risk behavior patterns'
      });
    }

    const externalComms = analyses.filter(a => 
      a.riskFactors.some(f => f.category === 'external')
    ).length;
    
    if (externalComms > analyses.length * 0.3) {
      recommendations.push({
        type: 'policy',
        priority: 'medium',
        action: 'Review external communication policies with employee',
        description: 'High frequency of external communications detected'
      });
    }

    return recommendations;
  }

  /**
   * Analyze timing patterns for risk assessment
   */
  analyzeTiming(email) {
    const result = {
      score: 0,
      factors: []
    };

    try {
      const sentAt = new Date(email.sentAt);
      const hour = sentAt.getHours();
      const dayOfWeek = sentAt.getDay();

      // Check for after-hours activity (before 8 AM or after 6 PM)
      if (hour < 8 || hour > 18) {
        result.score += 3;
        result.factors.push(`Email sent after hours: ${hour}:00`);
      }

      // Check for weekend activity
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        result.score += 2;
        result.factors.push('Email sent on weekend');
      }

      return result;
    } catch (error) {
      console.error('Error analyzing timing:', error);
      return result;
    }
  }

}

module.exports = new EmailRiskAnalyzer(); 