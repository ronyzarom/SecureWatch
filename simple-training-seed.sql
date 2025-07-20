-- Simple Training Data Seed - Just get data in the tables to fix 500 errors

-- 1. Training Categories (simple version)
INSERT INTO training_categories (name, description, color, applicable_regulations, icon, priority) VALUES
('Security Awareness', 'General cybersecurity training', '#3B82F6', ARRAY['SOX']::varchar[], 'shield', 1),
('Compliance Training', 'Regulatory compliance training', '#10B981', ARRAY['GDPR']::varchar[], 'check-circle', 2),
('Data Protection', 'Data handling training', '#EF4444', ARRAY['GDPR']::varchar[], 'lock', 1);

-- 2. Training Content (simple version)
INSERT INTO training_content (
  title, description, content_type, content_body, category_id, 
  estimated_duration_minutes, difficulty_level, status, author_id
) VALUES
('Phishing Awareness', 'Learn to identify phishing attacks', 'video', 
 'Interactive training on phishing identification.', 1, 30, 2, 'published', 1),
('Password Security', 'Secure password practices', 'interactive',
 'Guide to strong passwords and authentication.', 1, 20, 1, 'published', 1),
('GDPR Fundamentals', 'GDPR compliance basics', 'document',
 'Understanding GDPR requirements.', 3, 45, 2, 'published', 1);

-- 3. Training Programs (simple version)
INSERT INTO training_programs (
  name, description, program_type, is_mandatory, created_by,
  target_departments, target_roles, recurrence_type, grace_period_days
) VALUES
('Security Onboarding', 'New employee security training', 'onboarding', 
 true, 1, ARRAY['ALL']::varchar[], ARRAY['ALL']::varchar[], 'once', 7),
('Quarterly Refresher', 'Regular security updates', 'recurring',
 true, 1, ARRAY['ALL']::varchar[], ARRAY['ALL']::varchar[], 'quarterly', 14);

-- 4. Link content to programs
INSERT INTO training_program_content (program_id, content_id, sequence_order, is_required) VALUES
(1, 1, 1, true),
(1, 2, 2, true),
(2, 1, 1, true);

-- 5. Create training assignments
INSERT INTO training_assignments (employee_id, program_id, assigned_by, due_date, status) 
SELECT 
  e.id, 
  1, 
  1, 
  NOW() + INTERVAL '30 days',
  'assigned'
FROM employees e 
WHERE e.is_active = true 
LIMIT 5;

-- Update some to completed
UPDATE training_assignments 
SET status = 'completed', completed_at = NOW(), completion_percentage = 100, score = 90
WHERE id IN (SELECT id FROM training_assignments LIMIT 2);

-- Verification
SELECT 'Categories' as table_name, COUNT(*) FROM training_categories
UNION ALL
SELECT 'Content', COUNT(*) FROM training_content  
UNION ALL
SELECT 'Programs', COUNT(*) FROM training_programs
UNION ALL
SELECT 'Assignments', COUNT(*) FROM training_assignments; 