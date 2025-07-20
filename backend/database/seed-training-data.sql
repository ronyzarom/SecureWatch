-- Sample Training Data Seed File
-- Creates comprehensive training data for demonstration

-- Insert Training Categories
INSERT INTO training_categories (name, description, applicable_regulations, icon, color, priority) VALUES
('Data Protection & Privacy', 'Training on data protection laws and privacy regulations', ARRAY['gdpr', 'hipaa'], 'shield', 'blue', 10),
('Financial Compliance', 'Financial reporting and audit compliance training', ARRAY['sox'], 'dollar-sign', 'green', 9),
('Information Security', 'Cybersecurity and data security training', ARRAY['gdpr', 'hipaa', 'pci_dss'], 'lock', 'red', 8),
('Payment Security', 'Payment card industry compliance and security', ARRAY['pci_dss'], 'credit-card', 'orange', 7),
('General Compliance', 'General compliance awareness and ethics', ARRAY['gdpr', 'sox', 'hipaa', 'pci_dss'], 'book', 'purple', 6),
('Leadership Training', 'Management and leadership compliance responsibilities', ARRAY['sox'], 'users', 'indigo', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert Training Compliance Requirements
INSERT INTO training_compliance_requirements (
  regulation_code, requirement_section, requirement_title, requirement_description,
  required_frequency, grace_period_days, minimum_training_hours, requires_certification,
  requires_assessment, minimum_passing_score, applies_to_departments, applies_to_roles
) VALUES
('gdpr', 'Article 39', 'Data Protection Officer Training', 'Training requirements for data protection officers and staff handling personal data', 'annual', 30, 4.0, true, true, 85, ARRAY['IT', 'HR', 'Legal'], ARRAY['data_officer', 'privacy_officer']),
('gdpr', 'Article 32', 'Security Awareness Training', 'Regular security awareness training for all staff handling personal data', 'annual', 14, 2.0, false, true, 80, ARRAY[], ARRAY[]),
('sox', 'Section 404', 'Internal Controls Training', 'Training on internal controls over financial reporting', 'annual', 45, 6.0, true, true, 90, ARRAY['Finance', 'Accounting'], ARRAY['financial_manager', 'controller', 'cfo']),
('sox', 'Section 302', 'Executive Certification Training', 'Training for executives on certification requirements', 'annual', 30, 3.0, true, true, 95, ARRAY['Executive'], ARRAY['ceo', 'cfo', 'executive']),
('hipaa', 'Section 164.308', 'Administrative Safeguards Training', 'Training on administrative safeguards for healthcare data', 'annual', 30, 3.0, true, true, 85, ARRAY['Healthcare', 'IT'], ARRAY['healthcare_worker', 'it_admin']),
('pci_dss', 'Requirement 12.6', 'Security Awareness Training', 'Annual security awareness training for all personnel', 'annual', 21, 2.0, false, true, 80, ARRAY[], ARRAY[])
ON CONFLICT (regulation_code, requirement_section) DO NOTHING;

-- Insert Training Programs
INSERT INTO training_programs (
  name, description, program_type, applicable_regulations, is_mandatory,
  total_duration_minutes, difficulty_level, target_departments, target_roles,
  recurrence_type, grace_period_days, created_by
) VALUES
('GDPR Fundamentals for All Employees', 'Essential GDPR training covering data protection principles, individual rights, and organizational responsibilities', 'compliance', ARRAY['gdpr'], true, 120, 1, ARRAY[], ARRAY[], 'annual', 14, 1),
('Advanced GDPR for Data Processors', 'In-depth GDPR training for staff directly handling personal data', 'compliance', ARRAY['gdpr'], true, 240, 3, ARRAY['IT', 'HR', 'Legal'], ARRAY['data_processor', 'privacy_officer'], 'annual', 30, 1),
('SOX Internal Controls Overview', 'Sarbanes-Oxley compliance training focusing on internal controls', 'compliance', ARRAY['sox'], true, 180, 2, ARRAY['Finance', 'Accounting'], ARRAY[], 'annual', 45, 1),
('Executive SOX Certification', 'Comprehensive SOX training for executive leadership', 'certification', ARRAY['sox'], true, 300, 4, ARRAY['Executive'], ARRAY['ceo', 'cfo', 'executive'], 'annual', 30, 1),
('HIPAA Security and Privacy', 'Healthcare data protection and security training', 'compliance', ARRAY['hipaa'], true, 150, 2, ARRAY['Healthcare', 'IT'], ARRAY[], 'annual', 30, 1),
('PCI DSS Fundamentals', 'Payment card industry data security standards training', 'compliance', ARRAY['pci_dss'], true, 90, 1, ARRAY[], ARRAY[], 'annual', 21, 1),
('Cybersecurity Awareness', 'General cybersecurity awareness and best practices', 'standard', ARRAY['gdpr', 'hipaa', 'pci_dss'], false, 60, 1, ARRAY[], ARRAY[], 'quarterly', 7, 1),
('Data Breach Response', 'Training on incident response and data breach procedures', 'standard', ARRAY['gdpr', 'hipaa'], false, 90, 2, ARRAY['IT', 'Legal', 'Management'], ARRAY[], 'annual', 14, 1)
ON CONFLICT (name) DO NOTHING;

-- Get category and program IDs for content insertion
DO $$
DECLARE
    gdpr_cat_id INTEGER;
    sox_cat_id INTEGER;
    security_cat_id INTEGER;
    pci_cat_id INTEGER;
    
    gdpr_prog_id INTEGER;
    adv_gdpr_prog_id INTEGER;
    sox_prog_id INTEGER;
    exec_sox_prog_id INTEGER;
    hipaa_prog_id INTEGER;
    pci_prog_id INTEGER;
BEGIN
    -- Get category IDs
    SELECT id INTO gdpr_cat_id FROM training_categories WHERE name = 'Data Protection & Privacy';
    SELECT id INTO sox_cat_id FROM training_categories WHERE name = 'Financial Compliance';
    SELECT id INTO security_cat_id FROM training_categories WHERE name = 'Information Security';
    SELECT id INTO pci_cat_id FROM training_categories WHERE name = 'Payment Security';
    
    -- Get program IDs
    SELECT id INTO gdpr_prog_id FROM training_programs WHERE name = 'GDPR Fundamentals for All Employees';
    SELECT id INTO adv_gdpr_prog_id FROM training_programs WHERE name = 'Advanced GDPR for Data Processors';
    SELECT id INTO sox_prog_id FROM training_programs WHERE name = 'SOX Internal Controls Overview';
    SELECT id INTO exec_sox_prog_id FROM training_programs WHERE name = 'Executive SOX Certification';
    SELECT id INTO hipaa_prog_id FROM training_programs WHERE name = 'HIPAA Security and Privacy';
    SELECT id INTO pci_prog_id FROM training_programs WHERE name = 'PCI DSS Fundamentals';

    -- Insert Training Content
    INSERT INTO training_content (
      category_id, title, description, content_type, content_format, content_body,
      applicable_regulations, compliance_level, difficulty_level, estimated_duration_minutes,
      status, author_id
    ) VALUES
    (gdpr_cat_id, 'Introduction to GDPR', 'Overview of the General Data Protection Regulation and its impact on organizations', 'document', 'html', 
     '<h1>Introduction to GDPR</h1><p>The General Data Protection Regulation (GDPR) is a comprehensive data protection law that came into effect on May 25, 2018...</p><h2>Key Principles</h2><ul><li>Lawfulness, fairness and transparency</li><li>Purpose limitation</li><li>Data minimisation</li><li>Accuracy</li><li>Storage limitation</li><li>Integrity and confidentiality</li><li>Accountability</li></ul>',
     ARRAY['gdpr'], 'required', 1, 30, 'published', 1),
    
    (gdpr_cat_id, 'Individual Rights Under GDPR', 'Understanding the rights of data subjects under GDPR', 'document', 'html',
     '<h1>Individual Rights Under GDPR</h1><p>GDPR grants several important rights to individuals regarding their personal data...</p><h2>The Eight Rights</h2><ol><li>Right to be informed</li><li>Right of access</li><li>Right to rectification</li><li>Right to erasure</li><li>Right to restrict processing</li><li>Right to data portability</li><li>Right to object</li><li>Rights in relation to automated decision making and profiling</li></ol>',
     ARRAY['gdpr'], 'required', 1, 25, 'published', 1),
    
    (sox_cat_id, 'SOX Section 404 Overview', 'Understanding internal controls over financial reporting', 'document', 'html',
     '<h1>SOX Section 404: Internal Controls</h1><p>Section 404 of the Sarbanes-Oxley Act requires management to establish and maintain adequate internal control over financial reporting...</p><h2>Key Requirements</h2><ul><li>Annual assessment of internal controls</li><li>Management certification</li><li>External auditor attestation</li><li>Documentation of controls</li></ul>',
     ARRAY['sox'], 'required', 2, 45, 'published', 1),
    
    (security_cat_id, 'Password Security Best Practices', 'Essential password security guidelines for all employees', 'interactive', 'html',
     '<h1>Password Security</h1><p>Strong passwords are your first line of defense...</p><h2>Best Practices</h2><ul><li>Use unique passwords for each account</li><li>Enable two-factor authentication</li><li>Use a password manager</li><li>Avoid common passwords</li></ul><h2>Interactive Exercise</h2><p>Test your password strength using our interactive tool...</p>',
     ARRAY['gdpr', 'hipaa', 'pci_dss'], 'required', 1, 20, 'published', 1),
    
    (pci_cat_id, 'PCI DSS Requirements Overview', 'Introduction to the 12 requirements of PCI DSS', 'document', 'html',
     '<h1>PCI DSS 12 Requirements</h1><p>The Payment Card Industry Data Security Standard (PCI DSS) consists of 12 high-level requirements...</p><h2>The Six Goals</h2><ol><li>Build and Maintain a Secure Network</li><li>Protect Cardholder Data</li><li>Maintain a Vulnerability Management Program</li><li>Implement Strong Access Control Measures</li><li>Regularly Monitor and Test Networks</li><li>Maintain an Information Security Policy</li></ol>',
     ARRAY['pci_dss'], 'required', 1, 35, 'published', 1);

    -- Insert some quiz content
    INSERT INTO training_content (
      category_id, title, description, content_type, content_format, content_body,
      applicable_regulations, compliance_level, difficulty_level, estimated_duration_minutes,
      status, author_id
    ) VALUES
    (gdpr_cat_id, 'GDPR Knowledge Check', 'Assessment quiz for GDPR fundamentals', 'quiz', 'json',
     '{"quiz_title": "GDPR Knowledge Check", "passing_score": 80, "time_limit_minutes": 15, "total_questions": 5, "total_points": 5, "questions": [{"id": 1, "type": "multiple_choice", "question": "What does GDPR stand for?", "options": ["General Data Protection Regulation", "Global Data Privacy Rules", "Government Data Protection Requirements", "General Database Protection Rules"], "correct_answer": 0, "explanation": "GDPR stands for General Data Protection Regulation", "points": 1, "category": "basic_knowledge"}, {"id": 2, "type": "true_false", "question": "GDPR only applies to companies based in the European Union", "correct_answer": false, "explanation": "GDPR applies to any organization that processes personal data of EU residents, regardless of where the organization is based", "points": 1, "category": "basic_knowledge"}]}',
     ARRAY['gdpr'], 'required', 1, 15, 'published', 1);

END $$;

-- Insert some sample training assignments for demonstration
INSERT INTO training_assignments (
  employee_id, program_id, assigned_by, assignment_reason, assignment_source,
  due_date, grace_period_end, compliance_requirement, priority, status, passing_score
)
SELECT 
  e.id as employee_id,
  tp.id as program_id,
  1 as assigned_by,
  'compliance_requirement' as assignment_reason,
  'system_trigger' as assignment_source,
  CURRENT_DATE + INTERVAL '30 days' as due_date,
  CURRENT_DATE + INTERVAL '37 days' as grace_period_end,
  'GDPR Compliance Training' as compliance_requirement,
  'high' as priority,
  'assigned' as status,
  80 as passing_score
FROM employees e
CROSS JOIN training_programs tp
WHERE tp.name = 'GDPR Fundamentals for All Employees'
  AND e.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.employee_id = e.id AND ta.program_id = tp.id
  )
LIMIT 10; -- Limit to first 10 employees to avoid overwhelming

-- Insert some completed assignments with certificates
DO $$
DECLARE
    assignment_record RECORD;
    cert_id VARCHAR(255);
BEGIN
    -- Mark some assignments as completed and issue certificates
    FOR assignment_record IN 
        SELECT ta.id, ta.employee_id, ta.program_id, tp.name as program_name
        FROM training_assignments ta
        JOIN training_programs tp ON ta.program_id = tp.id
        WHERE ta.status = 'assigned'
        LIMIT 3
    LOOP
        -- Update assignment to completed
        UPDATE training_assignments 
        SET 
          status = 'completed',
          progress_percentage = 100,
          started_at = CURRENT_TIMESTAMP - INTERVAL '5 days',
          completed_at = CURRENT_TIMESTAMP - INTERVAL '1 day',
          final_score = 85 + (RANDOM() * 15)::INTEGER, -- Random score between 85-100
          completion_time_minutes = 90 + (RANDOM() * 60)::INTEGER, -- Random time between 90-150 minutes
          certificate_earned = true
        WHERE id = assignment_record.id;
        
        -- Generate certificate
        cert_id := 'CERT-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || assignment_record.employee_id || '-' || assignment_record.program_id;
        
        UPDATE training_assignments 
        SET certificate_id = cert_id 
        WHERE id = assignment_record.id;
        
        INSERT INTO training_certificates (
          certificate_id, employee_id, program_id, assignment_id,
          certificate_name, certificate_type, regulation_compliance,
          earned_score, required_score, expires_at, compliance_period_months
        ) VALUES (
          cert_id,
          assignment_record.employee_id,
          assignment_record.program_id,
          assignment_record.id,
          assignment_record.program_name || ' - Completion Certificate',
          'compliance',
          ARRAY['gdpr'],
          85 + (RANDOM() * 15)::INTEGER,
          80,
          CURRENT_DATE + INTERVAL '1 year',
          12
        );
    END LOOP;
END $$;

-- Insert some training notifications
INSERT INTO training_notifications (
  employee_id, assignment_id, notification_type, title, message, priority, scheduled_for
)
SELECT 
  ta.employee_id,
  ta.id,
  'assignment' as notification_type,
  'New Training Assignment' as title,
  'You have been assigned mandatory GDPR training. Please complete by ' || ta.due_date::DATE as message,
  'medium' as priority,
  CURRENT_TIMESTAMP as scheduled_for
FROM training_assignments ta
WHERE ta.status = 'assigned'
LIMIT 5;

-- Update training program content mappings
DO $$
DECLARE
    prog_record RECORD;
    content_record RECORD;
    seq_order INTEGER;
BEGIN
    -- Link content to programs
    FOR prog_record IN 
        SELECT id, name, applicable_regulations FROM training_programs 
        WHERE name IN ('GDPR Fundamentals for All Employees', 'SOX Internal Controls Overview', 'PCI DSS Fundamentals')
    LOOP
        seq_order := 1;
        
        FOR content_record IN
            SELECT tc.id, tc.title
            FROM training_content tc
            WHERE tc.applicable_regulations && prog_record.applicable_regulations
              AND tc.content_type IN ('document', 'interactive')
            ORDER BY tc.title
        LOOP
            INSERT INTO training_program_content (
              program_id, content_id, sequence_order, is_required, estimated_duration_minutes
            ) VALUES (
              prog_record.id,
              content_record.id,
              seq_order,
              true,
              30
            )
            ON CONFLICT (program_id, content_id) DO NOTHING;
            
            seq_order := seq_order + 1;
        END LOOP;
        
        -- Add quiz content at the end
        FOR content_record IN
            SELECT tc.id, tc.title
            FROM training_content tc
            WHERE tc.applicable_regulations && prog_record.applicable_regulations
              AND tc.content_type = 'quiz'
            ORDER BY tc.title
        LOOP
            INSERT INTO training_program_content (
              program_id, content_id, sequence_order, is_required, estimated_duration_minutes
            ) VALUES (
              prog_record.id,
              content_record.id,
              seq_order,
              true,
              15
            )
            ON CONFLICT (program_id, content_id) DO NOTHING;
            
            seq_order := seq_order + 1;
        END LOOP;
    END LOOP;
END $$;

-- Insert AI generation log entries for demonstration
INSERT INTO ai_training_generation_log (
  requested_by, generation_type, regulation_focus, target_audience,
  difficulty_level, estimated_duration, content_type, ai_model,
  generated_content, generation_success, content_quality_score,
  regulation_accuracy_score, readability_score, human_review_status
) VALUES
(1, 'full_content', ARRAY['gdpr'], 'all_employees', 1, 30, 'overview', 'gpt-4o-mini', 'AI-generated GDPR overview content', true, 88, 92, 85, 'approved'),
(1, 'quiz_questions', ARRAY['sox'], 'finance_team', 2, 20, 'quiz', 'gpt-4o-mini', 'AI-generated SOX quiz questions', true, 90, 95, 82, 'approved'),
(1, 'full_content', ARRAY['hipaa'], 'healthcare_workers', 2, 45, 'scenario_based', 'gpt-4o-mini', 'AI-generated HIPAA scenario training', true, 87, 89, 88, 'pending');

COMMIT;

-- Display summary of inserted data
SELECT 
  'Training Categories' as type, COUNT(*) as count FROM training_categories
UNION ALL
SELECT 
  'Training Programs' as type, COUNT(*) as count FROM training_programs
UNION ALL
SELECT 
  'Training Content' as type, COUNT(*) as count FROM training_content
UNION ALL
SELECT 
  'Training Assignments' as type, COUNT(*) as count FROM training_assignments
UNION ALL
SELECT 
  'Training Certificates' as type, COUNT(*) as count FROM training_certificates
UNION ALL
SELECT 
  'Compliance Requirements' as type, COUNT(*) as count FROM training_compliance_requirements
ORDER BY type; 