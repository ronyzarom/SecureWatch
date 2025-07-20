-- Sample Training Data Seed File (Fixed)
-- Creates comprehensive training data for demonstration

-- Insert Training Categories
INSERT INTO training_categories (name, description, applicable_regulations, icon, color, priority) VALUES
('Data Protection & Privacy', 'Training on data protection laws and privacy regulations', ARRAY['gdpr', 'hipaa'], 'shield', 'blue', 10),
('Financial Compliance', 'Financial reporting and audit compliance training', ARRAY['sox'], 'dollar-sign', 'green', 9),
('Information Security', 'Cybersecurity and data security training', ARRAY['gdpr', 'hipaa', 'pci_dss'], 'lock', 'red', 8),
('Payment Security', 'Payment card industry compliance and security', ARRAY['pci_dss'], 'credit-card', 'orange', 7),
('General Compliance', 'General compliance awareness and ethics', ARRAY['gdpr', 'sox', 'hipaa', 'pci_dss'], 'book', 'purple', 6);

-- Insert Training Compliance Requirements  
INSERT INTO training_compliance_requirements (
  regulation_code, requirement_section, requirement_title, requirement_description,
  required_frequency, grace_period_days, minimum_training_hours, requires_certification,
  requires_assessment, minimum_passing_score, applies_to_departments, applies_to_roles
) VALUES
('gdpr', 'Article 39', 'Data Protection Officer Training', 'Training requirements for data protection officers and staff handling personal data', 'annual', 30, 4.0, true, true, 85, ARRAY['IT', 'HR', 'Legal'], ARRAY['data_officer', 'privacy_officer']),
('gdpr', 'Article 32', 'Security Awareness Training', 'Regular security awareness training for all staff handling personal data', 'annual', 14, 2.0, false, true, 80, ARRAY[]::VARCHAR[], ARRAY[]::VARCHAR[]),
('sox', 'Section 404', 'Internal Controls Training', 'Training on internal controls over financial reporting', 'annual', 45, 6.0, true, true, 90, ARRAY['Finance', 'Accounting'], ARRAY['financial_manager', 'controller', 'cfo']),
('sox', 'Section 302', 'Executive Certification Training', 'Training for executives on certification requirements', 'annual', 30, 3.0, true, true, 95, ARRAY['Executive'], ARRAY['ceo', 'cfo', 'executive']),
('hipaa', 'Section 164.308', 'Administrative Safeguards Training', 'Training on administrative safeguards for healthcare data', 'annual', 30, 3.0, true, true, 85, ARRAY['Healthcare', 'IT'], ARRAY['healthcare_worker', 'it_admin']),
('pci_dss', 'Requirement 12.6', 'Security Awareness Training', 'Annual security awareness training for all personnel', 'annual', 21, 2.0, false, true, 80, ARRAY[]::VARCHAR[], ARRAY[]::VARCHAR[]);

-- Insert Training Programs
INSERT INTO training_programs (
  name, description, program_type, applicable_regulations, is_mandatory,
  total_duration_minutes, difficulty_level, target_departments, target_roles,
  recurrence_type, grace_period_days, created_by
) VALUES
('GDPR Fundamentals for All Employees', 'Essential GDPR training covering data protection principles, individual rights, and organizational responsibilities', 'compliance', ARRAY['gdpr'], true, 120, 1, ARRAY[]::VARCHAR[], ARRAY[]::VARCHAR[], 'annual', 14, 1),
('Advanced GDPR for Data Processors', 'In-depth GDPR training for staff directly handling personal data', 'compliance', ARRAY['gdpr'], true, 240, 3, ARRAY['IT', 'HR', 'Legal'], ARRAY['data_processor', 'privacy_officer'], 'annual', 30, 1),
('SOX Internal Controls Overview', 'Sarbanes-Oxley compliance training focusing on internal controls', 'compliance', ARRAY['sox'], true, 180, 2, ARRAY['Finance', 'Accounting'], ARRAY[]::VARCHAR[], 'annual', 45, 1),
('Executive SOX Certification', 'Comprehensive SOX training for executive leadership', 'certification', ARRAY['sox'], true, 300, 4, ARRAY['Executive'], ARRAY['ceo', 'cfo', 'executive'], 'annual', 30, 1),
('HIPAA Security and Privacy', 'Healthcare data protection and security training', 'compliance', ARRAY['hipaa'], true, 150, 2, ARRAY['Healthcare', 'IT'], ARRAY[]::VARCHAR[], 'annual', 30, 1),
('PCI DSS Fundamentals', 'Payment card industry data security standards training', 'compliance', ARRAY['pci_dss'], true, 90, 1, ARRAY[]::VARCHAR[], ARRAY[]::VARCHAR[], 'annual', 21, 1),
('Cybersecurity Awareness', 'General cybersecurity awareness and best practices', 'standard', ARRAY['gdpr', 'hipaa', 'pci_dss'], false, 60, 1, ARRAY[]::VARCHAR[], ARRAY[]::VARCHAR[], 'quarterly', 7, 1),
('Data Breach Response', 'Training on incident response and data breach procedures', 'standard', ARRAY['gdpr', 'hipaa'], false, 90, 2, ARRAY['IT', 'Legal', 'Management'], ARRAY[]::VARCHAR[], 'annual', 14, 1);

-- Insert Training Content
INSERT INTO training_content (
  category_id, title, description, content_type, content_format, content_body,
  applicable_regulations, compliance_level, difficulty_level, estimated_duration_minutes,
  status, author_id
)
SELECT 
  tc.id,
  'Introduction to GDPR',
  'Overview of the General Data Protection Regulation and its impact on organizations',
  'document',
  'html',
  '<h1>Introduction to GDPR</h1><p>The General Data Protection Regulation (GDPR) is a comprehensive data protection law that came into effect on May 25, 2018.</p><h2>Key Principles</h2><ul><li>Lawfulness, fairness and transparency</li><li>Purpose limitation</li><li>Data minimisation</li><li>Accuracy</li><li>Storage limitation</li><li>Integrity and confidentiality</li><li>Accountability</li></ul>',
  ARRAY['gdpr'],
  'required',
  1,
  30,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Data Protection & Privacy'
UNION ALL
SELECT 
  tc.id,
  'Individual Rights Under GDPR',
  'Understanding the rights of data subjects under GDPR',
  'document',
  'html',
  '<h1>Individual Rights Under GDPR</h1><p>GDPR grants several important rights to individuals regarding their personal data.</p><h2>The Eight Rights</h2><ol><li>Right to be informed</li><li>Right of access</li><li>Right to rectification</li><li>Right to erasure</li><li>Right to restrict processing</li><li>Right to data portability</li><li>Right to object</li><li>Rights in relation to automated decision making and profiling</li></ol>',
  ARRAY['gdpr'],
  'required',
  1,
  25,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Data Protection & Privacy'
UNION ALL
SELECT 
  tc.id,
  'SOX Section 404 Overview',
  'Understanding internal controls over financial reporting',
  'document',
  'html',
  '<h1>SOX Section 404: Internal Controls</h1><p>Section 404 of the Sarbanes-Oxley Act requires management to establish and maintain adequate internal control over financial reporting.</p><h2>Key Requirements</h2><ul><li>Annual assessment of internal controls</li><li>Management certification</li><li>External auditor attestation</li><li>Documentation of controls</li></ul>',
  ARRAY['sox'],
  'required',
  2,
  45,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Financial Compliance'
UNION ALL
SELECT 
  tc.id,
  'Password Security Best Practices',
  'Essential password security guidelines for all employees',
  'interactive',
  'html',
  '<h1>Password Security</h1><p>Strong passwords are your first line of defense.</p><h2>Best Practices</h2><ul><li>Use unique passwords for each account</li><li>Enable two-factor authentication</li><li>Use a password manager</li><li>Avoid common passwords</li></ul><h2>Interactive Exercise</h2><p>Test your password strength using our interactive tool.</p>',
  ARRAY['gdpr', 'hipaa', 'pci_dss'],
  'required',
  1,
  20,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Information Security'
UNION ALL
SELECT 
  tc.id,
  'PCI DSS Requirements Overview',
  'Introduction to the 12 requirements of PCI DSS',
  'document',
  'html',
  '<h1>PCI DSS 12 Requirements</h1><p>The Payment Card Industry Data Security Standard (PCI DSS) consists of 12 high-level requirements.</p><h2>The Six Goals</h2><ol><li>Build and Maintain a Secure Network</li><li>Protect Cardholder Data</li><li>Maintain a Vulnerability Management Program</li><li>Implement Strong Access Control Measures</li><li>Regularly Monitor and Test Networks</li><li>Maintain an Information Security Policy</li></ol>',
  ARRAY['pci_dss'],
  'required',
  1,
  35,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Payment Security';

-- Insert a sample quiz
INSERT INTO training_content (
  category_id, title, description, content_type, content_format, content_body,
  applicable_regulations, compliance_level, difficulty_level, estimated_duration_minutes,
  status, author_id
)
SELECT 
  tc.id,
  'GDPR Knowledge Check',
  'Assessment quiz for GDPR fundamentals',
  'quiz',
  'json',
  '{"quiz_title": "GDPR Knowledge Check", "passing_score": 80, "time_limit_minutes": 15, "total_questions": 5, "total_points": 5, "questions": [{"id": 1, "type": "multiple_choice", "question": "What does GDPR stand for?", "options": ["General Data Protection Regulation", "Global Data Privacy Rules", "Government Data Protection Requirements", "General Database Protection Rules"], "correct_answer": 0, "explanation": "GDPR stands for General Data Protection Regulation", "points": 1, "category": "basic_knowledge"}, {"id": 2, "type": "true_false", "question": "GDPR only applies to companies based in the European Union", "correct_answer": false, "explanation": "GDPR applies to any organization that processes personal data of EU residents, regardless of where the organization is based", "points": 1, "category": "basic_knowledge"}]}',
  ARRAY['gdpr'],
  'required',
  1,
  15,
  'published',
  1
FROM training_categories tc WHERE tc.name = 'Data Protection & Privacy';

-- Insert some sample training assignments if we have employees
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
FROM employees e, training_programs tp
WHERE tp.name = 'GDPR Fundamentals for All Employees'
  AND e.is_active = true
  LIMIT 5; -- Limit to first 5 employees

-- Link content to programs 
INSERT INTO training_program_content (program_id, content_id, sequence_order, is_required, estimated_duration_minutes)
SELECT 
  tp.id as program_id,
  tc.id as content_id,
  ROW_NUMBER() OVER (PARTITION BY tp.id ORDER BY tc.title) as sequence_order,
  true as is_required,
  tc.estimated_duration_minutes
FROM training_programs tp
JOIN training_content tc ON tc.applicable_regulations && tp.applicable_regulations
WHERE tp.name IN ('GDPR Fundamentals for All Employees', 'SOX Internal Controls Overview', 'PCI DSS Fundamentals');

-- Insert some AI generation log entries
INSERT INTO ai_training_generation_log (
  requested_by, generation_type, regulation_focus, target_audience,
  difficulty_level, estimated_duration, content_type, ai_model,
  generated_content, generation_success, content_quality_score,
  regulation_accuracy_score, readability_score, human_review_status
) VALUES
(1, 'full_content', ARRAY['gdpr'], 'all_employees', 1, 30, 'overview', 'gpt-4o-mini', 'AI-generated GDPR overview content', true, 88, 92, 85, 'approved'),
(1, 'quiz_questions', ARRAY['sox'], 'finance_team', 2, 20, 'quiz', 'gpt-4o-mini', 'AI-generated SOX quiz questions', true, 90, 95, 82, 'approved'),
(1, 'full_content', ARRAY['hipaa'], 'healthcare_workers', 2, 45, 'scenario_based', 'gpt-4o-mini', 'AI-generated HIPAA scenario training', true, 87, 89, 88, 'pending');

-- Display summary
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