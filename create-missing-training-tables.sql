-- Create missing training tables to fix 500 errors

-- Training Certificates table
CREATE TABLE IF NOT EXISTS training_certificates (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES training_programs(id),
    content_id INTEGER REFERENCES training_content(id),
    certificate_number VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_date TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked'
    regulation_compliance VARCHAR[] DEFAULT '{}',
    issued_by INTEGER REFERENCES employees(id),
    verification_code VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Compliance Requirements table
CREATE TABLE IF NOT EXISTS training_compliance_requirements (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(100) NOT NULL,
    requirement_title VARCHAR(255) NOT NULL,
    requirement_section VARCHAR(100),
    description TEXT,
    required_frequency VARCHAR(50), -- 'annual', 'quarterly', 'monthly', 'once'
    minimum_training_hours INTEGER DEFAULT 1,
    grace_period_days INTEGER DEFAULT 30,
    target_roles VARCHAR[] DEFAULT '{}',
    target_departments VARCHAR[] DEFAULT '{}',
    mandatory_programs INTEGER[] DEFAULT '{}',
    recommended_programs INTEGER[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add some sample data to prevent empty table errors

-- Sample certificates
INSERT INTO training_certificates (
    employee_id, program_id, certificate_number, title, description, 
    issued_date, expires_at, status, regulation_compliance
) VALUES
(1, 1, 'CERT-2025-001', 'Security Awareness Certification', 'Completed comprehensive security awareness training', 
 NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', 'active', ARRAY['SOX', 'HIPAA']),
(2, 1, 'CERT-2025-002', 'Security Awareness Certification', 'Completed comprehensive security awareness training', 
 NOW() - INTERVAL '20 days', NOW() + INTERVAL '365 days', 'active', ARRAY['SOX', 'HIPAA']),
(3, 2, 'CERT-2025-003', 'Quarterly Security Update', 'Completed quarterly security refresher training', 
 NOW() - INTERVAL '10 days', NOW() + INTERVAL '90 days', 'active', ARRAY['SOX'])
ON CONFLICT (certificate_number) DO NOTHING;

-- Sample compliance requirements
INSERT INTO training_compliance_requirements (
    regulation_code, requirement_title, requirement_section, description,
    required_frequency, minimum_training_hours, grace_period_days,
    target_roles, target_departments, is_active
) VALUES
('SOX', 'Annual Security Awareness Training', 'Section 404', 
 'All employees must complete annual security awareness training',
 'annual', 2, 30, ARRAY['ALL'], ARRAY['ALL'], true),
('HIPAA', 'Healthcare Data Protection Training', 'Security Rule 164.308',
 'Healthcare workers must complete data protection training',
 'annual', 3, 14, ARRAY['nurse', 'doctor', 'admin'], ARRAY['Healthcare', 'Medical'], true),
('GDPR', 'Data Privacy and Protection Training', 'Article 39',
 'All employees handling personal data must complete GDPR training',
 'annual', 4, 21, ARRAY['ALL'], ARRAY['ALL'], true),
('PCI-DSS', 'Payment Card Security Training', 'Requirement 12.6',
 'Employees handling payment data must complete PCI-DSS training',
 'semi-annual', 2, 14, ARRAY['cashier', 'finance'], ARRAY['Finance', 'Sales'], true)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_certificates_employee ON training_certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_certificates_status ON training_certificates(status);
CREATE INDEX IF NOT EXISTS idx_training_certificates_expires ON training_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_regulation ON training_compliance_requirements(regulation_code);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_active ON training_compliance_requirements(is_active);

-- Verification
SELECT 'Training Certificates' as table_name, COUNT(*) FROM training_certificates
UNION ALL
SELECT 'Compliance Requirements', COUNT(*) FROM training_compliance_requirements; 