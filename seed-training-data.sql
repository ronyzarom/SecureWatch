-- Seed Training Management System with Sample Data
-- This fixes the 500 errors on training endpoints

-- 1. Training Categories
INSERT INTO training_categories (name, description, color, is_mandatory, created_by) VALUES
('Security Awareness', 'General cybersecurity training for all employees', '#3B82F6', true, 1),
('Compliance Training', 'Regulatory compliance and policy training', '#10B981', true, 1),
('Technical Skills', 'Job-specific technical training programs', '#8B5CF6', false, 1),
('Leadership Development', 'Management and leadership skill building', '#F59E0B', false, 1),
('Data Protection', 'GDPR, PII, and data handling training', '#EF4444', true, 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Training Content
INSERT INTO training_content (
  title, description, content_type, content_data, author_id, 
  category_id, estimated_duration, difficulty_level, regulations
) VALUES
('Phishing Awareness Training', 'Learn to identify and avoid phishing attacks', 'video', 
 '{"video_url": "https://example.com/phishing-training", "quiz_questions": 10}', 1,
 (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 30, 'beginner', 
 ARRAY['SOX', 'HIPAA']),
('Password Security Best Practices', 'Create and manage secure passwords', 'interactive',
 '{"slides": 15, "interactive_elements": 5, "final_quiz": true}', 1,
 (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 20, 'beginner',
 ARRAY['SOX', 'PCI-DSS']),
('GDPR Compliance Fundamentals', 'Understanding GDPR requirements and implementation', 'document',
 '{"document_url": "https://example.com/gdpr-guide.pdf", "pages": 25}', 1,
 (SELECT id FROM training_categories WHERE name = 'Data Protection'), 45, 'intermediate',
 ARRAY['GDPR']),
('Incident Response Procedures', 'How to respond to security incidents', 'video',
 '{"video_url": "https://example.com/incident-response", "case_studies": 3}', 1,
 (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 60, 'advanced',
 ARRAY['SOX', 'HIPAA']),
('Email Security Guidelines', 'Safe email practices and threat detection', 'interactive',
 '{"modules": 4, "simulations": 2, "quiz_questions": 15}', 1,
 (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 35, 'intermediate',
 ARRAY['SOX'])
ON CONFLICT (title) DO NOTHING;

-- 3. Training Programs
INSERT INTO training_programs (
  name, description, program_type, applicable_regulations, is_mandatory,
  target_departments, target_roles, recurrence_type, grace_period_days, created_by
) VALUES
('New Employee Security Onboarding', 'Comprehensive security training for new hires', 'onboarding', 
 ARRAY['SOX', 'HIPAA'], true, ARRAY['ALL'], ARRAY['ALL'], 'once', 7, 1),
('Quarterly Security Refresher', 'Regular security awareness updates', 'recurring',
 ARRAY['SOX'], true, ARRAY['ALL'], ARRAY['ALL'], 'quarterly', 14, 1),
('Advanced Threat Detection', 'Advanced security training for IT staff', 'specialized',
 ARRAY['SOX', 'PCI-DSS'], false, ARRAY['IT Security', 'Engineering'], ARRAY['developer', 'admin'], 'annually', 30, 1),
('GDPR Compliance for Managers', 'Data protection training for management', 'compliance',
 ARRAY['GDPR'], true, ARRAY['ALL'], ARRAY['manager', 'director'], 'annually', 21, 1),
('Email Security Mastery', 'Comprehensive email security training', 'standard',
 ARRAY['SOX'], false, ARRAY['ALL'], ARRAY['ALL'], 'semi-annually', 14, 1)
ON CONFLICT (name) DO NOTHING;

-- 4. Link Training Content to Programs
INSERT INTO training_program_content (program_id, content_id, sequence_order, is_required) 
SELECT 
  tp.id,
  tc.id,
  ROW_NUMBER() OVER (PARTITION BY tp.id ORDER BY tc.id),
  true
FROM training_programs tp
CROSS JOIN training_content tc
WHERE tp.name = 'New Employee Security Onboarding'
  AND tc.title IN ('Phishing Awareness Training', 'Password Security Best Practices', 'Email Security Guidelines')
ON CONFLICT (program_id, content_id) DO NOTHING;

INSERT INTO training_program_content (program_id, content_id, sequence_order, is_required)
SELECT 
  tp.id,
  tc.id,
  ROW_NUMBER() OVER (PARTITION BY tp.id ORDER BY tc.id),
  true
FROM training_programs tp
CROSS JOIN training_content tc
WHERE tp.name = 'GDPR Compliance for Managers'
  AND tc.title = 'GDPR Compliance Fundamentals'
ON CONFLICT (program_id, content_id) DO NOTHING;

-- 5. Create Sample Training Assignments
INSERT INTO training_assignments (
  employee_id, program_id, assigned_by, due_date, status, assigned_at
)
SELECT 
  e.id,
  tp.id,
  1,
  NOW() + INTERVAL '30 days',
  CASE 
    WHEN RANDOM() < 0.3 THEN 'completed'
    WHEN RANDOM() < 0.6 THEN 'in_progress'
    ELSE 'assigned'
  END,
  NOW() - INTERVAL '7 days'
FROM employees e
CROSS JOIN training_programs tp
WHERE tp.is_mandatory = true
  AND e.is_active = true
  AND RANDOM() < 0.7  -- Assign to ~70% of employees
ON CONFLICT (employee_id, program_id) DO NOTHING;

-- 6. Update completion data for completed assignments
UPDATE training_assignments 
SET 
  completed_at = NOW() - INTERVAL '2 days',
  completion_percentage = 100,
  final_score = 85 + RANDOM() * 15,  -- Random score between 85-100
  status = 'completed'
WHERE status = 'completed';

-- 7. Update progress for in-progress assignments
UPDATE training_assignments 
SET 
  completion_percentage = 25 + RANDOM() * 50,  -- Random progress 25-75%
  started_at = NOW() - INTERVAL '3 days'
WHERE status = 'in_progress';

-- Verification queries
SELECT 'Training Categories' as table_name, COUNT(*) as count FROM training_categories
UNION ALL
SELECT 'Training Content', COUNT(*) FROM training_content
UNION ALL 
SELECT 'Training Programs', COUNT(*) FROM training_programs
UNION ALL
SELECT 'Program Content Links', COUNT(*) FROM training_program_content
UNION ALL
SELECT 'Training Assignments', COUNT(*) FROM training_assignments; 