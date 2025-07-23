const crypto = require('crypto');

/**
 * Optimized Email Risk & Compliance Analyzer
 * 
 * Implements cost-effective, hierarchical email analysis with compliance assessment:
 * 1. Fast rules-based pre-filtering (eliminates ~90% of emails)
 * 2. Lightweight pattern & compliance matching (eliminates ~80% of remaining)
 * 3. Batch LLM analysis with compliance focus (only for high-risk emails)
 * 4. Smart caching and pattern recognition
 * 5. Regulatory compliance assessment (GDPR, SOX, HIPAA, PCI DSS)
 * 6. Internal policy evaluation based on employee compliance profiles
 */

class OptimizedEmailAnalyzer {
  constructor() {
    this.patternCache = new Map();
    this.batchQueue = [];
    this.batchSize = 10;
    this.processingStats = {
      totalProcessed: 0,
      rulesFiltered: 0,
      patternFiltered: 0,
      llmProcessed: 0,
      cached: 0,
      costSaved: 0,
      complianceViolations: 0
    };
    
    // Initialize caches
    this.threatCategories = null;
    this.lastCategoryUpdate = null;
    this.complianceRegulations = null;
    this.compliancePolicies = null;
    this.complianceProfiles = null;
    this.lastComplianceUpdate = null;
  }

  /**
   * Main analysis entry point - optimized pipeline with compliance
   */
  async analyzeEmail(email, employeeProfile = {}) {
    console.log(`🔍 Optimized compliance analysis for: ${email.subject?.substring(0, 60) || 'No subject'}`);
    
    this.processingStats.totalProcessed++;
    
    try {
      // Ensure compliance framework is loaded
      await this.ensureComplianceFramework();
      
      // Stage 1: Fast Rules-Based Pre-filtering (1ms)
      const rulesResult = this.fastRulesAnalysis(email, employeeProfile);
      
      // Stage 2: Compliance Pre-screening (2ms)
      const compliancePrescreen = await this.compliancePrescreen(email, employeeProfile);
      
      // Combine security and compliance results
      const combinedResult = this.combineSecurityAndCompliance(rulesResult, compliancePrescreen);
      
      if (combinedResult.confidence >= 0.8 || (combinedResult.securityRiskScore <= 20 && combinedResult.complianceRiskScore <= 30)) {
        console.log(`✅ Rules+Compliance sufficient: Security ${combinedResult.securityRiskScore}, Compliance ${combinedResult.complianceRiskScore}`);
        this.processingStats.rulesFiltered++;
        return this.formatFinalResult(combinedResult, 'rules_compliance_only');
      }

      // Stage 3: Pattern & Compliance Analysis (10ms)
      const patternResult = await this.patternAnalysis(email, combinedResult);
      const detailedCompliance = await this.detailedComplianceAnalysis(email, employeeProfile, patternResult);
      
      const enhancedResult = this.combinePatternAndCompliance(patternResult, detailedCompliance);
      
      if (enhancedResult.confidence >= 0.7 || (enhancedResult.securityRiskScore <= 40 && enhancedResult.complianceRiskScore <= 50)) {
        console.log(`✅ Pattern+Compliance sufficient: Security ${enhancedResult.securityRiskScore}, Compliance ${enhancedResult.complianceRiskScore}`);
        this.processingStats.patternFiltered++;
        return this.formatFinalResult(enhancedResult, 'pattern_compliance_based');
      }

      // Stage 4: Check Cache for Similar Emails
      const cacheKey = this.generateEmailSignature(email);
      const cachedResult = this.patternCache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        console.log(`🎯 Using cached compliance analysis for similar email pattern`);
        this.processingStats.cached++;
        return this.adaptCachedResult(cachedResult, email, enhancedResult);
      }

      // Stage 5: Smart LLM Decision with Compliance Focus
      if (this.shouldUseLLM(email, employeeProfile, enhancedResult)) {
        console.log(`🤖 High-risk email - queueing for LLM compliance analysis`);
        const llmResult = await this.intelligentLLMAnalysisWithCompliance(email, enhancedResult, employeeProfile);
        
        // Cache the result for future similar emails
        this.patternCache.set(cacheKey, {
          ...llmResult,
          timestamp: Date.now(),
          signature: cacheKey
        });
        
        this.processingStats.llmProcessed++;
        return this.formatFinalResult(llmResult, 'llm_compliance_enhanced');
      }

      // Default: Enhanced pattern + compliance result
      console.log(`✅ Pattern+Compliance final: Security ${enhancedResult.securityRiskScore}, Compliance ${enhancedResult.complianceRiskScore}`);
      return this.formatFinalResult(enhancedResult, 'pattern_compliance_enhanced');
      
    } catch (error) {
      console.error('Error in optimized compliance analysis:', error);
      return this.getFallbackResult(email, error);
    }
  }

  /**
   * Stage 1: Fast Rules-Based Analysis (eliminates ~90% of emails)
   */
  fastRulesAnalysis(email, employeeProfile = {}) {
    const analysis = {
      riskScore: 0,
      confidence: 0.9,
      riskFactors: [],
      patterns: [],
      violations: [],
      method: 'rules_based'
    };

    const subject = (email.subject || '').toLowerCase();
    const bodyText = (email.bodyText || '').toLowerCase();
    const content = `${subject} ${bodyText}`.substring(0, 1000); // Limit for performance

    // Quick exit for obviously safe emails
    if (this.isObviouslySafe(email, content)) {
      analysis.confidence = 0.95;
      return analysis;
    }

    // High-risk indicators (immediate LLM candidates)
    const highRiskPatterns = [
      { pattern: /\b(password|credential|login|secret|api[_\s]?key)\b/i, score: 25, factor: 'Sensitive credentials mentioned' },
      { pattern: /\b(confidential|proprietary|classified|nda)\b/i, score: 20, factor: 'Confidential content markers' },
      { pattern: /\b(competitor|rival|competing)\b/i, score: 15, factor: 'Competitor references' },
      { pattern: /\b(resignation|quit|leaving|terminate)\b/i, score: 20, factor: 'Employment termination indicators' },
      { pattern: /\b(download|backup|copy|export|extract)\b.*\b(database|data|file)\b/i, score: 30, factor: 'Data extraction activity' }
    ];

    // Medium-risk indicators
    const mediumRiskPatterns = [
      { pattern: /\b(urgent|immediate|asap|emergency)\b/i, score: 10, factor: 'Urgency pressure' },
      { pattern: /\b(offer|opportunity|deal|proposal)\b/i, score: 8, factor: 'Business opportunity' },
      { pattern: /\b(meeting|call|discussion)\b.*\b(external|outside|client)\b/i, score: 12, factor: 'External communications' }
    ];

    // Check patterns
    [...highRiskPatterns, ...mediumRiskPatterns].forEach(({ pattern, score, factor }) => {
      if (pattern.test(content)) {
        analysis.riskScore += score;
        analysis.riskFactors.push(factor);
        analysis.patterns.push({
          type: 'keyword_match',
          pattern: pattern.source,
          severity: score >= 20 ? 'high' : score >= 10 ? 'medium' : 'low',
          source: 'rules_engine'
        });
      }
    });

    // Check recipients and attachments
    const recipientRisk = this.analyzeRecipientsRisk(email);
    const attachmentRisk = this.analyzeAttachmentsRisk(email);
    const timingRisk = this.analyzeTimingRisk(email);

    analysis.riskScore += recipientRisk.score + attachmentRisk.score + timingRisk.score;
    analysis.riskFactors.push(...recipientRisk.factors, ...attachmentRisk.factors, ...timingRisk.factors);

    // Adjust confidence based on patterns found
    if (analysis.patterns.length > 0) {
      analysis.confidence = Math.min(0.9, 0.6 + (analysis.patterns.length * 0.1));
    }

    return analysis;
  }

  /**
   * Quick check for obviously safe emails
   */
  isObviouslySafe(email, content) {
    const safePatterns = [
      /^(re:|fwd:|meeting|calendar|invitation)/i,
      /\b(newsletter|update|notification|reminder)\b/i,
      /\b(thank you|thanks|congratulations|welcome)\b/i
    ];

    const isInternal = this.isInternalEmail(email);
    const isShort = content.length < 100;
    const isSafePattern = safePatterns.some(pattern => pattern.test(content));
    
    return isInternal && isShort && isSafePattern;
  }

  /**
   * Stage 2: Pattern & Keyword Analysis
   */
  async patternAnalysis(email, baseResult) {
    const analysis = { ...baseResult };
    
    // Load threat categories if needed
    await this.ensureThreatCategories();
    
    if (!this.threatCategories.length) {
      return analysis;
    }

    const content = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase();
    
    // Check against database categories using keyword matching
    this.threatCategories.forEach(category => {
      const categoryScore = this.calculateCategoryMatch(content, category);
      
      if (categoryScore > 15) { // Threshold for relevance
        analysis.riskScore += Math.round(categoryScore * 0.3); // Weight pattern analysis
        analysis.riskFactors.push(`${category.name} indicators detected`);
        analysis.patterns.push({
          type: 'category_match',
          categoryName: category.name,
          score: categoryScore,
          keywords: category.keywords.filter(k => content.includes(k.keyword.toLowerCase())),
          source: 'database_categories'
        });
      }
    });

    // Enhance confidence based on category matches
    const significantMatches = analysis.patterns.filter(p => p.score > 20).length;
    if (significantMatches > 0) {
      analysis.confidence = Math.min(0.85, analysis.confidence + (significantMatches * 0.1));
    }

    return analysis;
  }

  /**
   * Calculate category match using keyword scoring and database risk scores
   */
  calculateCategoryMatch(content, category) {
    let score = 0;
    let matchedKeywords = 0;

    category.keywords.forEach(keywordObj => {
      if (content.includes(keywordObj.keyword.toLowerCase())) {
        score += keywordObj.weight || 10;
        matchedKeywords++;
      }
    });

    // Apply base risk score multiplier from database
    if (matchedKeywords > 0) {
      const baseMultiplier = (category.baseRiskScore || 50) / 50; // Normalize to 1.0
      score *= baseMultiplier;
      
      // Severity multiplier
      const severityMultipliers = { 'Critical': 1.5, 'High': 1.2, 'Medium': 1.0, 'Low': 0.8 };
      score *= severityMultipliers[category.severity] || 1.0;
    }

    // Bonus for multiple keyword matches
    if (matchedKeywords >= 3) {
      score *= 1.5;
    } else if (matchedKeywords >= 2) {
      score *= 1.2;
    }

    return Math.min(score, 75); // Increased cap for database-weighted scores
  }

  /**
   * Stage 3: Intelligent LLM Analysis (batch processing)
   */
  async intelligentLLMAnalysis(email, baseResult) {
    try {
      // Add to batch queue for cost efficiency
      this.batchQueue.push({ email, baseResult });
      
      // Process batch if queue is full or for high-priority emails
      if (this.batchQueue.length >= this.batchSize || this.isHighPriority(email)) {
        return await this.processBatch();
      }
      
      // For now, return enhanced pattern result with LLM placeholder
      const analysis = { ...baseResult };
      analysis.riskScore = Math.min(100, analysis.riskScore + 20); // Boost for LLM candidacy
      analysis.confidence = Math.min(0.95, analysis.confidence + 0.1);
      analysis.method = 'llm_queued';
      
      return analysis;
      
    } catch (error) {
      console.error('Error in LLM analysis:', error);
      return baseResult;
    }
  }

  /**
   * Process batch of emails with single LLM call
   */
  async processBatch() {
    if (this.batchQueue.length === 0) return null;

    console.log(`🤖 Processing LLM batch of ${this.batchQueue.length} emails`);
    
    try {
      const openai = require('openai');
      const client = new openai({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Prepare batch prompt
      const batchPrompt = this.prepareBatchPrompt(this.batchQueue);
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a security analyst. Analyze emails for policy violations and return JSON array with email_id, risk_score (0-100), and top_violations.'
          },
          {
            role: 'user',
            content: batchPrompt
          }
        ],
        temperature: 0.1
      });

      const batchResults = this.parseBatchResponse(response.choices[0].message.content);
      
      // Clear batch queue
      const processedBatch = [...this.batchQueue];
      this.batchQueue = [];
      
      // Return result for the first email (others cached)
      return this.enhanceWithBatchResult(processedBatch[0], batchResults[0]);
      
    } catch (error) {
      console.error('Batch LLM processing failed:', error);
      
      // Fallback: return enhanced pattern result
      const firstEmail = this.batchQueue[0];
      this.batchQueue = [];
      return firstEmail.baseResult;
    }
  }

  /**
   * Prepare batch prompt for multiple emails
   */
  prepareBatchPrompt(batch) {
    const emailSummaries = batch.map((item, index) => {
      const email = item.email;
      return `
EMAIL_${index}:
Subject: ${email.subject || 'No subject'}
From: ${email.sender?.email || 'Unknown'}
Recipients: ${(email.recipients || []).length} recipients
Content: ${(email.bodyText || '').substring(0, 300)}...
Current Risk Factors: ${item.baseResult.riskFactors.join(', ')}
`;
    }).join('\n---\n');

    return `Analyze these ${batch.length} emails for security policy violations:

${emailSummaries}

Return JSON array: [{"email_id": 0, "risk_score": 85, "top_violations": ["Data Exfiltration", "Unauthorized Communication"]}, ...]

Focus on: data exfiltration, unauthorized sharing, competitor communication, policy violations.`;
  }

  /**
   * Determine if email should use expensive LLM analysis
   */
  shouldUseLLM(email, employeeProfile, patternResult) {
    // High-risk indicators that warrant LLM analysis
    const riskThreshold = 45;
    const hasHighRiskPatterns = patternResult.patterns.some(p => p.severity === 'high');
    const isHighRiskEmployee = (employeeProfile.riskScore || 0) >= 70;
    const hasExternalRecipients = this.hasExternalRecipients(email);
    const hasAttachments = (email.attachments || []).length > 0;
    
    return (
      patternResult.riskScore >= riskThreshold ||
      hasHighRiskPatterns ||
      isHighRiskEmployee ||
      (hasExternalRecipients && hasAttachments) ||
      this.isHighPriority(email)
    );
  }

  /**
   * Risk analysis helpers
   */
  analyzeRecipientsRisk(email) {
    const result = { score: 0, factors: [] };
    const recipients = email.recipients || [];
    
    if (recipients.length > 10) {
      result.score += 15;
      result.factors.push('Large recipient list');
    }
    
    if (this.hasExternalRecipients(email)) {
      result.score += 20;
      result.factors.push('External recipients detected');
    }
    
    return result;
  }

  analyzeAttachmentsRisk(email) {
    const result = { score: 0, factors: [] };
    const attachments = email.attachments || [];
    
    if (attachments.length > 0) {
      result.score += 10;
      result.factors.push(`${attachments.length} attachment(s)`);
      
      // Check for risky file types
      const riskyExtensions = ['.zip', '.rar', '.exe', '.bat', '.sql', '.csv'];
      const hasRiskyFiles = attachments.some(att => 
        riskyExtensions.some(ext => (att.filename || '').toLowerCase().endsWith(ext))
      );
      
      if (hasRiskyFiles) {
        result.score += 20;
        result.factors.push('High-risk file types detected');
      }
    }
    
    return result;
  }

  analyzeTimingRisk(email) {
    const result = { score: 0, factors: [] };
    
    if (!email.sentAt) return result;
    
    const sentDate = new Date(email.sentAt);
    const hour = sentDate.getHours();
    const isWeekend = sentDate.getDay() === 0 || sentDate.getDay() === 6;
    
    // After hours (6 PM - 8 AM) or weekend
    if (hour >= 18 || hour <= 8 || isWeekend) {
      result.score += 15;
      result.factors.push('Sent outside business hours');
    }
    
    return result;
  }

  /**
   * Utility methods
   */
  generateEmailSignature(email) {
    const content = `${email.subject || ''} ${(email.bodyText || '').substring(0, 200)}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
  }

  isCacheValid(cachedResult) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - cachedResult.timestamp) < maxAge;
  }

  adaptCachedResult(cachedResult, email, patternResult) {
    return {
      ...patternResult,
      riskScore: Math.min(100, patternResult.riskScore + (cachedResult.riskScore * 0.3)),
      confidence: Math.max(cachedResult.confidence, patternResult.confidence),
      method: 'cached_pattern',
      riskFactors: [...patternResult.riskFactors, 'Similar pattern detected'],
      analyzedAt: new Date().toISOString()
    };
  }

  isHighPriority(email) {
    const priorityKeywords = ['urgent', 'confidential', 'resignation', 'termination', 'competitor'];
    const content = `${email.subject || ''} ${email.bodyText || ''}`.toLowerCase();
    return priorityKeywords.some(keyword => content.includes(keyword));
  }

  hasExternalRecipients(email) {
    try {
      const externalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const recipients = email.recipients || [];
      
      return recipients.some(recipient => {
        let emailAddress = '';
        
        if (typeof recipient === 'string') {
          emailAddress = recipient;
        } else if (recipient && typeof recipient === 'object') {
          emailAddress = recipient.email || recipient.emailAddress || recipient.address || '';
        }
        
        if (typeof emailAddress === 'string' && emailAddress.length > 0) {
          return externalDomains.some(domain => emailAddress.toLowerCase().includes(domain));
        }
        
        return false;
      });
    } catch (error) {
      return false;
    }
  }

  isInternalEmail(email) {
    return !this.hasExternalRecipients(email);
  }

  async ensureThreatCategories() {
    const cacheAge = 5 * 60 * 1000; // 5 minutes
    
    if (this.threatCategories && this.lastCategoryUpdate && 
        (Date.now() - this.lastCategoryUpdate) < cacheAge) {
      return;
    }

    try {
      const result = await query(`
        SELECT 
          tc.id, tc.name, tc.description, tc.base_risk_score, tc.severity,
          COALESCE(
            json_agg(
              json_build_object(
                'keyword', ck.keyword,
                'weight', ck.weight
              )
            ) FILTER (WHERE ck.keyword IS NOT NULL), 
            '[]'::json
          ) as keywords
        FROM threat_categories tc
        LEFT JOIN category_keywords ck ON tc.id = ck.category_id
        WHERE tc.is_active = true
        GROUP BY tc.id, tc.name, tc.description, tc.base_risk_score, tc.severity
        ORDER BY tc.base_risk_score DESC NULLS LAST, tc.name
      `);

      this.threatCategories = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        baseRiskScore: row.base_risk_score || 50,
        severity: row.severity || 'Medium',
        keywords: Array.isArray(row.keywords) ? row.keywords : []
      }));

      this.lastCategoryUpdate = Date.now();
      console.log(`📚 Loaded ${this.threatCategories.length} threat categories for optimization`);
      
    } catch (error) {
      console.error('Error loading threat categories:', error);
      this.threatCategories = [];
    }
  }

  formatFinalResult(analysis, method) {
    return {
      ...analysis,
      riskScore: Math.min(100, Math.max(0, analysis.riskScore)),
      riskLevel: this.calculateRiskLevel(analysis.riskScore),
      method: method,
      analyzedAt: new Date().toISOString(),
      optimized: true
    };
  }

  calculateRiskLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

  getFallbackResult(email, error) {
    return {
      riskScore: 30,
      riskLevel: 'Medium',
      confidence: 0.3,
      riskFactors: ['Analysis error occurred'],
      patterns: [],
      violations: [],
      method: 'fallback',
      error: error.message,
      analyzedAt: new Date().toISOString(),
      optimized: true
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const total = this.processingStats.totalProcessed;
    if (total === 0) return this.processingStats;

    return {
      ...this.processingStats,
      efficiency: {
        rulesFilteredPercent: Math.round((this.processingStats.rulesFiltered / total) * 100),
        patternFilteredPercent: Math.round((this.processingStats.patternFiltered / total) * 100),
        llmProcessedPercent: Math.round((this.processingStats.llmProcessed / total) * 100),
        cachedPercent: Math.round((this.processingStats.cached / total) * 100)
      },
      estimatedCostSavings: this.calculateCostSavings()
    };
  }

  calculateCostSavings() {
    const totalEmails = this.processingStats.totalProcessed;
    const llmProcessed = this.processingStats.llmProcessed;
    const costPerLLMCall = 0.001; // Estimated cost per LLM analysis
    
    const actualCost = llmProcessed * costPerLLMCall;
    const fullLLMCost = totalEmails * costPerLLMCall;
    
    return {
      actualCost: actualCost.toFixed(4),
      fullLLMCost: fullLLMCost.toFixed(4),
      saved: (fullLLMCost - actualCost).toFixed(4),
      savingsPercent: totalEmails > 0 ? Math.round(((fullLLMCost - actualCost) / fullLLMCost) * 100) : 0
    };
  }

  /**
   * Batch processing helpers
   */
  parseBatchResponse(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error('Error parsing batch response:', error);
      return [];
    }
  }

  enhanceWithBatchResult(batchItem, llmResult) {
    const analysis = { ...batchItem.baseResult };
    
    if (llmResult) {
      analysis.riskScore = Math.max(analysis.riskScore, llmResult.risk_score || 0);
      analysis.confidence = 0.9;
      
      if (llmResult.top_violations) {
        analysis.violations.push(...llmResult.top_violations);
        analysis.riskFactors.push(`LLM detected: ${llmResult.top_violations.join(', ')}`);
      }
    }
    
    return analysis;
  }

  /**
   * Load compliance framework data
   */
  async ensureComplianceFramework() {
    const cacheAge = 10 * 60 * 1000; // 10 minutes
    if (this.complianceRegulations && this.lastComplianceUpdate && 
        (Date.now() - this.lastComplianceUpdate) < cacheAge) {
      return;
    }

    try {
      // Load active regulations with their configurations
      const regulationsResult = await query(`
        SELECT id, regulation_code, regulation_name, configuration, region
        FROM compliance_regulations 
        WHERE is_active = true
        ORDER BY regulation_code
      `);

      // Load active internal policies
      const policiesResult = await query(`
        SELECT id, policy_code, policy_name, policy_category, configuration,
               applies_to_departments, applies_to_roles
        FROM internal_policies 
        WHERE is_active = true
        ORDER BY policy_code
      `);

      // Load compliance profiles
      const profilesResult = await query(`
        SELECT id, profile_name, monitoring_level, data_classification,
               applicable_regulations, applicable_policies, configuration_overrides
        FROM compliance_profiles 
        ORDER BY profile_name
      `);

      this.complianceRegulations = regulationsResult.rows.map(row => ({
        id: row.id,
        code: row.regulation_code,
        name: row.regulation_name,
        config: row.configuration || {},
        region: row.region
      }));

      this.compliancePolicies = policiesResult.rows.map(row => ({
        id: row.id,
        code: row.policy_code,
        name: row.policy_name,
        category: row.policy_category,
        config: row.configuration || {},
        appliesTo: {
          departments: row.applies_to_departments || [],
          roles: row.applies_to_roles || []
        }
      }));

      this.complianceProfiles = profilesResult.rows.map(row => ({
        id: row.id,
        name: row.profile_name,
        monitoringLevel: row.monitoring_level,
        dataClassification: row.data_classification,
        applicableRegulations: row.applicable_regulations || [],
        applicablePolicies: row.applicable_policies || [],
        configOverrides: row.configuration_overrides || {}
      }));

      this.lastComplianceUpdate = Date.now();
      console.log(`📚 Loaded compliance framework: ${this.complianceRegulations.length} regulations, ${this.compliancePolicies.length} policies, ${this.complianceProfiles.length} profiles`);

    } catch (error) {
      console.error('Error loading compliance framework:', error);
      this.complianceRegulations = [];
      this.compliancePolicies = [];
      this.complianceProfiles = [];
    }
  }

  /**
   * Fast compliance pre-screening
   */
  async compliancePrescreen(email, employeeProfile) {
    const analysis = {
      complianceRiskScore: 0,
      violations: [],
      patterns: [],
      confidence: 0.9,
      detectionMethod: 'compliance_prescreen'
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();

    // Quick GDPR screening
    if (this.hasGDPRRisks(content, email)) {
      analysis.complianceRiskScore += 30;
      analysis.violations.push({
        type: 'GDPR',
        category: 'data_protection',
        severity: 'Medium',
        description: 'Potential GDPR data handling issue detected'
      });
    }

    // Quick PCI DSS screening  
    if (this.hasPCIRisks(content, email)) {
      analysis.complianceRiskScore += 40;
      analysis.violations.push({
        type: 'PCI_DSS',
        category: 'payment_data',
        severity: 'High',
        description: 'Potential payment card data exposure'
      });
    }

    // Quick SOX screening
    if (this.hasSOXRisks(content, email, employeeProfile)) {
      analysis.complianceRiskScore += 35;
      analysis.violations.push({
        type: 'SOX',
        category: 'financial_controls',
        severity: 'High',
        description: 'Potential financial reporting control violation'
      });
    }

    // Quick HIPAA screening
    if (this.hasHIPAARisks(content, email)) {
      analysis.complianceRiskScore += 45;
      analysis.violations.push({
        type: 'HIPAA',
        category: 'health_information',
        severity: 'Critical',
        description: 'Potential protected health information exposure'
      });
    }

    return analysis;
  }

  /**
   * GDPR risk detection
   */
  hasGDPRRisks(content, email) {
    const gdprPatterns = [
      /personal\s+data/gi,
      /data\s+subject/gi,
      /privacy\s+policy/gi,
      /consent/gi,
      /data\s+processing/gi,
      /right\s+to\s+be\s+forgotten/gi,
      /data\s+portability/gi,
      /lawful\s+basis/gi
    ];

    const hasGDPRKeywords = gdprPatterns.some(pattern => pattern.test(content));
    const hasPersonalIdentifiers = this.hasPersonalIdentifiers(content);
    const hasExternalRecipients = this.hasExternalRecipients(email);

    return hasGDPRKeywords && (hasPersonalIdentifiers || hasExternalRecipients);
  }

  /**
   * PCI DSS risk detection
   */
  hasPCIRisks(content, email) {
    const cardPatterns = [
      /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // MasterCard
      /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/g, // American Express
      /\bcvv\b/gi,
      /\bexpir/gi,
      /card\s+number/gi,
      /payment\s+card/gi,
      /cardholder/gi
    ];

    return cardPatterns.some(pattern => pattern.test(content));
  }

  /**
   * SOX risk detection
   */
  hasSOXRisks(content, email, employeeProfile) {
    const soxPatterns = [
      /financial\s+report/gi,
      /audit\s+trail/gi,
      /internal\s+control/gi,
      /financial\s+statement/gi,
      /earnings/gi,
      /revenue\s+recognition/gi,
      /sec\s+filing/gi,
      /quarterly\s+results/gi
    ];

    const isFinanceEmployee = employeeProfile.department === 'Finance' || 
                            employeeProfile.department === 'Accounting';
    const hasSOXKeywords = soxPatterns.some(pattern => pattern.test(content));

    return isFinanceEmployee && hasSOXKeywords && this.hasExternalRecipients(email);
  }

  /**
   * HIPAA risk detection
   */
  hasHIPAARisks(content, email) {
    // ------------------------------------------------------------------
    // 1. Direct medical-term check – strong PHI signal
    // ------------------------------------------------------------------
    const medicalPatterns = [
      /medical\s+record/gi,
      /patient\s+data/gi,
      /health\s+information/gi,
      /diagnosis/gi,
      /treatment/gi,
      /prescription/gi,
      /hipaa/gi,
      /icd-?10/gi,
      /cpt\s*code/gi,
      /ssn/gi,
      /social\s+security/gi,
      /date\s+of\s+birth/gi,
      /\bdob\b/gi
    ];
    const medicalFound = medicalPatterns.some(p => p.test(content));

    // ------------------------------------------------------------------
    // 2. Generic booking / appointment template detection
    //    We want to AVOID false positives for calendar invites like
    //    Microsoft Bookings, Calendly, etc.  We detect them via well-known
    //    template markers, and if no medical terms are present we skip HIPAA.
    // ------------------------------------------------------------------
    const bookingTemplateMarkers = [
      /powered\s+by\s+microsoft\s+bookings/gi,
      /bookingsDateTime\.png/gi,
      /via\s+microsoft\s+teams/gi,
      /join\s+your\s+appointment/gi
    ];
    const looksLikeGenericBooking = bookingTemplateMarkers.some(p => p.test(content));

    if (looksLikeGenericBooking && !medicalFound) {
      // Treat as safe – common corporate booking invite with no PHI
      return false;
    }

    // ------------------------------------------------------------------
    // 3. Appointment context (name + date/time) *may* reveal PHI.
    //    We flag only if NOT whitelisted (above) and all cues are present.
    // ------------------------------------------------------------------
    const appointmentKeyword = /(appointment|booking|consult|hour\s+meeting|follow[-\s]?up)/i;
    const hasAppointmentKeyword = appointmentKeyword.test(content);

    // Very loose date + time detection
    const hasDateWord = /\b(january|february|march|april|may|june|july|august|september|october|november|december|mon|tue|wed|thu|fri|sat|sun)\b/i.test(content);
    const hasTimeBlock = /\b\d{1,2}:\d{2}\s?(am|pm)\b/i.test(content);

    // Simple person-name heuristic (capitalised word with at least 3 letters)
    const hasName = /\b[A-Zא-ת][a-zא-ת]{2,}\b/.test(content);

    const appointmentContext = hasAppointmentKeyword && hasDateWord && hasTimeBlock && hasName;

    return medicalFound || appointmentContext;
  }

  /**
   * Determine if content has explicit medical terms (used for severity)
   */
  hasMedicalTerms(content) {
    const medicalPatterns = [
      /medical\s+record/gi,
      /patient\s+data/gi,
      /health\s+information/gi,
      /diagnosis/gi,
      /treatment/gi,
      /prescription/gi,
      /icd-?10/gi,
      /cpt\s*code/gi,
      /ssn/gi,
      /social\s+security/gi,
      /date\s+of\s+birth/gi,
      /\bdob\b/gi
    ];
    return medicalPatterns.some(p => p.test(content));
  }

  /**
   * Detect personal identifiers
   */
  hasPersonalIdentifiers(content) {
    const identifierPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, // Phone numbers
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // Dates that could be DOB
    ];

    return identifierPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detailed compliance analysis
   */
  async detailedComplianceAnalysis(email, employeeProfile, baseAnalysis) {
    const analysis = {
      complianceRiskScore: baseAnalysis.complianceRiskScore || 0,
      violations: [...(baseAnalysis.violations || [])],
      regulatoryFindings: {},
      policyViolations: {},
      confidence: 0.8
    };

    // Get employee's compliance profile
    const complianceProfile = this.getEmployeeComplianceProfile(employeeProfile);
    
    if (!complianceProfile) {
      console.log('⚠️ No compliance profile found for employee');
      return analysis;
    }

    // Analyze against applicable regulations
    for (const regulationId of complianceProfile.applicableRegulations) {
      const regulation = this.complianceRegulations.find(r => r.id === regulationId);
      if (regulation) {
        const finding = await this.analyzeEmailAgainstRegulation(email, regulation, employeeProfile);
        if (finding.riskScore > 0) {
          analysis.complianceRiskScore += finding.riskScore;
          analysis.regulatoryFindings[regulation.code] = finding;
          analysis.violations.push(...finding.violations);
        }
      }
    }

    // Analyze against applicable policies
    for (const policyId of complianceProfile.applicablePolicies) {
      const policy = this.compliancePolicies.find(p => p.id === policyId);
      if (policy) {
        const violation = await this.analyzeEmailAgainstPolicy(email, policy, employeeProfile);
        if (violation.riskScore > 0) {
          analysis.complianceRiskScore += violation.riskScore;
          analysis.policyViolations[policy.code] = violation;
          analysis.violations.push(...violation.violations);
        }
      }
    }

    // Cap the compliance risk score
    analysis.complianceRiskScore = Math.min(analysis.complianceRiskScore, 100);

    return analysis;
  }

  /**
   * Get employee's compliance profile
   */
  getEmployeeComplianceProfile(employeeProfile) {
    if (employeeProfile.complianceProfileId) {
      return this.complianceProfiles.find(p => p.id === employeeProfile.complianceProfileId);
    }
    
    // Fallback: determine profile by department
    const department = employeeProfile.department;
    if (department === 'Finance' || department === 'Accounting') {
      return this.complianceProfiles.find(p => p.name === 'Finance Team');
    } else if (department === 'IT' || department === 'Engineering') {
      return this.complianceProfiles.find(p => p.name === 'IT Administration');
    } else {
      return this.complianceProfiles.find(p => p.name === 'Standard Employee');
    }
  }

  /**
   * Analyze email against specific regulation
   */
  async analyzeEmailAgainstRegulation(email, regulation, employeeProfile) {
    const analysis = {
      regulationCode: regulation.code,
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();

    switch (regulation.code) {
      case 'gdpr':
        return this.analyzeGDPRCompliance(email, regulation, employeeProfile);
      case 'pci_dss':
        return this.analyzePCIDSSCompliance(email, regulation, employeeProfile);
      case 'sox':
        return this.analyzeSOXCompliance(email, regulation, employeeProfile);
      case 'hipaa':
        return this.analyzeHIPAACompliance(email, regulation, employeeProfile);
      default:
        return analysis;
    }
  }

  /**
   * GDPR compliance analysis
   */
  analyzeGDPRCompliance(email, regulation, employeeProfile) {
    const analysis = {
      regulationCode: 'gdpr',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
    const hasExternalRecipients = this.hasExternalRecipients(email);
    const hasPersonalData = this.hasPersonalIdentifiers(content);

    // Check for data transfer without consent
    if (hasPersonalData && hasExternalRecipients) {
      analysis.riskScore += 40;
      analysis.violations.push({
        type: 'GDPR_DATA_TRANSFER',
        category: 'data_protection',
        severity: 'High',
        description: 'Personal data transferred to external recipients without verified consent',
        article: 'Article 6 (Lawful basis for processing)'
      });
    }

    // Check for data retention violations
    if (content.includes('delete') && hasPersonalData) {
      analysis.riskScore += 25;
      analysis.violations.push({
        type: 'GDPR_RIGHT_TO_ERASURE',
        category: 'data_subject_rights',
        severity: 'Medium',
        description: 'Potential right to erasure request involving personal data',
        article: 'Article 17 (Right to erasure)'
      });
    }

    // Check for data breach notification issues
    if (content.includes('breach') || content.includes('incident')) {
      analysis.riskScore += 30;
      analysis.violations.push({
        type: 'GDPR_BREACH_NOTIFICATION',
        category: 'security_breach',
        severity: 'High',
        description: 'Potential data breach requiring notification within 72 hours',
        article: 'Article 33 (Notification of a personal data breach)'
      });
    }

    return analysis;
  }

  /**
   * PCI DSS compliance analysis
   */
  analyzePCIDSSCompliance(email, regulation, employeeProfile) {
    const analysis = {
      regulationCode: 'pci_dss',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
    
    // Check for cardholder data in email
    if (this.hasPCIRisks(content, email)) {
      analysis.riskScore += 50;
      analysis.violations.push({
        type: 'PCI_CARDHOLDER_DATA_EXPOSURE',
        category: 'payment_security',
        severity: 'Critical',
        description: 'Cardholder data transmitted via insecure email',
        requirement: 'Requirement 4 (Encrypt transmission of cardholder data)'
      });
    }

    return analysis;
  }

  /**
   * SOX compliance analysis
   */
  analyzeSOXCompliance(email, regulation, employeeProfile) {
    const analysis = {
      regulationCode: 'sox',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
    const isFinanceDept = employeeProfile.department === 'Finance' || employeeProfile.department === 'Accounting';
    
    // Check for financial information shared externally
    if (isFinanceDept && this.hasSOXRisks(content, email, employeeProfile)) {
      analysis.riskScore += 45;
      analysis.violations.push({
        type: 'SOX_FINANCIAL_DISCLOSURE',
        category: 'financial_controls',
        severity: 'High',
        description: 'Financial information shared externally without proper controls',
        section: 'Section 404 (Management Assessment of Internal Controls)'
      });
    }

    return analysis;
  }

  /**
   * HIPAA compliance analysis
   */
  analyzeHIPAACompliance(email, regulation, employeeProfile) {
    const analysis = {
      regulationCode: 'hipaa',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
    
    // Skip if no HIPAA cues
    if (!this.hasHIPAARisks(content, email)) {
      return analysis;
    }

    // Determine severity based on the presence of explicit medical terms
    const medicalFound = this.hasMedicalTerms(content);

    if (medicalFound) {
      analysis.riskScore += 60;
      analysis.violations.push({
        type: 'HIPAA_PHI_EXPOSURE',
        category: 'health_information',
        severity: 'Critical',
        description: 'Protected Health Information transmitted via insecure email',
        rule: 'Security Rule (45 CFR 164.312)'
      });
    } else {
      // Appointment context without medical details – still a concern but lower severity
      analysis.riskScore += 40;
      analysis.violations.push({
        type: 'HIPAA_POTENTIAL_PHI_APPOINTMENT',
        category: 'health_information',
        severity: 'High',
        description: 'Appointment email may reveal patient identity but lacks explicit medical details',
        rule: 'Security Rule (45 CFR 164.312)'
      });
    }

    return analysis;
  }

  /**
   * Analyze email against specific policy
   */
  async analyzeEmailAgainstPolicy(email, policy, employeeProfile) {
    const analysis = {
      policyCode: policy.code,
      riskScore: 0,
      violations: [],
      findings: []
    };

    switch (policy.code) {
      case 'external_communication':
        return this.analyzeExternalCommunicationPolicy(email, policy, employeeProfile);
      case 'data_retention':
        return this.analyzeDataRetentionPolicy(email, policy, employeeProfile);
      case 'employee_monitoring':
        return this.analyzeEmployeeMonitoringPolicy(email, policy, employeeProfile);
      default:
        return analysis;
    }
  }

  /**
   * External communication policy analysis
   */
  analyzeExternalCommunicationPolicy(email, policy, employeeProfile) {
    const analysis = {
      policyCode: 'external_communication',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const hasExternalRecipients = this.hasExternalRecipients(email);
    const hasAttachments = email.attachments && email.attachments.length > 0;
    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();

    // Check for external communication with sensitive data
    if (hasExternalRecipients && this.hasSensitiveData(content)) {
      analysis.riskScore += 35;
      analysis.violations.push({
        type: 'EXTERNAL_COMM_SENSITIVE_DATA',
        category: 'policy_violation',
        severity: 'High',
        description: 'Sensitive data shared with external recipients',
        policySection: 'External Data Sharing Controls'
      });
    }

    // Check for external file sharing
    if (hasExternalRecipients && hasAttachments) {
      analysis.riskScore += 25;
      analysis.violations.push({
        type: 'EXTERNAL_FILE_SHARING',
        category: 'policy_violation',
        severity: 'Medium',
        description: 'File attachments sent to external recipients',
        policySection: 'File Transfer Monitoring'
      });
    }

    return analysis;
  }

  /**
   * Data retention policy analysis
   */
  analyzeDataRetentionPolicy(email, policy, employeeProfile) {
    const analysis = {
      policyCode: 'data_retention',
      riskScore: 0,
      violations: [],
      findings: []
    };

    const content = `${email.subject || ''} ${email.body || ''}`.toLowerCase();

    // Check for retention-related keywords
    if (content.includes('delete') || content.includes('purge') || content.includes('archive')) {
      analysis.riskScore += 20;
      analysis.findings.push('Data retention action detected');
    }

    return analysis;
  }

  /**
   * Employee monitoring policy analysis
   */
  analyzeEmployeeMonitoringPolicy(email, policy, employeeProfile) {
    const analysis = {
      policyCode: 'employee_monitoring',
      riskScore: 0,
      violations: [],
      findings: []
    };

    // This analyzer itself is part of employee monitoring, so check for policy compliance
    // in the monitoring process rather than email content
    return analysis;
  }

  /**
   * Check for sensitive data patterns
   */
  hasSensitiveData(content) {
    const sensitivePatterns = [
      /confidential/gi,
      /proprietary/gi,
      /internal\s+only/gi,
      /restricted/gi,
      /password/gi,
      /api\s+key/gi,
      /secret/gi,
      /token/gi
    ];

    return sensitivePatterns.some(pattern => pattern.test(content)) || 
           this.hasPersonalIdentifiers(content);
  }

  /**
   * Combine security and compliance results
   */
  combineSecurityAndCompliance(securityResult, complianceResult) {
    return {
      securityRiskScore: securityResult.riskScore || 0,
      complianceRiskScore: complianceResult.complianceRiskScore || 0,
      riskScore: Math.max(securityResult.riskScore || 0, complianceResult.complianceRiskScore || 0),
      confidence: Math.min(securityResult.confidence || 0, complianceResult.confidence || 0),
      riskFactors: [...(securityResult.riskFactors || []), ...(complianceResult.violations || [])],
      patterns: [...(securityResult.patterns || []), ...(complianceResult.patterns || [])],
      violations: complianceResult.violations || [],
      detectionMethod: 'security_compliance_combined'
    };
  }

  /**
   * Combine pattern and detailed compliance results
   */
  combinePatternAndCompliance(patternResult, complianceResult) {
    return {
      securityRiskScore: patternResult.riskScore || 0,
      complianceRiskScore: complianceResult.complianceRiskScore || 0,
      riskScore: Math.max(patternResult.riskScore || 0, complianceResult.complianceRiskScore || 0),
      confidence: Math.min(patternResult.confidence || 0, complianceResult.confidence || 0),
      riskFactors: [...(patternResult.riskFactors || []), ...(complianceResult.violations || [])],
      patterns: [...(patternResult.patterns || [])],
      violations: complianceResult.violations || [],
      regulatoryFindings: complianceResult.regulatoryFindings || {},
      policyViolations: complianceResult.policyViolations || {},
      detectionMethod: 'pattern_compliance_combined'
    };
  }

  /**
   * Enhanced LLM analysis with compliance focus
   */
  async intelligentLLMAnalysisWithCompliance(email, baseResult, employeeProfile) {
    // Use the existing LLM analysis but enhance the prompt with compliance context
    const complianceProfile = this.getEmployeeComplianceProfile(employeeProfile);
    const applicableRegulations = complianceProfile ? 
      complianceProfile.applicableRegulations.map(id => 
        this.complianceRegulations.find(r => r.id === id)?.code
      ).filter(Boolean) : [];

    const enhancedPrompt = this.buildComplianceAwarePrompt(email, applicableRegulations, baseResult);
    
    // Call the existing LLM method with enhanced prompt
    return await this.intelligentLLMAnalysis(email, baseResult, enhancedPrompt);
  }

  /**
   * Build compliance-aware LLM prompt
   */
  buildComplianceAwarePrompt(email, applicableRegulations, baseResult) {
    const regulationsText = applicableRegulations.length > 0 ? 
      `Consider compliance with: ${applicableRegulations.join(', ')}` : '';
    
    return `Analyze this email for both security risks AND compliance violations.
${regulationsText}

Focus on:
- Data protection violations (GDPR, HIPAA)
- Financial reporting issues (SOX)
- Payment data exposure (PCI DSS)
- Internal policy violations
- External data sharing without proper controls

Provide detailed compliance assessment in addition to security analysis.`;
  }
}

module.exports = OptimizedEmailAnalyzer; 