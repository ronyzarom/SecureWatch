/**
 * Office 365 Compliance Enhancement Service
 * Enhances Office 365 connector with compliance features
 */

const { query } = require('../utils/database');

class Office365ComplianceEnhancer {
  constructor() {
    this.initialized = false;
    this.complianceProfiles = new Map();
    this.departmentMappings = new Map();
    this.defaultComplianceSettings = {
      standardEmployee: 1, // Standard Employee profile ID
      financeTeam: 2,      // Finance Team profile ID
      itAdministration: 3, // IT Administration profile ID
      contractors: 4       // Contractors profile ID
    };
  }

  /**
   * Initialize compliance enhancer with current compliance profiles
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Office 365 Compliance Enhancer...');

      // Load compliance profiles
      const profilesResult = await query(`
        SELECT id, profile_name, description, monitoring_level, data_classification
        FROM compliance_profiles
        ORDER BY profile_name
      `);

      this.complianceProfiles.clear();
      for (const profile of profilesResult.rows) {
        this.complianceProfiles.set(profile.profile_name.toLowerCase().replace(/\s+/g, '_'), {
          id: profile.id,
          name: profile.profile_name,
          description: profile.description,
          monitoringLevel: profile.monitoring_level,
          dataClassification: profile.data_classification
        });
      }

      // Set up department to compliance profile mappings
      this.setupDepartmentMappings();

      this.initialized = true;
      console.log(`✅ Compliance Enhancer initialized with ${this.complianceProfiles.size} profiles`);

    } catch (error) {
      console.error('❌ Failed to initialize Compliance Enhancer:', error);
      throw error;
    }
  }

  /**
   * Set up default department to compliance profile mappings
   */
  setupDepartmentMappings() {
    // Map departments to compliance profiles
    this.departmentMappings.set('finance', 'finance_team');
    this.departmentMappings.set('accounting', 'finance_team');
    this.departmentMappings.set('treasury', 'finance_team');
    this.departmentMappings.set('financial', 'finance_team');
    
    this.departmentMappings.set('it', 'it_administration');
    this.departmentMappings.set('information technology', 'it_administration');
    this.departmentMappings.set('technology', 'it_administration');
    this.departmentMappings.set('systems', 'it_administration');
    this.departmentMappings.set('engineering', 'it_administration');
    this.departmentMappings.set('development', 'it_administration');
    this.departmentMappings.set('devops', 'it_administration');
    
    this.departmentMappings.set('contractor', 'contractors');
    this.departmentMappings.set('external', 'contractors');
    this.departmentMappings.set('vendor', 'contractors');
    this.departmentMappings.set('consultant', 'contractors');
    
    // All others default to standard employee
    this.departmentMappings.set('default', 'standard_employee');
  }

  /**
   * Determine appropriate compliance profile for a user
   */
  async determineComplianceProfile(user) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const department = (user.department || '').toLowerCase().trim();
      const jobTitle = (user.jobTitle || '').toLowerCase().trim();
      const userType = (user.userType || 'member').toLowerCase();

      // Check if user is a contractor/external
      if (userType !== 'member' || 
          jobTitle.includes('contractor') || 
          jobTitle.includes('consultant') ||
          department.includes('contractor')) {
        return this.getComplianceProfile('contractors');
      }

      // Check department mappings
      for (const [deptKey, profileKey] of this.departmentMappings) {
        if (department.includes(deptKey)) {
          return this.getComplianceProfile(profileKey);
        }
      }

      // Check job title for specific roles
      if (jobTitle.includes('finance') || 
          jobTitle.includes('accounting') || 
          jobTitle.includes('treasury')) {
        return this.getComplianceProfile('finance_team');
      }

      if (jobTitle.includes('administrator') ||
          jobTitle.includes('engineer') ||
          jobTitle.includes('developer') ||
          jobTitle.includes('analyst')) {
        return this.getComplianceProfile('it_administration');
      }

      // Default to standard employee
      return this.getComplianceProfile('standard_employee');

    } catch (error) {
      console.error('Error determining compliance profile:', error);
      return this.getComplianceProfile('standard_employee');
    }
  }

  /**
   * Get compliance profile by key
   */
  getComplianceProfile(profileKey) {
    const profile = this.complianceProfiles.get(profileKey);
    if (profile) {
      return profile;
    }

    // Fallback to first available profile
    const fallback = Array.from(this.complianceProfiles.values())[0];
    console.warn(`⚠️ Compliance profile '${profileKey}' not found, using fallback: ${fallback?.name}`);
    return fallback;
  }

  /**
   * Generate regulatory status for a user
   */
  generateRegulatoryStatus(user, complianceProfile) {
    const status = {
      gdpr_consent: false,
      gdpr_data_subject: true, // All employees are data subjects
      hipaa_training_completed: false,
      pci_training_completed: false,
      sox_access_level: 'none',
      phi_access_level: 'none',
      network_segmentation_applied: false,
      monitoring_consent: false,
      last_training_date: null,
      data_processing_purpose: 'employee_monitoring',
      retention_category: 'employee_data'
    };

    // Set status based on compliance profile
    if (complianceProfile) {
      switch (complianceProfile.name.toLowerCase()) {
        case 'finance team':
          status.sox_access_level = 'restricted';
          status.pci_training_completed = true;
          status.monitoring_consent = true;
          break;
        
        case 'it administration':
          status.network_segmentation_applied = true;
          status.monitoring_consent = true;
          status.pci_training_completed = true;
          break;
        
        case 'contractors':
          status.gdpr_consent = true;
          status.retention_category = 'contractor_data';
          status.monitoring_consent = true;
          break;
        
        default:
          status.monitoring_consent = true;
          status.gdpr_consent = true;
          break;
      }
    }

    return status;
  }

  /**
   * Calculate data retention date based on compliance requirements
   */
  calculateRetentionDate(user, complianceProfile) {
    const baseRetentionYears = complianceProfile?.retentionYears || 3;
    let additionalYears = 0;

    // Add additional retention for specific roles/departments
    const department = (user.department || '').toLowerCase();
    const jobTitle = (user.jobTitle || '').toLowerCase();

    if (department.includes('finance') || jobTitle.includes('finance')) {
      additionalYears = 4; // SOX requires 7 years total
    } else if (department.includes('healthcare') || jobTitle.includes('medical')) {
      additionalYears = 3; // HIPAA requires 6 years total
    }

    const totalYears = baseRetentionYears + additionalYears;
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + totalYears);

    return retentionDate;
  }

  /**
   * Generate compliance notes for a user
   */
  generateComplianceNotes(user, complianceProfile) {
    const notes = [];

    notes.push(`Compliance profile: ${complianceProfile?.name || 'Standard Employee'}`);
    
    if (user.department) {
      notes.push(`Department: ${user.department}`);
    }
    
    if (user.jobTitle) {
      notes.push(`Role: ${user.jobTitle}`);
    }

    const userType = user.userType || 'Member';
    if (userType !== 'Member') {
      notes.push(`Account type: ${userType}`);
    }

    notes.push(`Synced from Office 365 on ${new Date().toISOString().split('T')[0]}`);

    return notes.join(' | ');
  }

  /**
   * Enhanced employee sync with compliance features
   */
  async enhanceEmployeeWithCompliance(user, existingEmployeeId = null) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Determine compliance profile
      const complianceProfile = await this.determineComplianceProfile(user);
      
      // Generate regulatory status
      const regulatoryStatus = this.generateRegulatoryStatus(user, complianceProfile);
      
      // Calculate retention date
      const retentionDate = this.calculateRetentionDate(user, complianceProfile);
      
      // Generate compliance notes
      const complianceNotes = this.generateComplianceNotes(user, complianceProfile);

      const complianceData = {
        complianceProfileId: complianceProfile?.id || null,
        regulatoryStatus: JSON.stringify(regulatoryStatus),
        dataRetentionUntil: retentionDate,
        complianceNotes: complianceNotes,
        lastComplianceReview: new Date()
      };

      console.log(`🔒 Compliance enhancement for ${user.displayName}:`);
      console.log(`   - Profile: ${complianceProfile?.name || 'None'}`);
      console.log(`   - Monitoring Level: ${complianceProfile?.monitoringLevel || 'Standard'}`);
      console.log(`   - Data Classification: ${complianceProfile?.dataClassification || 'Internal'}`);
      console.log(`   - Retention Until: ${retentionDate.toISOString().split('T')[0]}`);

      return complianceData;

    } catch (error) {
      console.error(`❌ Error enhancing employee compliance for ${user.displayName}:`, error);
      return {
        complianceProfileId: null,
        regulatoryStatus: '{}',
        dataRetentionUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years default
        complianceNotes: `Error during compliance enhancement: ${error.message}`,
        lastComplianceReview: new Date()
      };
    }
  }

  /**
   * Update existing employees with compliance information
   */
  async updateEmployeeCompliance(employeeId, complianceData) {
    try {
      await query(`
        UPDATE employees 
        SET compliance_profile_id = $1,
            regulatory_status = $2,
            data_retention_until = $3,
            compliance_notes = $4,
            last_compliance_review = $5,
            updated_at = NOW()
        WHERE id = $6
      `, [
        complianceData.complianceProfileId,
        complianceData.regulatoryStatus,
        complianceData.dataRetentionUntil,
        complianceData.complianceNotes,
        complianceData.lastComplianceReview,
        employeeId
      ]);

      console.log(`✅ Updated compliance data for employee ID ${employeeId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to update compliance data for employee ID ${employeeId}:`, error);
      return false;
    }
  }

  /**
   * Bulk update compliance for existing employees
   */
  async bulkUpdateComplianceProfiles() {
    try {
      console.log('🔄 Performing bulk compliance profile update for existing employees...');

      const employees = await query(`
        SELECT id, name, email, department, job_title
        FROM employees
        WHERE compliance_profile_id IS NULL
      `);

      console.log(`📋 Found ${employees.rows.length} employees without compliance profiles`);

      let updated = 0;
      let errors = 0;

      for (const employee of employees.rows) {
        try {
          // Create a mock user object for compliance determination
          const mockUser = {
            displayName: employee.name,
            mail: employee.email,
            department: employee.department,
            jobTitle: employee.job_title,
            userType: 'Member'
          };

          const complianceData = await this.enhanceEmployeeWithCompliance(mockUser);
          const success = await this.updateEmployeeCompliance(employee.id, complianceData);
          
          if (success) {
            updated++;
          } else {
            errors++;
          }

        } catch (error) {
          console.error(`❌ Error updating compliance for employee ${employee.name}:`, error);
          errors++;
        }
      }

      console.log(`✅ Bulk compliance update completed: ${updated} updated, ${errors} errors`);
      return { updated, errors };

    } catch (error) {
      console.error('❌ Error during bulk compliance update:', error);
      throw error;
    }
  }

  /**
   * Generate compliance summary for Office 365 sync
   */
  async generateComplianceSummary() {
    try {
      const summary = await query(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(compliance_profile_id) as employees_with_profiles,
          COUNT(*) FILTER (WHERE last_compliance_review IS NULL) as never_reviewed,
          COUNT(*) FILTER (WHERE data_retention_until < CURRENT_DATE) as retention_overdue
        FROM employees
      `);

      const profileBreakdown = await query(`
        SELECT 
          cp.profile_name,
          COUNT(e.id) as employee_count
        FROM compliance_profiles cp
        LEFT JOIN employees e ON e.compliance_profile_id = cp.id
        GROUP BY cp.id, cp.profile_name
        ORDER BY employee_count DESC
      `);

      return {
        overview: summary.rows[0],
        profileBreakdown: profileBreakdown.rows
      };

    } catch (error) {
      console.error('❌ Error generating compliance summary:', error);
      return null;
    }
  }
}

module.exports = new Office365ComplianceEnhancer(); 