-- Seed Training Management System with Sample Data (Schema Corrected)
-- This fixes the 500 errors on training endpoints

-- 1. Training Categories (with correct schema)
INSERT INTO training_categories (name, description, color, applicable_regulations, icon, priority) VALUES
('Security Awareness', 'General cybersecurity training for all employees', '#3B82F6', ARRAY['SOX', 'HIPAA'], 'shield', 1),
('Compliance Training', 'Regulatory compliance and policy training', '#10B981', ARRAY['GDPR', 'SOX'], 'check-circle', 2),
('Technical Skills', 'Job-specific technical training programs', '#8B5CF6', ARRAY[], 'code', 3),
('Leadership Development', 'Management and leadership skill building', '#F59E0B', ARRAY[], 'users', 4),
('Data Protection', 'GDPR, PII, and data handling training', '#EF4444', ARRAY['GDPR', 'HIPAA'], 'lock', 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Training Content (with correct schema)
INSERT INTO training_content (
  title, description, content_type, content_body, content_url, content_metadata, 
  author_id, category_id, estimated_duration_minutes, difficulty_level, 
  applicable_regulations, status
) VALUES
('Phishing Awareness Training', 'Learn to identify and avoid phishing attacks', 'video', 
 'Interactive video training covering common phishing techniques and how to identify suspicious emails.',
 'https://example.com/phishing-training', 
 '{"video_duration": 25, "quiz_questions": 10, "interactive_elements": 5}', 
 1, (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 
 30, 2, ARRAY['SOX', 'HIPAA'], 'published'),

('Password Security Best Practices', 'Create and manage secure passwords', 'interactive',
 'Comprehensive guide to creating strong passwords, using password managers, and multi-factor authentication.',
 'https://example.com/password-security',
 '{"slides": 15, "interactive_demos": 3, "final_quiz": true}', 
 1, (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 
 20, 1, ARRAY['SOX', 'PCI-DSS'], 'published'),

('GDPR Compliance Fundamentals', 'Understanding GDPR requirements and implementation', 'document',
 'Detailed guide covering GDPR principles, data subject rights, and compliance requirements.',
 'https://example.com/gdpr-guide.pdf',
 '{"document_type": "pdf", "pages": 25, "language": "en"}', 
 1, (SELECT id FROM training_categories WHERE name = 'Data Protection'), 
 45, 2, ARRAY['GDPR'], 'published'),

('Incident Response Procedures', 'How to respond to security incidents', 'video',
 'Step-by-step procedures for identifying, containing, and reporting security incidents.',
 'https://example.com/incident-response',
 '{"video_duration": 55, "case_studies": 3, "simulations": 2}', 
 1, (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 
 60, 3, ARRAY['SOX', 'HIPAA'], 'published'),

('Email Security Guidelines', 'Safe email practices and threat detection', 'interactive',
 'Best practices for email security including identifying threats and safe communication.',
 'https://example.com/email-security',
 '{"modules": 4, "email_simulations": 2, "quiz_questions": 15}', 
 1, (SELECT id FROM training_categories WHERE name = 'Security Awareness'), 
 35, 2, ARRAY['SOX'], 'published')
ON CONFLICT (title) DO NOTHING;

-- 3. Training Programs (schema is correct)
INSERT INTO training_programs (
  name, description, program_type, applicable_regulations, is_mandatory,
  target_departments, target_roles, recurrence_type, grace_period_days, 
  total_duration_minutes, difficulty_level, created_by
) VALUES
('New Employee Security Onboarding', 'Comprehensive security training for new hires', 'onboarding', 
 ARRAY['SOX', 'HIPAA'], true, ARRAY['ALL'], ARRAY['ALL'], 'once', 7, 85, 1, 1),

('Quarterly Security Refresher', 'Regular security awareness updates', 'recurring',
 ARRAY['SOX'], true, ARRAY['ALL'], ARRAY['ALL'], 'quarterly', 14, 35, 2, 1),

('Advanced Threat Detection', 'Advanced security training for IT staff', 'specialized',
 ARRAY['SOX', 'PCI-DSS'], false, ARRAY['IT Security', 'Engineering'], 
 ARRAY['developer', 'admin'], 'annually', 30, 120, 3, 1),

('GDPR Compliance for Managers', 'Data protection training for management', 'compliance',
 ARRAY['GDPR'], true, ARRAY['ALL'], ARRAY['manager', 'director'], 'annually', 21, 45, 2, 1),

('Email Security Mastery', 'Comprehensive email security training', 'standard',
 ARRAY['SOX'], false, ARRAY['ALL'], ARRAY['ALL'], 'semi-annually', 14, 55, 2, 1)
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
  1,
  true
FROM training_programs tp
CROSS JOIN training_content tc
WHERE tp.name = 'GDPR Compliance for Managers'
  AND tc.title = 'GDPR Compliance Fundamentals'
ON CONFLICT (program_id, content_id) DO NOTHING;

INSERT INTO training_program_content (program_id, content_id, sequence_order, is_required)
SELECT 
  tp.id,
  tc.id,
  1,
  true
FROM training_programs tp
CROSS JOIN training_content tc
WHERE tp.name = 'Email Security Mastery'
  AND tc.title = 'Email Security Guidelines'
ON CONFLICT (program_id, content_id) DO NOTHING;

-- 5. Create Sample Training Assignments (with correct column names)
INSERT INTO training_assignments (
  employee_id, program_id, assigned_by, due_date, status, assigned_date
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
  AND RANDOM() < 0.8  -- Assign to ~80% of employees
ON CONFLICT (employee_id, program_id) DO NOTHING;

-- 6. Update completion data for completed assignments (with correct column names)
UPDATE training_assignments 
SET 
  completed_at = NOW() - INTERVAL '2 days',
  completion_percentage = 100,
  score = 85 + RANDOM() * 15,  -- Random score between 85-100
  status = 'completed'
WHERE status = 'completed';

-- 7. Update progress for in-progress assignments
UPDATE training_assignments 
SET 
  completion_percentage = 25 + RANDOM() * 50,  -- Random progress 25-75%
  started_at = NOW() - INTERVAL '3 days'
WHERE status = 'in_progress';

-- 8. Update training program total durations based on content
UPDATE training_programs 
SET total_duration_minutes = (
  SELECT COALESCE(SUM(tc.estimated_duration_minutes), 0)
  FROM training_program_content tpc
  JOIN training_content tc ON tpc.content_id = tc.id
  WHERE tpc.program_id = training_programs.id
);

-- 9. Update content view and completion counts
UPDATE training_content 
SET 
  view_count = 50 + RANDOM() * 200,
  completion_count = 20 + RANDOM() * 100,
  average_rating = 3.5 + RANDOM() * 1.5
WHERE status = 'published';

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

-- Additional stats
SELECT 
  'Assignment Stats' as info,
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'assigned') as assigned
FROM training_assignments; 