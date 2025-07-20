#!/bin/bash

# Complete Database Setup for SecureWatch Production
echo "🚀 Setting up COMPLETE SecureWatch database schema..."
echo "=================================================="

# Database connection
DATABASE_URL="postgresql://securewatch_user:xal1E0T4RYToxkRwtRHMNXH33cW4zW1z@dpg-d1tcmkruibrs73fc3tu0-a.oregon-postgres.render.com/securewatch"

echo ""
echo "📊 STEP 1: Creating core application tables..."
echo "=============================================="
psql "$DATABASE_URL" -f backend/database/schema.sql

echo ""
echo "📚 STEP 2: Creating training management tables..."
echo "==============================================="
psql "$DATABASE_URL" -f backend/database/training-management-schema.sql

echo ""
echo "🔧 STEP 3: Creating additional schema tables..."
echo "=============================================="
psql "$DATABASE_URL" -f backend/database/mfa-schema.sql
psql "$DATABASE_URL" -f backend/database/notifications-schema.sql
psql "$DATABASE_URL" -f backend/database/policies-schema.sql
psql "$DATABASE_URL" -f backend/database/compliance-framework-schema.sql

echo ""
echo "👤 STEP 4: Creating admin user..."
echo "================================"
psql "$DATABASE_URL" << 'EOF'
-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role, department, is_active) 
VALUES (
  'admin@company.com',
  '$2b$10$rOj.3h9V7nIGd8cKGf7Oku.QT1jOr8ZGDLl0xzVl9Fw9YtW9Mq9K6',
  'System Administrator',
  'admin',
  'IT Security',
  true
) ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  is_active = EXCLUDED.is_active;
EOF

echo ""
echo "📄 STEP 5: Seeding sample data..."
echo "================================"
psql "$DATABASE_URL" << 'EOF'
-- Insert sample employees
INSERT INTO employees (name, email, department, job_title, risk_score, risk_level) VALUES
('John Smith', 'john.smith@company.com', 'Engineering', 'Senior Developer', 15, 'Low'),
('Sarah Johnson', 'sarah.johnson@company.com', 'Marketing', 'Marketing Manager', 30, 'Medium'),
('Mike Davis', 'mike.davis@company.com', 'Sales', 'Sales Director', 45, 'Medium'),
('Emily Chen', 'emily.chen@company.com', 'HR', 'HR Specialist', 10, 'Low'),
('David Wilson', 'david.wilson@company.com', 'Engineering', 'DevOps Engineer', 60, 'High')
ON CONFLICT (email) DO NOTHING;

-- Insert sample violations
INSERT INTO violations (employee_id, type, severity, description, status) 
SELECT 
  e.id,
  'Email Policy Violation',
  'Medium',
  'Shared confidential information externally',
  'Active'
FROM employees e 
WHERE e.email = 'sarah.johnson@company.com'
ON CONFLICT DO NOTHING;
EOF

echo ""
echo "✅ COMPLETE DATABASE SETUP FINISHED!"
echo "===================================="
echo ""
echo "🎯 What was created:"
echo "• Core tables: users, employees, violations, etc."
echo "• Training management: programs, content, compliance"
echo "• Additional features: MFA, notifications, policies"
echo "• Admin user: admin@company.com / admin123"
echo "• Sample data: employees and violations"
echo ""
echo "🚀 Your application should now be FULLY FUNCTIONAL!" 