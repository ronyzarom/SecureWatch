/**
 * SecureWatch Compliance Engine
 * Evaluates regulatory compliance and internal policy adherence
 * Handles GDPR, SOX, HIPAA, PCI DSS and custom organizational policies
 */

const { pool } = require('../utils/database');

class ComplianceEngine {
  constructor() {
    this.activeRegulations = new Map();
    this.activePolicies = new Map();
    this.complianceProfiles = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the compliance engine with current configurations
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Compliance Engine...');

      // Load active regulations
      const regulationsResult = await pool.query(`
        SELECT id, regulation_code, regulation_name, configuration, region
        FROM compliance_regulations 
        WHERE is_active = true
      `);

      this.activeRegulations.clear();
      for (const reg of regulationsResult.rows) {
        this.activeRegulations.set(reg.regulation_code, {
          id: reg.id,
          name: reg.regulation_name,
          config: reg.configuration,
          region: reg.region
        });
      }

      // Load active internal policies
      const policiesResult = await pool.query(`
        SELECT id, policy_code, policy_name, configuration, 
               applies_to_departments, applies_to_roles, priority_order
        FROM internal_policies 
        WHERE is_active = true 
        ORDER BY priority_order ASC
      `);

      this.activePolicies.clear();
      for (const policy of policiesResult.rows) {
        this.activePolicies.set(policy.policy_code, {
          id: policy.id,
          name: policy.policy_name,
          config: policy.configuration,
          departments: policy.applies_to_departments,
          roles: policy.applies_to_roles,
          priority: policy.priority_order
        });
      }

      // Load compliance profiles
      const profilesResult = await pool.query(`
        SELECT id, profile_name, applicable_regulations, applicable_policies,
               retention_period_years, monitoring_level, data_classification,
               configuration_overrides
        FROM compliance_profiles
      `);

      this.complianceProfiles.clear();
      for (const profile of profilesResult.rows) {
        this.complianceProfiles.set(profile.id, {
          name: profile.profile_name,
          regulations: profile.applicable_regulations || [],
          policies: profile.applicable_policies || [],
          retentionYears: profile.retention_period_years,
          monitoringLevel: profile.monitoring_level,
          dataClassification: profile.data_classification,
          overrides: profile.configuration_overrides || {}
        });
      }

      this.initialized = true;
      console.log(`✅ Compliance Engine initialized:`);
      console.log(`   - ${this.activeRegulations.size} active regulations`);
      console.log(`   - ${this.activePolicies.size} active policies`);
      console.log(`   - ${this.complianceProfiles.size} compliance profiles`);

    } catch (error) {
      console.error('❌ Failed to initialize Compliance Engine:', error);
      throw error;
    }
  }

  /**
   * Evaluate compliance for a specific employee
   */
  async evaluateEmployeeCompliance(employeeId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get employee data with compliance information
      const employeeResult = await pool.query(`
        SELECT e.*, cp.profile_name, cp.applicable_regulations, cp.applicable_policies,
               cp.retention_period_years, cp.monitoring_level, cp.data_classification
        FROM employees e
        LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
        WHERE e.id = $1
      `, [employeeId]);

      if (employeeResult.rows.length === 0) {
        throw new Error(`Employee ${employeeId} not found`);
      }

      const employee = employeeResult.rows[0];
      const compliance = {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        complianceProfile: employee.profile_name,
        evaluatedAt: new Date(),
        regulations: {},
        policies: {},
        overallStatus: 'compliant',
        violations: [],
        recommendations: [],
        retentionRequirements: {}
      };

      // Evaluate regulatory compliance
      const applicableRegulations = employee.applicable_regulations || [];
      for (const regId of applicableRegulations) {
        const regCode = this.getRegulationCodeById(regId);
        if (regCode && this.activeRegulations.has(regCode)) {
          compliance.regulations[regCode] = await this.evaluateRegulation(employee, regCode);
        }
      }

      // Evaluate internal policy compliance
      const applicablePolicies = employee.applicable_policies || [];
      for (const policyId of applicablePolicies) {
        const policyCode = this.getPolicyCodeById(policyId);
        if (policyCode && this.activePolicies.has(policyCode)) {
          compliance.policies[policyCode] = await this.evaluatePolicy(employee, policyCode);
        }
      }

      // Calculate retention requirements
      compliance.retentionRequirements = this.calculateRetentionRequirements(employee, compliance);

      // Determine overall compliance status
      compliance.overallStatus = this.calculateOverallStatus(compliance);

      // Generate recommendations
      compliance.recommendations = this.generateRecommendations(employee, compliance);

      return compliance;

    } catch (error) {
      console.error(`❌ Failed to evaluate compliance for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate specific regulation compliance
   */
  async evaluateRegulation(employee, regulationCode) {
    const regulation = this.activeRegulations.get(regulationCode);
    if (!regulation) {
      return { status: 'not_applicable', violations: [] };
    }

    const evaluation = {
      name: regulation.name,
      status: 'compliant',
      violations: [],
      requirements: [],
      lastEvaluated: new Date()
    };

    switch (regulationCode) {
      case 'gdpr':
        return await this.evaluateGDPR(employee, regulation, evaluation);
      case 'sox':
        return await this.evaluateSOX(employee, regulation, evaluation);
      case 'hipaa':
        return await this.evaluateHIPAA(employee, regulation, evaluation);
      case 'pci_dss':
        return await this.evaluatePCIDSS(employee, regulation, evaluation);
      default:
        evaluation.status = 'unknown';
        evaluation.violations.push('Unknown regulation type');
        return evaluation;
    }
  }

  /**
   * GDPR Compliance Evaluation
   */
  async evaluateGDPR(employee, regulation, evaluation) {
    const config = regulation.config;
    
    // Check data retention compliance
    if (employee.data_retention_until) {
      const retentionDate = new Date(employee.data_retention_until);
      const now = new Date();
      
      if (retentionDate < now) {
        evaluation.violations.push({
          type: 'data_retention_overdue',
          message: 'Employee data retention period has expired',
          severity: 'high',
          dueDate: retentionDate
        });
        evaluation.status = 'non_compliant';
      }
    }

    // Check if employee has been reviewed for data processing
    if (!employee.last_compliance_review) {
      evaluation.violations.push({
        type: 'missing_data_review',
        message: 'Employee data processing has not been reviewed',
        severity: 'medium'
      });
      evaluation.status = 'non_compliant';
    }

    // Check for explicit consent (if required by configuration)
    if (config.explicit_consent_required && !employee.regulatory_status?.gdpr_consent) {
      evaluation.violations.push({
        type: 'missing_consent',
        message: 'GDPR consent not documented',
        severity: 'high'
      });
      evaluation.status = 'non_compliant';
    }

    evaluation.requirements = [
      'Data subject rights must be respected',
      'Data retention limits must be enforced',
      'Privacy by design principles applied',
      'Breach notification within 72 hours'
    ];

    return evaluation;
  }

  /**
   * SOX Compliance Evaluation  
   */
  async evaluateSOX(employee, regulation, evaluation) {
    const config = regulation.config;

    // Check if employee has access to financial systems
    if (employee.department === 'Finance' || employee.role?.includes('Financial')) {
      // Check for segregation of duties
      const conflictingAccess = await this.checkSegregationOfDuties(employee.id);
      if (conflictingAccess.length > 0) {
        evaluation.violations.push({
          type: 'segregation_violation',
          message: 'Employee has conflicting financial system access',
          severity: 'critical',
          details: conflictingAccess
        });
        evaluation.status = 'non_compliant';
      }

      // Check audit trail requirements
      const auditTrail = await this.checkAuditTrail(employee.id);
      if (!auditTrail.sufficient) {
        evaluation.violations.push({
          type: 'insufficient_audit_trail',
          message: 'Audit trail for financial activities is insufficient',
          severity: 'high'
        });
        evaluation.status = 'non_compliant';
      }
    }

    evaluation.requirements = [
      'Segregation of duties enforcement',
      'Complete audit trails for 7 years',
      'Access controls and reviews',
      'Financial reporting accuracy controls'
    ];

    return evaluation;
  }

  /**
   * HIPAA Compliance Evaluation
   */
  async evaluateHIPAA(employee, regulation, evaluation) {
    // Check if employee handles PHI (Protected Health Information)
    const handlesPHI = employee.department === 'Healthcare' || 
                      employee.role?.includes('Medical') ||
                      employee.data_classification === 'restricted';

    if (handlesPHI) {
      // Check for required HIPAA training
      if (!employee.regulatory_status?.hipaa_training_completed) {
        evaluation.violations.push({
          type: 'missing_hipaa_training',
          message: 'HIPAA training not completed',
          severity: 'high'
        });
        evaluation.status = 'non_compliant';
      }

      // Check minimum necessary access principle
      const accessLevel = employee.regulatory_status?.phi_access_level;
      if (!accessLevel || accessLevel === 'unrestricted') {
        evaluation.violations.push({
          type: 'excessive_phi_access',
          message: 'PHI access level not properly restricted',
          severity: 'medium'
        });
        evaluation.status = 'non_compliant';
      }
    }

    evaluation.requirements = [
      'HIPAA training and awareness',
      'Minimum necessary access to PHI',
      'Encrypted data transmission',
      'Breach notification procedures'
    ];

    return evaluation;
  }

  /**
   * PCI DSS Compliance Evaluation
   */
  async evaluatePCIDSS(employee, regulation, evaluation) {
    // Check if employee handles cardholder data
    const handlesCardData = employee.department === 'Payments' ||
                           employee.department === 'E-commerce' ||
                           employee.role?.includes('Payment');

    if (handlesCardData) {
      // Check for PCI training
      if (!employee.regulatory_status?.pci_training_completed) {
        evaluation.violations.push({
          type: 'missing_pci_training',
          message: 'PCI DSS training not completed',
          severity: 'high'
        });
        evaluation.status = 'non_compliant';
      }

      // Check network access restrictions
      if (!employee.regulatory_status?.network_segmentation_applied) {
        evaluation.violations.push({
          type: 'network_access_violation',
          message: 'Network segmentation not properly applied',
          severity: 'critical'
        });
        evaluation.status = 'non_compliant';
      }
    }

    evaluation.requirements = [
      'Network segmentation for cardholder data',
      'Regular PCI DSS training',
      'Encrypted data storage and transmission',
      'Quarterly vulnerability scans'
    ];

    return evaluation;
  }

  /**
   * Evaluate internal policy compliance
   */
  async evaluatePolicy(employee, policyCode) {
    const policy = this.activePolicies.get(policyCode);
    if (!policy) {
      return { status: 'not_applicable', violations: [] };
    }

    // Check if policy applies to this employee
    const appliesTo = this.checkPolicyApplicability(employee, policy);
    if (!appliesTo) {
      return { status: 'not_applicable', violations: [] };
    }

    const evaluation = {
      name: policy.name,
      status: 'compliant',
      violations: [],
      requirements: [],
      lastEvaluated: new Date()
    };

    // Evaluate based on policy type
    switch (policyCode) {
      case 'employee_monitoring':
        return await this.evaluateMonitoringPolicy(employee, policy, evaluation);
      case 'data_retention':
        return await this.evaluateDataRetentionPolicy(employee, policy, evaluation);
      case 'privileged_access':
        return await this.evaluatePrivilegedAccessPolicy(employee, policy, evaluation);
      case 'external_communication':
        return await this.evaluateExternalCommPolicy(employee, policy, evaluation);
      default:
        return await this.evaluateCustomPolicy(employee, policy, evaluation);
    }
  }

  /**
   * Check if a policy applies to a specific employee
   */
  checkPolicyApplicability(employee, policy) {
    // Check department applicability
    if (policy.departments && policy.departments.length > 0) {
      if (!policy.departments.includes(employee.department)) {
        return false;
      }
    }

    // Check role applicability
    if (policy.roles && policy.roles.length > 0) {
      if (!employee.role || !policy.roles.includes(employee.role)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate overall compliance status
   */
  calculateOverallStatus(compliance) {
    const allEvaluations = [
      ...Object.values(compliance.regulations),
      ...Object.values(compliance.policies)
    ];

    const hasViolations = allEvaluations.some(eval => eval.violations.length > 0);
    const hasCritical = allEvaluations.some(eval => 
      eval.violations.some(v => v.severity === 'critical')
    );

    if (hasCritical) return 'critical_violation';
    if (hasViolations) return 'non_compliant';
    return 'compliant';
  }

  /**
   * Calculate data retention requirements
   */
  calculateRetentionRequirements(employee, compliance) {
    const requirements = {
      minimumRetentionYears: 3,
      maximumRetentionYears: 7,
      automaticDeletion: false,
      specialRequirements: []
    };

    // Check regulatory requirements
    for (const [regCode, evaluation] of Object.entries(compliance.regulations)) {
      const regulation = this.activeRegulations.get(regCode);
      if (regulation && regulation.config.data_retention) {
        // Parse retention requirements from regulation config
        this.applyRetentionRequirements(requirements, regulation.config.data_retention, regCode);
      }
    }

    return requirements;
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations(employee, compliance) {
    const recommendations = [];

    // Check for overdue reviews
    if (!employee.last_compliance_review || 
        new Date(employee.last_compliance_review) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
      recommendations.push({
        type: 'compliance_review',
        priority: 'high',
        message: 'Employee compliance review is overdue',
        action: 'Schedule compliance review within 30 days'
      });
    }

    // Check for missing compliance profile
    if (!employee.compliance_profile_id) {
      recommendations.push({
        type: 'assign_profile',
        priority: 'medium',
        message: 'Employee has no compliance profile assigned',
        action: 'Assign appropriate compliance profile based on role and department'
      });
    }

    // Add regulation-specific recommendations
    for (const [regCode, evaluation] of Object.entries(compliance.regulations)) {
      if (evaluation.violations.length > 0) {
        recommendations.push({
          type: 'regulatory_violation',
          priority: 'high',
          message: `${evaluation.name} violations detected`,
          action: `Address ${evaluation.violations.length} violation(s) immediately`
        });
      }
    }

    return recommendations;
  }

  /**
   * Helper methods for specific compliance checks
   */
  async checkSegregationOfDuties(employeeId) {
    // Implementation for SOX segregation of duties check
    // This would integrate with access control systems
    return [];
  }

  async checkAuditTrail(employeeId) {
    // Check if sufficient audit trail exists for financial activities
    return { sufficient: true };
  }

  getRegulationCodeById(regId) {
    for (const [code, reg] of this.activeRegulations) {
      if (reg.id === regId) return code;
    }
    return null;
  }

  getPolicyCodeById(policyId) {
    for (const [code, policy] of this.activePolicies) {
      if (policy.id === policyId) return code;
    }
    return null;
  }

  /**
   * Evaluate specific policy types
   */
  async evaluateMonitoringPolicy(employee, policy, evaluation) {
    const config = policy.config;
    
    // Check monitoring consent
    if (config.consent_required && !employee.regulatory_status?.monitoring_consent) {
      evaluation.violations.push({
        type: 'missing_monitoring_consent',
        message: 'Employee monitoring consent not obtained',
        severity: 'medium'
      });
      evaluation.status = 'non_compliant';
    }

    return evaluation;
  }

  async evaluateDataRetentionPolicy(employee, policy, evaluation) {
    // Implementation for data retention policy evaluation
    return evaluation;
  }

  async evaluatePrivilegedAccessPolicy(employee, policy, evaluation) {
    // Implementation for privileged access policy evaluation  
    return evaluation;
  }

  async evaluateExternalCommPolicy(employee, policy, evaluation) {
    // Implementation for external communication policy evaluation
    return evaluation;
  }

  async evaluateCustomPolicy(employee, policy, evaluation) {
    // Implementation for custom policy evaluation
    return evaluation;
  }

  applyRetentionRequirements(requirements, retentionConfig, source) {
    // Parse and apply retention requirements from regulation/policy config
    if (retentionConfig.employee_data) {
      const years = this.parseRetentionPeriod(retentionConfig.employee_data);
      if (years > requirements.minimumRetentionYears) {
        requirements.minimumRetentionYears = years;
        requirements.specialRequirements.push(`${source}: ${years} years minimum`);
      }
    }
  }

  parseRetentionPeriod(period) {
    if (typeof period === 'string') {
      const match = period.match(/(\d+)(?:_years?)/);
      return match ? parseInt(match[1]) : 3;
    }
    return period || 3;
  }

  /**
   * Refresh compliance engine cache
   */
  async refresh() {
    console.log('🔄 Refreshing Compliance Engine...');
    this.initialized = false;
    await this.initialize();
  }
}

// Singleton instance
const complianceEngine = new ComplianceEngine();

module.exports = {
  ComplianceEngine,
  complianceEngine
}; 