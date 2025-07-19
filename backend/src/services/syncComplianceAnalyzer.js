/**
 * Sync-Triggered Compliance Analyzer
 * Automatically runs AI compliance analysis during/after email sync
 */

const { complianceEngine } = require('./complianceEngine');
const { pool } = require('../utils/database');

class SyncComplianceAnalyzer {
  constructor() {
    this.enabled = process.env.ENABLE_SYNC_COMPLIANCE_ANALYSIS !== 'false';
    this.batchSize = parseInt(process.env.SYNC_ANALYSIS_BATCH_SIZE) || 5;
    this.delayBetweenAnalysis = parseInt(process.env.SYNC_ANALYSIS_DELAY_MS) || 2000;
    this.analysisQueue = new Set();
    this.processing = false;
  }

  /**
   * Queue employee for compliance analysis after email sync
   */
  async queueEmployeeForAnalysis(employeeId, reason = 'email_sync') {
    if (!this.enabled) {
      console.log(`🔄 Sync compliance analysis disabled, skipping employee ${employeeId}`);
      return;
    }

    console.log(`📋 Queuing employee ${employeeId} for AI compliance analysis (${reason})`);
    this.analysisQueue.add(employeeId);

    // Process queue if not already processing
    if (!this.processing) {
      // Small delay to allow batching of multiple employees
      setTimeout(() => this.processAnalysisQueue(), 1000);
    }
  }

  /**
   * Queue multiple employees for batch analysis
   */
  async queueEmployeesForAnalysis(employeeIds, reason = 'batch_sync') {
    if (!this.enabled) {
      console.log(`🔄 Sync compliance analysis disabled, skipping ${employeeIds.length} employees`);
      return;
    }

    console.log(`📋 Queuing ${employeeIds.length} employees for AI compliance analysis (${reason})`);
    employeeIds.forEach(id => this.analysisQueue.add(id));

    if (!this.processing) {
      setTimeout(() => this.processAnalysisQueue(), 2000);
    }
  }

  /**
   * Process the analysis queue in batches
   */
  async processAnalysisQueue() {
    if (this.processing || this.analysisQueue.size === 0) {
      return;
    }

    this.processing = true;
    console.log(`🤖 Processing AI compliance analysis queue: ${this.analysisQueue.size} employees`);

    try {
      const employeeIds = Array.from(this.analysisQueue);
      this.analysisQueue.clear();

      // Process in batches to manage AI API limits
      for (let i = 0; i < employeeIds.length; i += this.batchSize) {
        const batch = employeeIds.slice(i, i + this.batchSize);
        
        console.log(`🔄 Processing compliance analysis batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(employeeIds.length/this.batchSize)}`);
        
        await this.processBatch(batch);
        
        // Delay between batches
        if (i + this.batchSize < employeeIds.length) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenAnalysis));
        }
      }

      console.log(`✅ Completed AI compliance analysis for ${employeeIds.length} employees`);

    } catch (error) {
      console.error('❌ Error processing compliance analysis queue:', error);
    } finally {
      this.processing = false;
      
      // Check if more items were added while processing
      if (this.analysisQueue.size > 0) {
        setTimeout(() => this.processAnalysisQueue(), 3000);
      }
    }
  }

  /**
   * Process a batch of employees for AI compliance analysis
   */
  async processBatch(employeeIds) {
    const results = [];

    for (const employeeId of employeeIds) {
      try {
        console.log(`🧠 Running sync-triggered AI compliance analysis for employee ${employeeId}`);
        
        // Run AI-enhanced compliance evaluation
        const aiCompliance = await complianceEngine.evaluateEmployeeComplianceWithAI(employeeId, {
          includePredictive: true,
          syncTriggered: true
        });

        // Store sync analysis results
        await this.storeSyncAnalysisResults(employeeId, aiCompliance);

        // Check for high-risk findings that need immediate attention
        await this.checkForImmediateAlerts(employeeId, aiCompliance);

        results.push({
          employeeId,
          success: true,
          riskScore: aiCompliance.intelligentRiskScore,
          status: aiCompliance.enhancedOverallStatus
        });

        console.log(`✅ Employee ${employeeId}: Risk ${aiCompliance.intelligentRiskScore} (${aiCompliance.enhancedOverallStatus})`);

      } catch (error) {
        console.error(`❌ Sync compliance analysis failed for employee ${employeeId}:`, error);
        results.push({
          employeeId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Store sync-triggered analysis results
   */
  async storeSyncAnalysisResults(employeeId, aiCompliance) {
    try {
      // Update employee with latest AI compliance data
      await pool.query(`
        UPDATE employees 
        SET 
          ai_compliance_score = $1,
          ai_compliance_status = $2,
          ai_last_analyzed = NOW(),
          ai_risk_trend = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        aiCompliance.intelligentRiskScore,
        aiCompliance.enhancedOverallStatus,
        aiCompliance.riskTrend || 'unknown',
        employeeId
      ]);

      // Store detailed analysis results in compliance log
      await pool.query(`
        INSERT INTO compliance_analysis_log (
          employee_id, 
          analysis_type, 
          trigger_source,
          ai_risk_score, 
          traditional_risk_score,
          behavioral_patterns, 
          contextual_violations,
          predictive_risks, 
          ai_recommendations,
          confidence_score,
          analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (employee_id, analysis_type) 
        DO UPDATE SET
          ai_risk_score = EXCLUDED.ai_risk_score,
          traditional_risk_score = EXCLUDED.traditional_risk_score,
          behavioral_patterns = EXCLUDED.behavioral_patterns,
          contextual_violations = EXCLUDED.contextual_violations,
          predictive_risks = EXCLUDED.predictive_risks,
          ai_recommendations = EXCLUDED.ai_recommendations,
          confidence_score = EXCLUDED.confidence_score,
          analyzed_at = EXCLUDED.analyzed_at
      `, [
        employeeId,
        'ai_enhanced_sync',
        'email_sync',
        aiCompliance.intelligentRiskScore,
        aiCompliance.overallRiskScore || 0,
        JSON.stringify(aiCompliance.behavioralAnalysis || {}),
        JSON.stringify(aiCompliance.contextualViolations || []),
        JSON.stringify(aiCompliance.predictiveRisks || []),
        JSON.stringify(aiCompliance.aiRecommendations || []),
        aiCompliance.aiConfidence || 0
      ]);

    } catch (error) {
      console.error(`Error storing sync analysis results for employee ${employeeId}:`, error);
    }
  }

  /**
   * Check for high-risk findings that need immediate alerts
   */
  async checkForImmediateAlerts(employeeId, aiCompliance) {
    const highRiskThreshold = 80;
    const criticalPredictiveRisk = 0.8;

    try {
      // High overall risk score
      if (aiCompliance.intelligentRiskScore >= highRiskThreshold) {
        await this.createImmediateAlert(employeeId, 'high_compliance_risk', {
          riskScore: aiCompliance.intelligentRiskScore,
          status: aiCompliance.enhancedOverallStatus,
          reason: 'AI compliance analysis detected high risk score'
        });
      }

      // Critical predictive risks
      const criticalPredictiveRisks = aiCompliance.predictiveRisks?.filter(risk => 
        risk.probability >= criticalPredictiveRisk
      ) || [];

      if (criticalPredictiveRisks.length > 0) {
        await this.createImmediateAlert(employeeId, 'critical_predictive_risk', {
          risks: criticalPredictiveRisks,
          reason: 'AI predicted high-probability compliance violations'
        });
      }

      // Multiple contextual violations
      if (aiCompliance.contextualViolations?.length >= 3) {
        await this.createImmediateAlert(employeeId, 'multiple_violations', {
          violationCount: aiCompliance.contextualViolations.length,
          violations: aiCompliance.contextualViolations,
          reason: 'Multiple contextual compliance violations detected'
        });
      }

    } catch (error) {
      console.error(`Error checking immediate alerts for employee ${employeeId}:`, error);
    }
  }

  /**
   * Create immediate alert for high-risk findings
   */
  async createImmediateAlert(employeeId, alertType, details) {
    try {
      await pool.query(`
        INSERT INTO compliance_alerts (
          employee_id,
          alert_type,
          severity,
          title,
          description,
          details,
          triggered_by,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        employeeId,
        alertType,
        'high',
        this.getAlertTitle(alertType),
        this.getAlertDescription(alertType, details),
        JSON.stringify(details),
        'sync_ai_analysis',
        'active'
      ]);

      console.log(`🚨 Created immediate alert for employee ${employeeId}: ${alertType}`);

    } catch (error) {
      console.error(`Error creating immediate alert:`, error);
    }
  }

  getAlertTitle(alertType) {
    const titles = {
      'high_compliance_risk': 'High AI Compliance Risk Detected',
      'critical_predictive_risk': 'Critical Future Compliance Risk Predicted',
      'multiple_violations': 'Multiple Compliance Violations Detected'
    };
    return titles[alertType] || 'Compliance Alert';
  }

  getAlertDescription(alertType, details) {
    const descriptions = {
      'high_compliance_risk': `Employee compliance risk score of ${details.riskScore} requires immediate review`,
      'critical_predictive_risk': `AI predicts ${details.risks?.length || 0} high-probability compliance violations`,
      'multiple_violations': `${details.violationCount} contextual compliance violations detected`
    };
    return descriptions[alertType] || 'Compliance issue detected during sync analysis';
  }

  /**
   * Trigger analysis for employees with recent email activity
   */
  async analyzeRecentEmailActivity(hoursBack = 24) {
    if (!this.enabled) return;

    console.log(`🔍 Analyzing employees with email activity in last ${hoursBack} hours`);

    try {
      const result = await pool.query(`
        SELECT DISTINCT sender_employee_id as employee_id
        FROM email_communications 
        WHERE sent_at >= NOW() - INTERVAL '${hoursBack} hours'
          AND sender_employee_id IS NOT NULL
        ORDER BY sender_employee_id
      `);

      const employeeIds = result.rows.map(row => row.employee_id);
      
      if (employeeIds.length > 0) {
        await this.queueEmployeesForAnalysis(employeeIds, 'recent_email_activity');
      }

    } catch (error) {
      console.error('Error analyzing recent email activity:', error);
    }
  }

  /**
   * Get sync analysis statistics
   */
  async getSyncAnalysisStats() {
    try {
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_analyses,
          COUNT(CASE WHEN ai_risk_score >= 80 THEN 1 END) as high_risk_count,
          AVG(ai_risk_score) as avg_risk_score,
          MAX(analyzed_at) as last_analysis,
          COUNT(CASE WHEN analyzed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as analyses_24h
        FROM compliance_analysis_log 
        WHERE analysis_type = 'ai_enhanced_sync'
      `);

      const alertsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_alerts,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts
        FROM compliance_alerts 
        WHERE triggered_by = 'sync_ai_analysis'
      `);

      return {
        analyses: statsResult.rows[0],
        alerts: alertsResult.rows[0],
        queueStatus: {
          queueSize: this.analysisQueue.size,
          processing: this.processing,
          enabled: this.enabled
        }
      };

    } catch (error) {
      console.error('Error getting sync analysis stats:', error);
      return null;
    }
  }
}

// Singleton instance
const syncComplianceAnalyzer = new SyncComplianceAnalyzer();

module.exports = {
  SyncComplianceAnalyzer,
  syncComplianceAnalyzer
}; 