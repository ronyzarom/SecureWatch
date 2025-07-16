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
        'profit', 'budget', 'confidential', 'proprietary', 'trade secret'
      ],
      
      // Data Exfiltration Indicators
      dataExfiltration: [
        'customer data', 'user database', 'employee records', 'source code',
        'backup', 'download', 'export', 'transfer', 'copy', 'share',
        'personal account', 'dropbox', 'google drive', 'onedrive'
      ],
      
      // External Communication Risk
      external: [
        'competitor', 'job interview', 'resignation', 'opportunity',
        'headhunter', 'recruiter', 'new position', 'leaving company'
      ],
      
      // Policy Violations
      policy: [
        'personal use', 'side business', 'freelance', 'moonlighting',
        'conflict of interest', 'insider trading', 'non-disclosure'
      ],
      
      // Urgent/Pressure Tactics
      urgency: [
        'urgent', 'asap', 'immediately', 'deadline', 'emergency',
        'time sensitive', 'critical', 'rush', 'priority'
      ],
      
      // Security Bypass Attempts
      security: [
        'bypass', 'workaround', 'alternative', 'unauthorized access',
        'permission', 'admin rights', 'password', 'credentials'
      ]
    };

    // Time-based risk factors
    this.timeRiskFactors = {
      afterHours: 1.5,    // 50% increase in risk
      weekends: 1.3,      // 30% increase in risk
      holidays: 1.7,      // 70% increase in risk
      lateNight: 2.0      // 100% increase in risk (11PM - 5AM)
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
      confidence: 0,
      analyzedAt: new Date().toISOString()
    };

    try {
      // 1. Content Analysis
      const contentRisk = this.analyzeContent(email);
      analysis.riskScore += contentRisk.score;
      analysis.riskFactors.push(...contentRisk.factors);
      analysis.patterns.push(...contentRisk.patterns);

      // 2. Recipient Analysis
      const recipientRisk = this.analyzeRecipients(email);
      analysis.riskScore += recipientRisk.score;
      analysis.riskFactors.push(...recipientRisk.factors);

      // 3. Timing Analysis
      const timingRisk = this.analyzeTiming(email);
      analysis.riskScore *= timingRisk.multiplier;
      analysis.riskFactors.push(...timingRisk.factors);

      // 4. Attachment Analysis
      const attachmentRisk = this.analyzeAttachments(email);
      analysis.riskScore += attachmentRisk.score;
      analysis.riskFactors.push(...attachmentRisk.factors);

      // 5. Behavioral Analysis (compared to employee's normal patterns)
      const behavioralRisk = this.analyzeBehavioralPattern(email, employeeProfile);
      analysis.riskScore += behavioralRisk.score;
      analysis.riskFactors.push(...behavioralRisk.factors);

      // 6. Sentiment Analysis
      const sentimentRisk = this.analyzeSentiment(email);
      analysis.riskScore += sentimentRisk.score;
      analysis.riskFactors.push(...sentimentRisk.factors);

      // 7. Calculate final risk level and confidence
      analysis.riskScore = Math.min(analysis.riskScore, 100); // Cap at 100
      analysis.riskLevel = this.calculateRiskLevel(analysis.riskScore);
      analysis.confidence = this.calculateConfidence(analysis);
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      console.error('Email risk analysis error:', error);
      return {
        ...analysis,
        error: error.message,
        riskScore: 50, // Default medium risk on error
        riskLevel: 'Medium'
      };
    }
  }

  /**
   * Analyze email content for risk patterns
   */
  analyzeContent(email) {
    const result = { score: 0, factors: [], patterns: [] };
    const content = `${email.subject} ${email.bodyText}`.toLowerCase();
    const tokens = this.tokenizer.tokenize(content);

    // Check for risk patterns
    Object.entries(this.riskPatterns).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        const categoryScore = matches.length * this.getCategoryWeight(category);
        result.score += categoryScore;
        result.factors.push({
          type: 'content',
          category,
          matches,
          score: categoryScore,
          description: `Detected ${category} related keywords: ${matches.join(', ')}`
        });
        result.patterns.push(category);
      }
    });

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(content, tokens);
    result.score += suspiciousPatterns.score;
    result.factors.push(...suspiciousPatterns.factors);

    return result;
  }

  /**
   * Analyze email recipients for external/suspicious contacts
   */
  analyzeRecipients(email) {
    const result = { score: 0, factors: [] };
    const externalRecipients = [];
    const suspiciousRecipients = [];

    email.recipients.forEach(recipient => {
      // Check if recipient is external
      if (!this.isInternalEmail(recipient.email)) {
        externalRecipients.push(recipient.email);
        result.score += 15; // Base score for external communication
      }

      // Check for suspicious domains
      if (this.isSuspiciousDomain(recipient.email)) {
        suspiciousRecipients.push(recipient.email);
        result.score += 25;
      }
    });

    if (externalRecipients.length > 0) {
      result.factors.push({
        type: 'recipients',
        category: 'external',
        score: externalRecipients.length * 15,
        description: `External recipients detected: ${externalRecipients.join(', ')}`,
        recipients: externalRecipients
      });
    }

    if (suspiciousRecipients.length > 0) {
      result.factors.push({
        type: 'recipients',
        category: 'suspicious',
        score: suspiciousRecipients.length * 25,
        description: `Suspicious domains detected: ${suspiciousRecipients.join(', ')}`,
        recipients: suspiciousRecipients
      });
    }

    return result;
  }

  /**
   * Analyze email timing for unusual patterns
   */
  analyzeTiming(email) {
    const result = { multiplier: 1.0, factors: [] };
    const sentTime = new Date(email.sentAt);
    const hour = sentTime.getHours();
    const day = sentTime.getDay();

    // After hours (6PM - 8AM)
    if (hour >= 18 || hour <= 8) {
      result.multiplier *= this.timeRiskFactors.afterHours;
      result.factors.push({
        type: 'timing',
        category: 'after_hours',
        description: `Email sent after hours at ${sentTime.toLocaleTimeString()}`,
        riskMultiplier: this.timeRiskFactors.afterHours
      });
    }

    // Late night (11PM - 5AM)
    if (hour >= 23 || hour <= 5) {
      result.multiplier *= this.timeRiskFactors.lateNight;
      result.factors.push({
        type: 'timing',
        category: 'late_night',
        description: `Email sent during late night hours`,
        riskMultiplier: this.timeRiskFactors.lateNight
      });
    }

    // Weekends
    if (day === 0 || day === 6) {
      result.multiplier *= this.timeRiskFactors.weekends;
      result.factors.push({
        type: 'timing',
        category: 'weekend',
        description: `Email sent on weekend`,
        riskMultiplier: this.timeRiskFactors.weekends
      });
    }

    return result;
  }

  /**
   * Analyze email attachments for risks
   */
  analyzeAttachments(email) {
    const result = { score: 0, factors: [] };
    
    if (!email.attachments || email.attachments.length === 0) {
      return result;
    }

    const riskyExtensions = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar',
      '.zip', '.rar', '.7z', '.tar', '.gz'
    ];

    const largeFileThreshold = 10 * 1024 * 1024; // 10MB

    email.attachments.forEach(attachment => {
      // Check for risky file types
      const extension = attachment.filename.toLowerCase().substr(attachment.filename.lastIndexOf('.'));
      if (riskyExtensions.includes(extension)) {
        result.score += 20;
        result.factors.push({
          type: 'attachment',
          category: 'risky_filetype',
          score: 20,
          description: `Risky file type detected: ${attachment.filename}`,
          filename: attachment.filename,
          extension
        });
      }

      // Check for large files
      if (attachment.size > largeFileThreshold) {
        result.score += 15;
        result.factors.push({
          type: 'attachment',
          category: 'large_file',
          score: 15,
          description: `Large file attachment: ${attachment.filename} (${(attachment.size / 1024 / 1024).toFixed(1)}MB)`,
          filename: attachment.filename,
          size: attachment.size
        });
      }
    });

    return result;
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

  calculateRiskLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

  calculateConfidence(analysis) {
    // Confidence based on number of factors and their consistency
    const factorCount = analysis.riskFactors.length;
    const uniqueCategories = new Set(analysis.riskFactors.map(f => f.category)).size;
    
    let confidence = Math.min(factorCount * 15, 100);
    
    // Boost confidence if multiple categories are involved
    if (uniqueCategories > 3) confidence += 20;
    
    return Math.min(confidence, 100);
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const categories = new Set(analysis.riskFactors.map(f => f.category));

    if (categories.has('external')) {
      recommendations.push({
        type: 'investigate',
        priority: 'high',
        action: 'Review external recipients and verify business purpose',
        description: 'External communication detected requiring verification'
      });
    }

    if (categories.has('financial') || categories.has('dataExfiltration')) {
      recommendations.push({
        type: 'escalate',
        priority: 'critical',
        action: 'Immediate security team notification required',
        description: 'Sensitive data exposure risk detected'
      });
    }

    if (categories.has('after_hours') || categories.has('late_night')) {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        action: 'Monitor employee for unusual work patterns',
        description: 'After-hours activity may indicate stress or malicious intent'
      });
    }

    if (analysis.riskScore > 70) {
      recommendations.push({
        type: 'block',
        priority: 'high',
        action: 'Consider blocking similar communications pending investigation',
        description: 'High risk score warrants immediate attention'
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
}

module.exports = EmailRiskAnalyzer; 