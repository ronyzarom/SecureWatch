const { pool } = require('../utils/database');
const { complianceEngine } = require('./complianceEngine');

/**
 * Training Assignment Service
 * 
 * Handles intelligent training assignment based on:
 * - Compliance profiles and requirements
 * - Employee roles and departments
 * - Regulation changes and updates
 * - Performance and completion tracking
 */

class TrainingAssignmentService {
  constructor() {
    this.assignmentRules = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the training assignment service
   */
  async initialize() {
    try {
      console.log('📋 Initializing Training Assignment Service...');
      
      // Load assignment rules and compliance requirements
      await this.loadAssignmentRules();
      await this.loadComplianceRequirements();
      
      this.initialized = true;
      console.log('✅ Training Assignment Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Training Assignment Service:', error);
      throw error;
    }
  }

  /**
   * Assign training programs to employees based on compliance profiles
   */
  async assignTrainingByComplianceProfile(employeeIds = [], programIds = [], assignedBy, reason = 'compliance_requirement') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`📋 Assigning training to ${employeeIds.length} employees based on compliance profiles...`);

      const assignments = [];
      
      for (const employeeId of employeeIds) {
        const employee = await this.getEmployeeWithProfile(employeeId);
        if (!employee) {
          console.warn(`Employee ${employeeId} not found, skipping assignment`);
          continue;
        }

        // Get applicable programs for this employee
        const applicablePrograms = programIds.length > 0 
          ? await this.getSpecificPrograms(programIds)
          : await this.getApplicableProgramsForEmployee(employee);

        for (const program of applicablePrograms) {
          try {
            const assignment = await this.createTrainingAssignment({
              employeeId: employee.id,
              programId: program.id,
              assignedBy,
              reason,
              complianceProfile: employee.compliance_profile_id,
              dueDate: this.calculateDueDate(program, employee),
              priority: this.calculatePriority(program, employee)
            });

            if (assignment) {
              assignments.push(assignment);
            }
          } catch (assignmentError) {
            console.error(`Failed to assign program ${program.id} to employee ${employeeId}:`, assignmentError);
          }
        }
      }

      console.log(`✅ Successfully created ${assignments.length} training assignments`);
      return assignments;

    } catch (error) {
      console.error('❌ Failed to assign training by compliance profile:', error);
      throw error;
    }
  }

  /**
   * Automatically assign training based on compliance requirements
   */
  async autoAssignComplianceTraining() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('🤖 Running automatic compliance training assignment...');

      // Get all active employees with compliance profiles
      const employees = await this.getAllActiveEmployees();
      const assignmentResults = {
        total_employees: employees.length,
        assignments_created: 0,
        employees_processed: 0,
        errors: []
      };

      for (const employee of employees) {
        try {
          assignmentResults.employees_processed++;

          // Check for missing mandatory training
          const missingTraining = await this.getMissingMandatoryTraining(employee);
          
          // Check for expiring certifications
          const expiringCertifications = await this.getExpiringCertifications(employee);
          
          // Create assignments for missing training
          for (const program of missingTraining) {
            const assignment = await this.createTrainingAssignment({
              employeeId: employee.id,
              programId: program.id,
              assignedBy: null, // System assignment
              reason: 'auto_compliance',
              source: 'system_trigger',
              complianceRequirement: program.compliance_requirement,
              dueDate: this.calculateDueDate(program, employee),
              priority: program.is_mandatory ? 'high' : 'medium'
            });

            if (assignment) {
              assignmentResults.assignments_created++;
            }
          }

          // Create renewal assignments for expiring certifications
          for (const cert of expiringCertifications) {
            const renewalProgram = await this.findRenewalProgram(cert);
            if (renewalProgram) {
              const assignment = await this.createTrainingAssignment({
                employeeId: employee.id,
                programId: renewalProgram.id,
                assignedBy: null,
                reason: 'certification_renewal',
                source: 'system_trigger',
                complianceRequirement: cert.regulation_compliance.join(', '),
                dueDate: new Date(cert.expires_at),
                priority: 'high'
              });

              if (assignment) {
                assignmentResults.assignments_created++;
              }
            }
          }

        } catch (employeeError) {
          console.error(`Error processing employee ${employee.id}:`, employeeError);
          assignmentResults.errors.push({
            employeeId: employee.id,
            error: employeeError.message
          });
        }
      }

      console.log(`✅ Auto-assignment complete: ${assignmentResults.assignments_created} assignments created for ${assignmentResults.employees_processed} employees`);
      return assignmentResults;

    } catch (error) {
      console.error('❌ Failed to auto-assign compliance training:', error);
      throw error;
    }
  }

  /**
   * Create a single training assignment
   */
  async createTrainingAssignment(assignmentData) {
    const {
      employeeId,
      programId,
      assignedBy,
      reason,
      source = 'manual',
      complianceRequirement,
      dueDate,
      priority = 'medium'
    } = assignmentData;

    try {
      // Check if assignment already exists
      const existingAssignment = await pool.query(`
        SELECT id FROM training_assignments 
        WHERE employee_id = $1 AND program_id = $2
      `, [employeeId, programId]);

      if (existingAssignment.rows.length > 0) {
        console.log(`Assignment already exists for employee ${employeeId}, program ${programId}`);
        return null;
      }

      // Get program details for grace period calculation
      const programResult = await pool.query(`
        SELECT grace_period_days, total_duration_minutes, is_mandatory
        FROM training_programs 
        WHERE id = $1 AND is_active = true
      `, [programId]);

      if (programResult.rows.length === 0) {
        throw new Error(`Program ${programId} not found or inactive`);
      }

      const program = programResult.rows[0];
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (program.grace_period_days || 7));

      // Create the assignment
      const result = await pool.query(`
        INSERT INTO training_assignments (
          employee_id, program_id, assigned_by, assignment_reason, assignment_source,
          due_date, grace_period_end, compliance_requirement, priority, status,
          passing_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, assigned_at
      `, [
        employeeId,
        programId,
        assignedBy,
        reason,
        source,
        dueDate,
        gracePeriodEnd,
        complianceRequirement,
        priority,
        'assigned',
        program.is_mandatory ? 80 : 70 // Higher passing score for mandatory training
      ]);

      const assignmentId = result.rows[0].id;

      // Create notification for the assignment
      await this.createAssignmentNotification(employeeId, assignmentId, programId, dueDate);

      console.log(`✅ Created training assignment ${assignmentId} for employee ${employeeId}`);

      return {
        id: assignmentId,
        employee_id: employeeId,
        program_id: programId,
        assigned_at: result.rows[0].assigned_at,
        due_date: dueDate,
        priority
      };

    } catch (error) {
      console.error(`Failed to create training assignment:`, error);
      throw error;
    }
  }

  /**
   * Update assignment progress
   */
  async updateAssignmentProgress(assignmentId, progressData) {
    const {
      progressPercentage,
      status,
      lastAccessedAt = new Date(),
      completionAttempts,
      score,
      completionTime
    } = progressData;

    try {
      let updateQuery = `
        UPDATE training_assignments 
        SET 
          progress_percentage = $1,
          last_accessed_at = $2,
          updated_at = NOW()
      `;
      let params = [progressPercentage, lastAccessedAt];
      let paramCount = 2;

      if (status) {
        paramCount++;
        updateQuery += `, status = $${paramCount}`;
        params.push(status);

        if (status === 'completed') {
          paramCount++;
          updateQuery += `, completed_at = $${paramCount}`;
          params.push(new Date());
        } else if (status === 'in_progress' && !await this.hasStartedAssignment(assignmentId)) {
          paramCount++;
          updateQuery += `, started_at = $${paramCount}`;
          params.push(new Date());
        }
      }

      if (completionAttempts !== undefined) {
        paramCount++;
        updateQuery += `, completion_attempts = $${paramCount}`;
        params.push(completionAttempts);
      }

      if (score !== undefined) {
        paramCount++;
        updateQuery += `, final_score = $${paramCount}`;
        params.push(score);
      }

      if (completionTime !== undefined) {
        paramCount++;
        updateQuery += `, completion_time_minutes = $${paramCount}`;
        params.push(completionTime);
      }

      updateQuery += ` WHERE id = $${paramCount + 1} RETURNING *`;
      params.push(assignmentId);

      const result = await pool.query(updateQuery, params);

      if (result.rows.length === 0) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }

      const assignment = result.rows[0];

      // Handle completion logic
      if (status === 'completed') {
        await this.handleAssignmentCompletion(assignment);
      }

      // Check for overdue status
      if (new Date() > new Date(assignment.due_date) && assignment.status !== 'completed') {
        await pool.query(`
          UPDATE training_assignments 
          SET status = 'overdue' 
          WHERE id = $1
        `, [assignmentId]);
      }

      return assignment;

    } catch (error) {
      console.error(`Failed to update assignment progress:`, error);
      throw error;
    }
  }

  /**
   * Handle assignment completion logic
   */
  async handleAssignmentCompletion(assignment) {
    try {
      // Check if certificate should be issued
      if (assignment.final_score >= assignment.passing_score) {
        await this.issueCertificate(assignment);
      }

      // Update compliance status
      await this.updateEmployeeComplianceStatus(assignment.employee_id);

      // Create completion notification
      await this.createCompletionNotification(assignment);

      // Schedule follow-up training if required
      await this.scheduleFollowUpTraining(assignment);

    } catch (error) {
      console.error(`Error handling assignment completion:`, error);
    }
  }

  /**
   * Issue certificate for completed training
   */
  async issueCertificate(assignment) {
    try {
      // Get program and employee details
      const programResult = await pool.query(`
        SELECT tp.name, tp.applicable_regulations, tp.program_type
        FROM training_programs tp
        WHERE tp.id = $1
      `, [assignment.program_id]);

      const employeeResult = await pool.query(`
        SELECT name, email FROM employees WHERE id = $1
      `, [assignment.employee_id]);

      if (programResult.rows.length === 0 || employeeResult.rows.length === 0) {
        return;
      }

      const program = programResult.rows[0];
      const employee = employeeResult.rows[0];

      // Generate unique certificate ID
      const certificateId = `CERT-${Date.now()}-${assignment.employee_id}-${assignment.program_id}`;

      // Calculate expiration date (typically 1 year for compliance training)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const result = await pool.query(`
        INSERT INTO training_certificates (
          certificate_id, employee_id, program_id, assignment_id,
          certificate_name, certificate_type, regulation_compliance,
          earned_score, required_score, expires_at, compliance_period_months
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        certificateId,
        assignment.employee_id,
        assignment.program_id,
        assignment.id,
        `${program.name} - Completion Certificate`,
        program.program_type === 'compliance' ? 'compliance' : 'completion',
        program.applicable_regulations,
        assignment.final_score,
        assignment.passing_score,
        expiresAt,
        12 // 12 months validity
      ]);

      // Update assignment with certificate info
      await pool.query(`
        UPDATE training_assignments 
        SET certificate_earned = true, certificate_id = $1
        WHERE id = $2
      `, [certificateId, assignment.id]);

      console.log(`🏆 Certificate ${certificateId} issued to employee ${assignment.employee_id}`);

    } catch (error) {
      console.error('Failed to issue certificate:', error);
    }
  }

  /**
   * Get missing mandatory training for an employee
   */
  async getMissingMandatoryTraining(employee) {
    try {
      const result = await pool.query(`
        SELECT DISTINCT tp.id, tp.name, tp.grace_period_days, tp.applicable_regulations,
               tcr.requirement_title as compliance_requirement, tp.is_mandatory
        FROM training_programs tp
        LEFT JOIN training_compliance_requirements tcr ON tcr.regulation_code = ANY(tp.applicable_regulations)
        WHERE tp.is_mandatory = true 
          AND tp.is_active = true
          AND (
            tp.target_departments = '{}' OR $1 = ANY(tp.target_departments)
          )
          AND (
            tp.target_compliance_profiles = '{}' OR $2 = ANY(tp.target_compliance_profiles)
          )
          AND NOT EXISTS (
            SELECT 1 FROM training_assignments ta 
            WHERE ta.employee_id = $3 AND ta.program_id = tp.id 
            AND ta.status IN ('completed', 'in_progress', 'assigned')
          )
      `, [employee.department, employee.compliance_profile_id, employee.id]);

      return result.rows;
    } catch (error) {
      console.error('Error getting missing mandatory training:', error);
      return [];
    }
  }

  /**
   * Get expiring certifications for an employee
   */
  async getExpiringCertifications(employee, daysAhead = 30) {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysAhead);

      const result = await pool.query(`
        SELECT * FROM training_certificates 
        WHERE employee_id = $1 
          AND status = 'active'
          AND expires_at <= $2
          AND expires_at > NOW()
      `, [employee.id, expirationDate]);

      return result.rows;
    } catch (error) {
      console.error('Error getting expiring certifications:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  async getEmployeeWithProfile(employeeId) {
    const result = await pool.query(`
      SELECT e.*, cp.profile_name, cp.applicable_regulations, cp.retention_period_years,
             cp.monitoring_level, cp.data_classification
      FROM employees e
      LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
      WHERE e.id = $1 AND e.is_active = true
    `, [employeeId]);

    return result.rows[0];
  }

  async getAllActiveEmployees() {
    const result = await pool.query(`
      SELECT e.*, cp.profile_name, cp.applicable_regulations, cp.retention_period_years,
             cp.monitoring_level, cp.data_classification
      FROM employees e
      LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id
      WHERE e.is_active = true
      ORDER BY e.id
    `);

    return result.rows;
  }

  async getApplicableProgramsForEmployee(employee) {
    const result = await pool.query(`
      SELECT tp.*, tcr.requirement_title as compliance_requirement
      FROM training_programs tp
      LEFT JOIN training_compliance_requirements tcr ON tcr.regulation_code = ANY(tp.applicable_regulations)
      WHERE tp.is_active = true
        AND (
          tp.target_departments = '{}' OR $1 = ANY(tp.target_departments)
        )
        AND (
          tp.target_compliance_profiles = '{}' OR $2 = ANY(tp.target_compliance_profiles)
        )
      ORDER BY tp.is_mandatory DESC, tp.created_at DESC
    `, [employee.department, employee.compliance_profile_id]);

    return result.rows;
  }

  async getSpecificPrograms(programIds) {
    const result = await pool.query(`
      SELECT tp.*, tcr.requirement_title as compliance_requirement
      FROM training_programs tp
      LEFT JOIN training_compliance_requirements tcr ON tcr.regulation_code = ANY(tp.applicable_regulations)
      WHERE tp.id = ANY($1) AND tp.is_active = true
    `, [programIds]);

    return result.rows;
  }

  calculateDueDate(program, employee) {
    const dueDate = new Date();
    
    // Default due dates based on program type and urgency
    if (program.is_mandatory) {
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks for mandatory
    } else {
      dueDate.setDate(dueDate.getDate() + 30); // 1 month for optional
    }
    
    return dueDate;
  }

  calculatePriority(program, employee) {
    if (program.is_mandatory) return 'high';
    if (program.applicable_regulations.some(reg => ['gdpr', 'sox'].includes(reg))) return 'medium';
    return 'low';
  }

  async hasStartedAssignment(assignmentId) {
    const result = await pool.query(`
      SELECT started_at FROM training_assignments WHERE id = $1
    `, [assignmentId]);
    
    return result.rows[0]?.started_at !== null;
  }

  async createAssignmentNotification(employeeId, assignmentId, programId, dueDate) {
    try {
      await pool.query(`
        INSERT INTO training_notifications (
          employee_id, assignment_id, program_id, notification_type,
          title, message, priority, scheduled_for
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        employeeId,
        assignmentId,
        programId,
        'assignment',
        'New Training Assignment',
        `You have been assigned new training. Due date: ${dueDate.toLocaleDateString()}`,
        'medium',
        new Date()
      ]);
    } catch (error) {
      console.error('Failed to create assignment notification:', error);
    }
  }

  async createCompletionNotification(assignment) {
    try {
      await pool.query(`
        INSERT INTO training_notifications (
          employee_id, assignment_id, program_id, notification_type,
          title, message, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        assignment.employee_id,
        assignment.id,
        assignment.program_id,
        'completion',
        'Training Completed',
        `Congratulations! You have successfully completed your training with a score of ${assignment.final_score}%.`,
        'low'
      ]);
    } catch (error) {
      console.error('Failed to create completion notification:', error);
    }
  }

  async updateEmployeeComplianceStatus(employeeId) {
    // This could integrate with the compliance engine
    // to update overall compliance status
  }

  async scheduleFollowUpTraining(assignment) {
    // Logic for scheduling renewal or follow-up training
  }

  async findRenewalProgram(certificate) {
    // Find appropriate renewal program for expiring certificate
    const result = await pool.query(`
      SELECT * FROM training_programs 
      WHERE applicable_regulations && $1 
        AND is_active = true 
        AND program_type IN ('compliance', 'certification')
      LIMIT 1
    `, [certificate.regulation_compliance]);

    return result.rows[0];
  }

  async loadAssignmentRules() {
    // Load assignment rules from database
  }

  async loadComplianceRequirements() {
    // Load compliance requirements mapping
  }
}

// Singleton instance
const trainingAssignmentService = new TrainingAssignmentService();

module.exports = {
  TrainingAssignmentService,
  trainingAssignmentService
}; 