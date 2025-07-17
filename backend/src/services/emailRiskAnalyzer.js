const natural = require('natural');
const sentiment = require('sentiment');

/**
 * AI-Powered Email Risk Analysis Service
 * 
 * This service analyzes employee emails to assess security risks using:
 * - Natural Language Processing
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
   * Main email analysis function
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
      analyzedAt: new Date().toISOString()
    };

    try {
      // 1. Content Analysis
      const contentRisk = this.analyzeContent(email);
      analysis.riskScore += contentRisk.score;
      analysis.riskFactors.push(...contentRisk.factors);
      analysis.patterns.push(...contentRisk.patterns);
      analysis.violations.push(...contentRisk.violations);

      // 2. Recipient Analysis
      const recipientRisk = this.analyzeRecipients(email);
      analysis.riskScore += recipientRisk.score;
      analysis.riskFactors.push(...recipientRisk.factors);
      analysis.violations.push(...recipientRisk.violations);

      // 3. Timing Analysis
      const timingRisk = this.analyzeTiming(email);
      analysis.riskScore *= timingRisk.multiplier;
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
      analysis.riskScore = Math.min(analysis.riskScore, 100); // Cap at 100
      analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);
      analysis.confidence = this.calculateConfidence(analysis);

      // 10. Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      console.error('Error in email analysis:', error);
      analysis.riskFactors.push('Analysis error occurred');
      analysis.confidence = 0;
      return analysis;
    }
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
      const externalRecipients = recipients.filter(r => 
        !r.email.includes('@company.com') // Should be dynamic based on company domain
      );

      if (externalRecipients.length > 0) {
        result.score += externalRecipients.length * 5;
        result.factors.push(`${externalRecipients.length} external recipients`);

        // Check for high-risk domains
        const highRiskDomains = externalRecipients.filter(r => 
          this.domainRiskLevels.high.some(domain => r.email.includes(domain))
        );

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
}

module.exports = new EmailRiskAnalyzer(); 