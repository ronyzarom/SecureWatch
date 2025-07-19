const OpenAI = require('openai');
const { pool } = require('../utils/database');

/**
 * AI-Powered Compliance Analysis Service
 * 
 * Enhances traditional rule-based compliance evaluation with:
 * - Intelligent behavioral pattern analysis
 * - Contextual risk assessment
 * - Predictive compliance scoring
 * - Natural language understanding of policies
 * - Advanced violation prediction
 */

class AIComplianceAnalyzer {
  constructor() {
    // Initialize OpenAI for compliance analysis
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
    });
    
    // AI Configuration for compliance analysis
    this.aiConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.2, // Low temperature for consistent compliance analysis
      maxTokens: 2000,
      analysisModel: 'gpt-4o-mini', // For complex pattern analysis
      analysisMaxTokens: 3000,
      analysisTemperature: 0.1 // Very low for deterministic compliance evaluation
    };

    this.initialized = false;
    this.compliancePatterns = new Map();
    this.riskIndicators = new Map();
  }

  /**
   * Initialize AI compliance analyzer with learning patterns
   */
  async initialize() {
    try {
      console.log('🤖 Initializing AI Compliance Analyzer...');

      // Load historical compliance patterns for AI learning
      await this.loadCompliancePatterns();
      await this.loadRiskIndicators();
      
      this.initialized = true;
      console.log('✅ AI Compliance Analyzer initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize AI Compliance Analyzer:', error);
      throw error;
    }
  }

  /**
   * AI-Enhanced Employee Compliance Evaluation
   * Combines traditional rule-based with AI behavioral analysis
   */
  async evaluateEmployeeComplianceWithAI(employeeId, includePredicitive = true) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🧠 AI analyzing compliance for employee ${employeeId}...`);

      // Gather comprehensive employee data for AI analysis
      const employeeData = await this.gatherEmployeeComplianceData(employeeId);
      
      const aiAnalysis = {
        employeeId,
        analyzedAt: new Date(),
        intelligentRiskScore: 0,
        behavioralPatterns: {},
        contextualViolations: [],
        predictiveRisks: [],
        aiRecommendations: [],
        confidenceScore: 0,
        complianceInsights: {}
      };

      // 1. AI-Powered Behavioral Pattern Analysis
      const behavioralAnalysis = await this.analyzeBehavioralPatterns(employeeData);
      aiAnalysis.behavioralPatterns = behavioralAnalysis;
      aiAnalysis.intelligentRiskScore += behavioralAnalysis.riskContribution;

      // 2. Contextual Compliance Assessment
      const contextualAnalysis = await this.analyzeContextualCompliance(employeeData);
      aiAnalysis.contextualViolations = contextualAnalysis.violations;
      aiAnalysis.intelligentRiskScore += contextualAnalysis.riskScore;

      // 3. Regulation-Specific AI Analysis
      const regulationAnalysis = await this.analyzeRegulationsWithAI(employeeData);
      aiAnalysis.complianceInsights.regulations = regulationAnalysis;
      aiAnalysis.intelligentRiskScore += regulationAnalysis.totalRiskScore;

      // 4. Policy Compliance AI Assessment
      const policyAnalysis = await this.analyzePoliciesWithAI(employeeData);
      aiAnalysis.complianceInsights.policies = policyAnalysis;
      aiAnalysis.intelligentRiskScore += policyAnalysis.totalRiskScore;

      // 5. Predictive Compliance Risk Analysis
      if (includePredicitive) {
        const predictiveAnalysis = await this.predictComplianceRisks(employeeData);
        aiAnalysis.predictiveRisks = predictiveAnalysis.risks;
        aiAnalysis.intelligentRiskScore += predictiveAnalysis.riskScore;
      }

      // 6. Generate AI-Powered Recommendations
      aiAnalysis.aiRecommendations = await this.generateIntelligentRecommendations(employeeData, aiAnalysis);

      // 7. Calculate overall confidence and finalize scoring
      aiAnalysis.confidenceScore = this.calculateAIConfidence(aiAnalysis);
      aiAnalysis.intelligentRiskScore = Math.min(aiAnalysis.intelligentRiskScore, 100);

      console.log(`🎯 AI Compliance Analysis complete: Risk ${aiAnalysis.intelligentRiskScore}, Confidence ${aiAnalysis.confidenceScore}%`);

      return aiAnalysis;

    } catch (error) {
      console.error(`❌ AI compliance analysis failed for employee ${employeeId}:`, error);
      return this.getFallbackAnalysis(employeeId);
    }
  }

  /**
   * AI-Powered Behavioral Pattern Analysis
   * Analyzes employee behavior patterns for compliance risks
   */
  async analyzeBehavioralPatterns(employeeData) {
    try {
      const prompt = this.createBehavioralAnalysisPrompt(employeeData);
      
      console.log('🧠 Analyzing behavioral patterns with AI...');

      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.analysisModel,
        temperature: this.aiConfig.analysisTemperature,
        max_tokens: this.aiConfig.analysisMaxTokens,
        messages: [
          {
            role: "system",
            content: `You are an expert compliance analyst with deep knowledge of regulatory frameworks (GDPR, SOX, HIPAA, PCI DSS) and organizational policies. 

Analyze employee behavioral patterns to identify compliance risks. Focus on:
- Unusual data access patterns that may indicate policy violations
- Communication anomalies suggesting external data sharing
- Time-based patterns indicating after-hours unauthorized activities  
- Volume-based anomalies in email or file access
- Deviation from normal operational procedures

Provide structured analysis in JSON format with risk scoring (0-100), confidence levels, and specific pattern insights.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        dataAccessPatterns: analysis.data_access_patterns || {},
        communicationPatterns: analysis.communication_patterns || {},
        temporalPatterns: analysis.temporal_patterns || {},
        volumeAnomalies: analysis.volume_anomalies || {},
        riskContribution: analysis.risk_score || 0,
        confidence: analysis.confidence || 0,
        keyInsights: analysis.key_insights || [],
        aiReasoning: analysis.reasoning || ''
      };

    } catch (error) {
      console.error('Error in AI behavioral analysis:', error);
      return this.getFallbackBehavioralAnalysis();
    }
  }

  /**
   * AI-Powered Contextual Compliance Analysis
   * Deep understanding of compliance context and nuanced violations
   */
  async analyzeContextualCompliance(employeeData) {
    try {
      const prompt = this.createContextualCompliancePrompt(employeeData);
      
      console.log('🎯 Performing contextual compliance analysis...');

      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.model,
        temperature: this.aiConfig.temperature,
        max_tokens: this.aiConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: `You are a senior compliance officer with expertise in interpreting complex regulatory requirements in context.

Analyze the provided employee data for contextual compliance violations that rule-based systems might miss. Consider:
- Intent and context behind actions, not just rule violations
- Situational factors that may justify or aggravate violations
- Patterns that collectively indicate compliance issues
- Risk severity based on employee role and data sensitivity
- Regulatory nuances requiring human-like interpretation

Identify subtle but significant compliance risks and provide actionable insights.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        violations: analysis.contextual_violations || [],
        riskScore: analysis.risk_score || 0,
        contextualFactors: analysis.contextual_factors || [],
        severityJustification: analysis.severity_justification || '',
        regulatoryNuances: analysis.regulatory_nuances || [],
        actionableInsights: analysis.actionable_insights || []
      };

    } catch (error) {
      console.error('Error in contextual compliance analysis:', error);
      return { violations: [], riskScore: 0, contextualFactors: [] };
    }
  }

  /**
   * AI-Enhanced Regulation Analysis
   * Intelligent interpretation of GDPR, SOX, HIPAA, PCI DSS requirements
   */
  async analyzeRegulationsWithAI(employeeData) {
    const regulations = ['gdpr', 'sox', 'hipaa', 'pci_dss'];
    const analysisResults = {};
    let totalRiskScore = 0;

    for (const regulation of regulations) {
      if (this.isRegulationApplicable(employeeData, regulation)) {
        try {
          const result = await this.analyzeSpecificRegulation(employeeData, regulation);
          analysisResults[regulation] = result;
          totalRiskScore += result.riskScore;
        } catch (error) {
          console.error(`Error analyzing ${regulation}:`, error);
          analysisResults[regulation] = { riskScore: 0, violations: [], insights: [] };
        }
      }
    }

    return {
      regulations: analysisResults,
      totalRiskScore: Math.min(totalRiskScore, 100),
      applicableRegulations: Object.keys(analysisResults)
    };
  }

  /**
   * AI-Enhanced Policy Analysis
   * Smart interpretation of internal policies with contextual understanding
   */
  async analyzePoliciesWithAI(employeeData) {
    try {
      const applicablePolicies = await this.getApplicablePolicies(employeeData);
      const policyAnalysis = {};
      let totalRiskScore = 0;

      for (const policy of applicablePolicies) {
        const analysis = await this.analyzeSpecificPolicy(employeeData, policy);
        policyAnalysis[policy.code] = analysis;
        totalRiskScore += analysis.riskScore;
      }

      return {
        policies: policyAnalysis,
        totalRiskScore: Math.min(totalRiskScore, 50), // Policies contribute max 50 to total risk
        applicablePolicies: applicablePolicies.map(p => p.code)
      };

    } catch (error) {
      console.error('Error in AI policy analysis:', error);
      return { policies: {}, totalRiskScore: 0, applicablePolicies: [] };
    }
  }

  /**
   * Predictive Compliance Risk Analysis
   * Uses AI to predict future compliance violations based on current patterns
   */
  async predictComplianceRisks(employeeData) {
    try {
      const prompt = this.createPredictiveAnalysisPrompt(employeeData);
      
      console.log('🔮 Performing predictive compliance risk analysis...');

      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.analysisModel,
        temperature: this.aiConfig.temperature,
        max_tokens: this.aiConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: `You are a predictive analytics expert specializing in compliance risk forecasting.

Analyze current employee behavior patterns and predict potential future compliance violations. Focus on:
- Trend analysis of behavioral changes over time
- Early warning indicators of policy violations
- Risk escalation patterns based on current trajectory
- Preventive intervention opportunities
- Timeline predictions for potential violations

Provide probabilistic risk assessments with confidence intervals and recommended preventive actions.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        risks: analysis.predicted_risks || [],
        riskScore: analysis.overall_risk_score || 0,
        timeframe: analysis.risk_timeframe || 'unknown',
        confidence: analysis.prediction_confidence || 0,
        trendAnalysis: analysis.trend_analysis || {},
        preventiveActions: analysis.preventive_actions || [],
        earlyWarnings: analysis.early_warnings || []
      };

    } catch (error) {
      console.error('Error in predictive compliance analysis:', error);
      return { risks: [], riskScore: 0, timeframe: 'unknown', confidence: 0 };
    }
  }

  /**
   * Generate AI-Powered Intelligent Recommendations
   */
  async generateIntelligentRecommendations(employeeData, aiAnalysis) {
    try {
      const prompt = this.createRecommendationsPrompt(employeeData, aiAnalysis);

      const response = await this.openai.chat.completions.create({
        model: this.aiConfig.model,
        temperature: 0.3, // Slightly higher for creative recommendations
        max_tokens: this.aiConfig.maxTokens,
        messages: [
          {
            role: "system",
            content: `You are a senior compliance consultant providing actionable recommendations.

Based on the compliance analysis provided, generate specific, actionable recommendations that:
- Address identified risks with practical solutions
- Prioritize actions by impact and urgency
- Consider organizational constraints and employee role
- Provide clear implementation steps
- Include monitoring and measurement criteria

Focus on preventive rather than reactive measures.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const recommendations = JSON.parse(response.choices[0].message.content);
      
      return recommendations.recommendations || [];

    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Helper Methods
   */

  async gatherEmployeeComplianceData(employeeId) {
    try {
      // Gather comprehensive employee data for AI analysis
      const [employee, emails, violations, dataAccess, policies] = await Promise.all([
        this.getEmployeeDetails(employeeId),
        this.getEmployeeEmails(employeeId),
        this.getEmployeeViolations(employeeId),
        this.getEmployeeDataAccess(employeeId),
        this.getApplicablePoliciesForEmployee(employeeId)
      ]);

      return {
        employee,
        emails: emails.slice(0, 50), // Last 50 emails for analysis
        violations,
        dataAccess: dataAccess.slice(0, 100), // Last 100 access events
        policies,
        gatherTimestamp: new Date()
      };

    } catch (error) {
      console.error('Error gathering employee compliance data:', error);
      throw error;
    }
  }

  async getEmployeeDetails(employeeId) {
    const result = await pool.query(`
      SELECT e.*, cp.profile_name, cp.applicable_regulations, cp.applicable_policies,
             cp.retention_period_years, cp.monitoring_level, cp.data_classification
      FROM employees e
      LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
      WHERE e.id = $1
    `, [employeeId]);
    
    return result.rows[0];
  }

  async getEmployeeEmails(employeeId) {
    const result = await pool.query(`
      SELECT subject, body_text, recipients, risk_score, risk_flags, sent_at
      FROM email_communications 
      WHERE sender_employee_id = $1 
        AND sent_at >= NOW() - INTERVAL '30 days'
      ORDER BY sent_at DESC 
      LIMIT 50
    `, [employeeId]);
    
    return result.rows;
  }

  async getEmployeeViolations(employeeId) {
    const result = await pool.query(`
      SELECT type, severity, description, evidence, status, created_at
      FROM violations 
      WHERE employee_id = $1 
        AND created_at >= NOW() - INTERVAL '90 days'
      ORDER BY created_at DESC
    `, [employeeId]);
    
    return result.rows;
  }

  async getEmployeeDataAccess(employeeId) {
    // Mock implementation - would connect to actual data access logs
    return [];
  }

  async getApplicablePoliciesForEmployee(employeeId) {
    const result = await pool.query(`
      SELECT ip.policy_code, ip.policy_name, ip.configuration
      FROM internal_policies ip
      WHERE ip.is_active = true
        AND (ip.applies_to_departments IS NULL OR $1 = ANY(ip.applies_to_departments))
      ORDER BY ip.priority_order
    `, [employeeId]);
    
    return result.rows;
  }

  createBehavioralAnalysisPrompt(employeeData) {
    return `
Analyze employee behavioral patterns for compliance risks:

Employee Profile:
- Name: ${employeeData.employee.name}
- Department: ${employeeData.employee.department}
- Role: ${employeeData.employee.job_title}
- Risk Score: ${employeeData.employee.risk_score}
- Compliance Profile: ${employeeData.employee.profile_name}

Recent Email Activity (${employeeData.emails.length} emails):
${employeeData.emails.slice(0, 10).map(email => 
  `- Subject: "${email.subject}" | Risk: ${email.risk_score} | Recipients: ${email.recipients?.length || 0}`
).join('\n')}

Recent Violations (${employeeData.violations.length}):
${employeeData.violations.map(v => 
  `- ${v.type} (${v.severity}) - ${v.description}`
).join('\n')}

Analyze patterns and provide JSON response with:
{
  "data_access_patterns": {...},
  "communication_patterns": {...},
  "temporal_patterns": {...},
  "volume_anomalies": {...},
  "risk_score": 0-40,
  "confidence": 0-100,
  "key_insights": [...],
  "reasoning": "..."
}
    `;
  }

  createContextualCompliancePrompt(employeeData) {
    return `
Perform contextual compliance analysis for nuanced violation detection:

Employee Context:
- ${employeeData.employee.name} (${employeeData.employee.department})
- Compliance Profile: ${employeeData.employee.profile_name}
- Data Classification: ${employeeData.employee.data_classification}

Email Patterns Analysis:
${employeeData.emails.slice(0, 5).map(email => 
  `- "${email.subject}" - Risk: ${email.risk_score}, Flags: ${JSON.stringify(email.risk_flags)}`
).join('\n')}

Violation History:
${employeeData.violations.map(v => 
  `- ${v.type}: ${v.description} (${v.status})`
).join('\n')}

Identify contextual compliance issues and respond with JSON:
{
  "contextual_violations": [...],
  "risk_score": 0-30,
  "contextual_factors": [...],
  "severity_justification": "...",
  "regulatory_nuances": [...],
  "actionable_insights": [...]
}
    `;
  }

  createPredictiveAnalysisPrompt(employeeData) {
    return `
Predict future compliance risks based on current behavioral patterns:

Employee Trends Analysis:
- Current Risk Score: ${employeeData.employee.risk_score}
- Recent Email Risk Trend: ${this.calculateEmailRiskTrend(employeeData.emails)}
- Violation Frequency: ${employeeData.violations.length} in 90 days

Behavioral Indicators:
${this.extractBehavioralIndicators(employeeData)}

Predict potential compliance violations and respond with JSON:
{
  "predicted_risks": [...],
  "overall_risk_score": 0-30,
  "risk_timeframe": "days/weeks/months",
  "prediction_confidence": 0-100,
  "trend_analysis": {...},
  "preventive_actions": [...],
  "early_warnings": [...]
}
    `;
  }

  createRecommendationsPrompt(employeeData, aiAnalysis) {
    return `
Generate actionable compliance recommendations based on AI analysis:

Analysis Summary:
- AI Risk Score: ${aiAnalysis.intelligentRiskScore}
- Behavioral Patterns: ${JSON.stringify(aiAnalysis.behavioralPatterns.keyInsights || [])}
- Contextual Violations: ${aiAnalysis.contextualViolations.length}
- Predictive Risks: ${aiAnalysis.predictiveRisks.length}

Employee Context: ${employeeData.employee.name} (${employeeData.employee.department})

Generate prioritized recommendations in JSON format:
{
  "recommendations": [
    {
      "priority": "high/medium/low",
      "category": "training/monitoring/policy/technical",
      "title": "...",
      "description": "...",
      "implementation_steps": [...],
      "timeline": "...",
      "success_criteria": "..."
    }
  ]
}
    `;
  }

  // Additional helper methods for AI analysis
  calculateEmailRiskTrend(emails) {
    if (emails.length < 2) return 'insufficient_data';
    
    const recentScores = emails.slice(0, 10).map(e => e.risk_score || 0);
    const olderScores = emails.slice(10, 20).map(e => e.risk_score || 0);
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length || recentAvg;
    
    if (recentAvg > olderAvg * 1.2) return 'increasing';
    if (recentAvg < olderAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  extractBehavioralIndicators(employeeData) {
    const indicators = [];
    
    if (employeeData.emails.length > 0) {
      const avgRisk = employeeData.emails.reduce((sum, e) => sum + (e.risk_score || 0), 0) / employeeData.emails.length;
      indicators.push(`Average email risk: ${avgRisk.toFixed(1)}`);
    }
    
    if (employeeData.violations.length > 0) {
      const recentViolations = employeeData.violations.filter(v => 
        new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      indicators.push(`Recent violations: ${recentViolations.length}`);
    }
    
    return indicators.join(', ');
  }

  calculateAIConfidence(aiAnalysis) {
    let confidence = 70; // Base confidence
    
    if (aiAnalysis.behavioralPatterns.confidence > 80) confidence += 10;
    if (aiAnalysis.contextualViolations.length > 0) confidence += 10;
    if (aiAnalysis.predictiveRisks.length > 0) confidence += 10;
    
    return Math.min(confidence, 95);
  }

  isRegulationApplicable(employeeData, regulation) {
    const applicableRegs = employeeData.employee.applicable_regulations || [];
    return applicableRegs.includes(regulation) || 
           (regulation === 'gdpr' && employeeData.employee.data_classification === 'personal_data');
  }

  async analyzeSpecificRegulation(employeeData, regulation) {
    // Implementation for specific regulation analysis
    return { riskScore: 0, violations: [], insights: [] };
  }

  async getApplicablePolicies(employeeData) {
    return employeeData.policies || [];
  }

  async analyzeSpecificPolicy(employeeData, policy) {
    // Implementation for specific policy analysis
    return { riskScore: 0, violations: [], insights: [] };
  }

  // Fallback methods for error cases
  getFallbackAnalysis(employeeId) {
    return {
      employeeId,
      analyzedAt: new Date(),
      intelligentRiskScore: 50,
      behavioralPatterns: {},
      contextualViolations: [],
      predictiveRisks: [],
      aiRecommendations: [],
      confidenceScore: 30,
      complianceInsights: {},
      error: 'AI analysis failed, using fallback'
    };
  }

  getFallbackBehavioralAnalysis() {
    return {
      dataAccessPatterns: {},
      communicationPatterns: {},
      temporalPatterns: {},
      volumeAnomalies: {},
      riskContribution: 0,
      confidence: 0,
      keyInsights: [],
      aiReasoning: 'Analysis failed'
    };
  }

  getFallbackRecommendations() {
    return [
      {
        priority: 'medium',
        category: 'monitoring',
        title: 'Enhanced Monitoring',
        description: 'Implement additional monitoring due to AI analysis failure',
        implementation_steps: ['Review manually', 'Implement basic monitoring'],
        timeline: '1 week',
        success_criteria: 'Reduced risk indicators'
      }
    ];
  }

  async loadCompliancePatterns() {
    // Load historical compliance patterns for AI learning
    this.compliancePatterns.set('default', {
      patterns: ['email_volume_spike', 'after_hours_access', 'external_communication_increase'],
      riskLevels: { low: 0.2, medium: 0.5, high: 0.8 }
    });
  }

  async loadRiskIndicators() {
    // Load risk indicators for pattern matching
    this.riskIndicators.set('behavioral', [
      'unusual_data_access',
      'communication_pattern_change',
      'policy_violation_frequency',
      'external_sharing_increase'
    ]);
  }
}

module.exports = AIComplianceAnalyzer; 