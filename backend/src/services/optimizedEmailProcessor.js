const OptimizedEmailAnalyzer = require('./optimizedEmailAnalyzer');
const { query } = require('../utils/database');

/**
 * Optimized Email Processor with Compliance Integration
 * 
 * Orchestrates the complete email processing pipeline:
 * 1. Email analysis (security + compliance)
 * 2. Database storage with compliance metadata
 * 3. Violation detection and creation (security + compliance)
 * 4. Employee risk scoring with compliance factors
 * 5. Policy evaluation and action triggering
 */
class OptimizedEmailProcessor {
  constructor() {
    this.analyzer = new OptimizedEmailAnalyzer();
  }

  /**
   * Process email with comprehensive security and compliance analysis
   */
  async processEmail(emailData, employeeId, integrationSource = 'office365') {
    console.log(`📧 Processing email with compliance analysis: ${emailData.subject?.substring(0, 50) || 'No subject'}...`);
    
    try {
      // Get employee profile for compliance context
      const employeeProfile = await this.getEmployeeProfile(employeeId);
      
      // Analyze email with enhanced compliance capabilities
      const analysis = await this.analyzer.analyzeEmail(emailData, employeeProfile);
      
      console.log(`🔍 Analysis completed - Security: ${analysis.securityRiskScore || analysis.riskScore}%, Compliance: ${analysis.complianceRiskScore || 0}%`);
      
      // Store email with compliance metadata
      const storedEmailId = await this.storeEmailInDatabase(emailData, employeeId, integrationSource, analysis);
      
      // Check for violations (security + compliance)
      const violationCreated = await this.checkForViolations(emailData, analysis, employeeId);
      
      // Update employee risk score with compliance factors
      await this.updateEmployeeRiskScore(employeeId);
      
      return {
        success: true,
        emailId: storedEmailId,
        analysis: {
          securityRiskScore: analysis.securityRiskScore || analysis.riskScore,
          complianceRiskScore: analysis.complianceRiskScore || 0,
          totalRiskScore: analysis.riskScore,
          method: analysis.method,
          violations: analysis.violations || [],
          regulatoryFindings: analysis.regulatoryFindings || {},
          policyViolations: analysis.policyViolations || {}
        },
        violationCreated,
        optimized: true
      };

    } catch (error) {
      console.error(`❌ Error processing email:`, error);
      return {
        success: false,
        error: error.message,
        optimized: true
      };
    }
  }

  /**
   * Get employee profile with compliance information
   */
  async getEmployeeProfile(employeeId) {
    try {
      const result = await query(`
        SELECT 
          e.id, e.name, e.email, e.department, e.job_title,
          e.compliance_profile_id, e.risk_score as currentRiskScore,
          cp.profile_name as complianceProfileName,
          cp.monitoring_level, cp.data_classification,
          cp.applicable_regulations, cp.applicable_policies
        FROM employees e
        LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
        WHERE e.id = $1
      `, [employeeId]);

      if (result.rows.length > 0) {
        const employee = result.rows[0];
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          jobTitle: employee.job_title,
          currentRiskScore: employee.currentriskscore,
          complianceProfileId: employee.compliance_profile_id,
          complianceProfile: employee.complianceprofilename,
          monitoringLevel: employee.monitoring_level,
          dataClassification: employee.data_classification,
          applicableRegulations: employee.applicable_regulations || [],
          applicablePolicies: employee.applicable_policies || []
        };
      }

      return { id: employeeId }; // Minimal fallback

    } catch (error) {
      console.error(`Error getting employee profile for ${employeeId}:`, error);
      return { id: employeeId };
    }
  }

  /**
   * Store email with enhanced compliance metadata
   */
  async storeEmailInDatabase(emailData, employeeId, integrationSource, analysis) {
    console.log(`💾 Storing email with compliance metadata...`);

    try {
      // Prepare enhanced risk flags with compliance data
      const enhancedRiskFlags = {
        // Enhanced analysis data
        enhanced_analysis: {
          riskFactors: analysis.riskFactors,
          patterns: analysis.patterns,
          confidence: analysis.confidence,
          recommendations: analysis.recommendations,
          detectionMethod: analysis.method,
          databaseCategoriesUsed: analysis.databaseCategoriesUsed,
          categoryAnalysis: analysis.categoryAnalysis,
          analyzedAt: analysis.analyzedAt
        },
        // Compliance-specific metadata
        compliance_analysis: {
          complianceRiskScore: analysis.complianceRiskScore || 0,
          violations: analysis.violations || [],
          regulatoryFindings: analysis.regulatoryFindings || {},
          policyViolations: analysis.policyViolations || {},
          complianceMethod: analysis.detectionMethod
        },
        // Optimization metadata
        optimization: {
          processingMethod: analysis.method,
          rulesFiltered: analysis.method === 'rules_only' || analysis.method === 'rules_compliance_only',
          patternAnalyzed: analysis.method.includes('pattern'),
          llmProcessed: analysis.method.includes('llm'),
          cached: analysis.method === 'cached_pattern',
          optimized: true,
          complianceEnabled: true
        },
        // Legacy compatibility
        riskLevel: analysis.riskLevel,
        confidence: analysis.confidence,
        analyzed_by: 'optimized_compliance_analyzer_v2'
      };

      // Insert email record with compliance metadata
      const result = await query(`
        INSERT INTO email_communications (
          sender_employee_id, sender_email, recipients, subject, body_text, sent_at,
          message_id, thread_id, risk_score, risk_flags,
          integration_source, is_analyzed, analyzer_version,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING id
      `, [
        employeeId,
        emailData.sender?.email || 'unknown@example.com',
        JSON.stringify(emailData.recipient || emailData.recipients || []),
        emailData.subject || '',
        emailData.body || emailData.bodyText || '',
        emailData.sentAt || new Date(),
        emailData.messageId || '',
        emailData.threadId || '',
        analysis.riskScore || 0,
        JSON.stringify(enhancedRiskFlags),
        integrationSource,
        true,
        '2.0-compliance-enhanced'
      ]);

      const emailId = result.rows[0].id;
      console.log(`✅ Email stored with ID ${emailId} (compliance risk: ${analysis.complianceRiskScore || 0}%)`);
      return emailId;

    } catch (error) {
      console.error(`❌ Error storing email in database:`, error);
      throw error;
    }
  }

  /**
   * Check for violations including compliance violations
   */
  async checkForViolations(emailData, analysis, employeeId) {
    try {
      const violationsCreated = [];

      // Create security violations for high-risk emails
      if ((analysis.securityRiskScore || analysis.riskScore) >= 70 && employeeId) {
        const securityViolation = await this.createSecurityViolation(emailData, analysis, employeeId);
        if (securityViolation) {
          violationsCreated.push(securityViolation);
        }
      }

      // Create compliance violations
      if (analysis.violations && analysis.violations.length > 0) {
        for (const violation of analysis.violations) {
          const complianceViolation = await this.createComplianceViolation(emailData, violation, analysis, employeeId);
          if (complianceViolation) {
            violationsCreated.push(complianceViolation);
          }
        }
      }

      // Create specific regulatory violations
      if (analysis.regulatoryFindings) {
        for (const [regulationCode, finding] of Object.entries(analysis.regulatoryFindings)) {
          if (finding.violations && finding.violations.length > 0) {
            for (const regViolation of finding.violations) {
              const violation = await this.createRegulatoryViolation(emailData, regViolation, finding, analysis, employeeId);
              if (violation) {
                violationsCreated.push(violation);
              }
            }
          }
        }
      }

      // Create policy violations
      if (analysis.policyViolations) {
        for (const [policyCode, policyViolation] of Object.entries(analysis.policyViolations)) {
          if (policyViolation.violations && policyViolation.violations.length > 0) {
            for (const polViolation of policyViolation.violations) {
              const violation = await this.createPolicyViolation(emailData, polViolation, policyViolation, analysis, employeeId);
              if (violation) {
                violationsCreated.push(violation);
              }
            }
          }
        }
      }

      if (violationsCreated.length > 0) {
        console.log(`🚨 Created ${violationsCreated.length} violations (security + compliance)`);
      }

      return violationsCreated.length > 0;

    } catch (error) {
      console.error(`❌ Error creating violations:`, error);
      return false;
    }
  }

  /**
   * Create security violation
   */
  async createSecurityViolation(emailData, analysis, employeeId) {
    try {
      const violationType = this.determineSecurityViolationType(analysis);

      const violationResult = await query(`
        INSERT INTO violations (
          employee_id, type, severity, description,
          source, metadata, status, compliance_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        employeeId,
        violationType,
        (analysis.securityRiskScore || analysis.riskScore) >= 90 ? 'Critical' :
        (analysis.securityRiskScore || analysis.riskScore) >= 80 ? 'High' : 'Medium',
        `Security analysis detected: ${emailData.subject}`,
        'optimized_security_analysis',
        JSON.stringify({
          emailId: emailData.messageId,
          securityRiskScore: analysis.securityRiskScore || analysis.riskScore,
          riskFactors: analysis.riskFactors,
          detectionMethod: analysis.method,
          categoryAnalysis: analysis.categoryAnalysis,
          optimized: true,
          processingDate: new Date().toISOString()
        }),
        'Active',
        'security'
      ]);

      const violationId = violationResult.rows[0].id;
      await this.triggerPolicyEvaluation(violationId, employeeId);
      return violationId;

    } catch (error) {
      console.error(`❌ Error creating security violation:`, error);
      return null;
    }
  }

  /**
   * Create compliance violation
   */
  async createComplianceViolation(emailData, violation, analysis, employeeId) {
    try {
      const violationResult = await query(`
        INSERT INTO violations (
          employee_id, type, severity, description,
          source, metadata, status, compliance_category,
          regulatory_impact, policy_references
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        employeeId,
        violation.type,
        violation.severity,
        violation.description,
        'compliance_analysis',
        JSON.stringify({
          emailId: emailData.messageId,
          complianceRiskScore: analysis.complianceRiskScore,
          riskScore: analysis.complianceRiskScore, // Alias for UI compatibility
          category: violation.category,
          violationCategory: violation.category,
          emailSubject: emailData.subject || emailData.subjectText || '',
          regulationCode: violation.type,
          detectionMethod: analysis.method,
          article: violation.article,
          requirement: violation.requirement,
          section: violation.section,
          rule: violation.rule,
          policySection: violation.policySection,
          processingDate: new Date().toISOString()
        }),
        'Active',
        violation.category,
        JSON.stringify({
          regulation: violation.type,
          impact: violation.severity,
          requiresNotification: violation.severity === 'Critical'
        }),
        violation.article || violation.requirement || violation.section ? 
          [violation.article || violation.requirement || violation.section] : []
      ]);

      const violationId = violationResult.rows[0].id;
      console.log(`🏛️ Created compliance violation ${violationId} (${violation.type}): ${violation.description}`);
      
      await this.triggerPolicyEvaluation(violationId, employeeId);
      return violationId;

    } catch (error) {
      console.error(`❌ Error creating compliance violation:`, error);
      return null;
    }
  }

  /**
   * Create regulatory violation
   */
  async createRegulatoryViolation(emailData, violation, finding, analysis, employeeId) {
    try {
      const violationResult = await query(`
        INSERT INTO violations (
          employee_id, type, severity, description,
          source, metadata, status, compliance_category,
          regulatory_impact, requires_notification, notification_timeline_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        employeeId,
        violation.type,
        violation.severity,
        violation.description,
        'regulatory_compliance_analysis',
        JSON.stringify({
          emailId: emailData.messageId,
          regulationCode: finding.regulationCode,
          riskScore: finding.riskScore,
          article: violation.article,
          requirement: violation.requirement,
          section: violation.section,
          rule: violation.rule,
          detectionMethod: analysis.method,
          processingDate: new Date().toISOString()
        }),
        'Active',
        violation.category,
        JSON.stringify({
          regulation: finding.regulationCode,
          impact: violation.severity,
          complianceFramework: finding.regulationCode.toUpperCase()
        }),
        violation.severity === 'Critical',
        this.getNotificationTimeline(finding.regulationCode, violation.severity)
      ]);

      const violationId = violationResult.rows[0].id;
      console.log(`⚖️ Created regulatory violation ${violationId} (${finding.regulationCode.toUpperCase()}): ${violation.description}`);
      
      await this.triggerPolicyEvaluation(violationId, employeeId);
      return violationId;

    } catch (error) {
      console.error(`❌ Error creating regulatory violation:`, error);
      return null;
    }
  }

  /**
   * Create policy violation
   */
  async createPolicyViolation(emailData, violation, policyViolation, analysis, employeeId) {
    try {
      const violationResult = await query(`
        INSERT INTO violations (
          employee_id, type, severity, description,
          source, metadata, status, compliance_category,
          policy_references
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        employeeId,
        violation.type,
        violation.severity,
        violation.description,
        'policy_compliance_analysis',
        JSON.stringify({
          emailId: emailData.messageId,
          policyCode: policyViolation.policyCode,
          riskScore: policyViolation.riskScore,
          policySection: violation.policySection,
          detectionMethod: analysis.method,
          processingDate: new Date().toISOString()
        }),
        'Active',
        violation.category,
        [policyViolation.policyCode]
      ]);

      const violationId = violationResult.rows[0].id;
      console.log(`📋 Created policy violation ${violationId} (${policyViolation.policyCode}): ${violation.description}`);
      
      await this.triggerPolicyEvaluation(violationId, employeeId);
      return violationId;

    } catch (error) {
      console.error(`❌ Error creating policy violation:`, error);
      return null;
    }
  }

  /**
   * Get notification timeline based on regulation
   */
  getNotificationTimeline(regulationCode, severity) {
    const timelines = {
      'gdpr': severity === 'Critical' ? 72 : 168, // 72 hours for breaches, 7 days otherwise
      'hipaa': severity === 'Critical' ? 60 : 168, // 60 days for breaches  
      'pci_dss': severity === 'Critical' ? 24 : 72, // 24 hours for critical
      'sox': severity === 'Critical' ? 24 : 168 // 24 hours for critical financial issues
    };

    return timelines[regulationCode] || 168; // Default 7 days
  }

  /**
   * Trigger policy evaluation for violations
   */
  async triggerPolicyEvaluation(violationId, employeeId) {
    try {
      const policyEvaluationEngine = require('./policyEvaluationEngine');
      const policiesTriggered = await policyEvaluationEngine.evaluatePoliciesForViolation(violationId, employeeId);
      if (policiesTriggered > 0) {
        console.log(`🔥 Policy evaluation triggered ${policiesTriggered} policies for violation ${violationId}`);
      }
    } catch (policyError) {
      console.error(`❌ Failed to evaluate policies for violation ${violationId}:`, policyError);
    }
  }

  /**
   * Determine security violation type from optimized analysis
   */
  determineSecurityViolationType(analysis) {
    // Use database category analysis first (more accurate)
    if (analysis.categoryAnalysis && analysis.categoryAnalysis.length > 0) {
      const significantCategories = analysis.categoryAnalysis
        .filter(c => (c.finalRiskScore || c.riskScore || 0) >= 30)
        .sort((a, b) => (b.finalRiskScore || b.riskScore) - (a.finalRiskScore || a.riskScore));

      if (significantCategories.length > 0) {
        return significantCategories[0].categoryName;
      }
    }

    // Fallback to risk factors analysis
    const factors = analysis.riskFactors.join(' ').toLowerCase();
    
    if (factors.includes('data') || factors.includes('exfiltration')) {
      return 'Data Exfiltration';
    } else if (factors.includes('external') || factors.includes('unauthorized')) {
      return 'Unauthorized Communication';
    } else if (factors.includes('competitor') || factors.includes('confidential')) {
      return 'Information Disclosure';
    } else if (factors.includes('termination') || factors.includes('resignation')) {
      return 'Employment Risk';
    } else {
      return 'Security Policy Violation';
    }
  }

  /**
   * Update employee risk score with compliance factors
   */
  async updateEmployeeRiskScore(employeeId) {
    try {
      // Get employee's recent email risk scores (last 30 days)
      const emailRisksResult = await query(`
        SELECT risk_score, sent_at, analyzer_version, risk_flags
        FROM email_communications 
        WHERE sender_employee_id = $1 
          AND sent_at >= NOW() - INTERVAL '30 days'
          AND is_analyzed = true
        ORDER BY sent_at DESC
        LIMIT 50
      `, [employeeId]);

      if (emailRisksResult.rows.length === 0) {
        return; // No emails to base risk on
      }

      const emailRisks = emailRisksResult.rows;
      
      // Calculate weighted risk score (recent emails have more weight, compliance-enhanced analysis has higher confidence)
      let totalWeightedScore = 0;
      let totalWeight = 0;
      let complianceRiskTotal = 0;
      let complianceCount = 0;
      
      emailRisks.forEach((email, index) => {
        const age = index + 1; // 1 = most recent
        const ageWeight = Math.max(1, 10 - age * 0.2); // More recent = higher weight
        
        // Enhanced analyzers get higher confidence weight
        const analyzerWeight = email.analyzer_version?.includes('compliance') ? 1.5 : 
                             email.analyzer_version?.includes('2.0') ? 1.2 : 1.0;
        
        const emailWeight = ageWeight * analyzerWeight;
        
        totalWeightedScore += (email.risk_score || 0) * emailWeight;
        totalWeight += emailWeight;

        // Extract compliance risk if available
        try {
          const riskFlags = typeof email.risk_flags === 'string' ? 
            JSON.parse(email.risk_flags) : email.risk_flags;
          
          if (riskFlags?.compliance_analysis?.complianceRiskScore) {
            complianceRiskTotal += riskFlags.compliance_analysis.complianceRiskScore;
            complianceCount++;
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      const emailBasedRiskScore = Math.round(totalWeightedScore / totalWeight);
      const averageComplianceRisk = complianceCount > 0 ? Math.round(complianceRiskTotal / complianceCount) : 0;

      // Get violation-based risk
      const violationsResult = await query(`
        SELECT COUNT(*) as total_count,
               COUNT(CASE WHEN severity = 'Critical' THEN 1 END) as critical_count,
               COUNT(CASE WHEN severity = 'High' THEN 1 END) as high_count,
               COUNT(CASE WHEN compliance_category IS NOT NULL THEN 1 END) as compliance_count
        FROM violations 
        WHERE employee_id = $1 
          AND created_at >= NOW() - INTERVAL '30 days'
          AND status = 'Active'
      `, [employeeId]);

      const violations = violationsResult.rows[0];
      const violationRiskScore = Math.min(
        (violations.critical_count * 25) + 
        (violations.high_count * 15) + 
        (violations.total_count * 5), 
        50
      );

      // Calculate compliance adjustment
      const complianceAdjustment = Math.min(averageComplianceRisk * 0.3, 20);

      // Combine all risk factors
      let finalRiskScore = Math.round(
        (emailBasedRiskScore * 0.6) + 
        (violationRiskScore * 0.3) + 
        (complianceAdjustment * 0.1)
      );

      // Apply compliance violation penalty
      if (violations.compliance_count > 0) {
        finalRiskScore += Math.min(violations.compliance_count * 5, 15);
      }

      // Ensure score is within bounds
      finalRiskScore = Math.max(0, Math.min(100, finalRiskScore));

      // Determine risk level with compliance considerations
      let riskLevel;
      if (finalRiskScore >= 80 || violations.critical_count > 0) riskLevel = 'Critical';
      else if (finalRiskScore >= 60 || violations.high_count > 1) riskLevel = 'High';
      else if (finalRiskScore >= 30 || violations.total_count > 2) riskLevel = 'Medium';
      else riskLevel = 'Low';

      // Update employee record
      await query(`
        UPDATE employees 
        SET 
          risk_score = $1, 
          risk_level = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [finalRiskScore, riskLevel, employeeId]);

      console.log(`👤 Updated employee ${employeeId} risk: ${finalRiskScore}% (${riskLevel}) - Compliance: ${averageComplianceRisk}%`);

    } catch (error) {
      console.error(`❌ Error updating employee risk score for ${employeeId}:`, error);
    }
  }

  /**
   * Helper: Get employee department
   */
  async getEmployeeDepartment(employeeId) {
    try {
      const result = await query(`
        SELECT department FROM employees WHERE id = $1
      `, [employeeId]);
      
      return result.rows[0]?.department || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get analyzer statistics
   */
  getAnalyzerStats() {
    return this.analyzer.getStats();
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return this.getAnalyzerStats();
  }

  /**
   * Reset analyzer statistics
   */
  resetStats() {
    // Reset analyzer stats if the method exists
    if (this.analyzer.processingStats) {
      this.analyzer.processingStats = {
        totalProcessed: 0,
        rulesFiltered: 0,
        patternFiltered: 0,
        llmProcessed: 0,
        cached: 0,
        costSaved: 0,
        complianceViolations: 0
      };
    }
  }
}

module.exports = OptimizedEmailProcessor;