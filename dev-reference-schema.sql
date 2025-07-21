-- SecureWatch Complete Reference Schema (from Development Database)
-- This schema represents the full-featured development environment
-- Used as reference for ABC-SW migration and future customer deployments

-- 1. Users table (with MFA support)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
    department VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT[],
    mfa_last_used TIMESTAMP
);

-- 2. Employees table (comprehensive with compliance and AI features)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(255),
    job_title VARCHAR(255),
    photo_url TEXT,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) DEFAULT 'Low' CHECK (risk_level IN ('Critical', 'High', 'Medium', 'Low')),
    last_activity TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    compliance_profile_id INTEGER,
    compliance_notes TEXT,
    data_retention_until DATE,
    regulatory_status JSONB DEFAULT '{}',
    last_compliance_review DATE,
    compliance_exceptions JSONB DEFAULT '{}',
    ai_compliance_score INTEGER DEFAULT 0,
    ai_compliance_status VARCHAR(50) DEFAULT 'unknown',
    ai_risk_trend VARCHAR(20) DEFAULT 'unknown',
    ai_last_analyzed TIMESTAMP
);

-- 3. Violations table (advanced with compliance tracking)
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Low' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved')),
    evidence TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    compliance_category VARCHAR(50),
    regulatory_impact JSONB DEFAULT '{}',
    policy_references TEXT[] DEFAULT '{}',
    compliance_severity VARCHAR(20),
    requires_notification BOOLEAN DEFAULT false,
    notification_timeline_hours INTEGER
);

-- 4. Notifications table (comprehensive with delivery tracking)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    violation_id INTEGER REFERENCES violations(id) ON DELETE SET NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    category VARCHAR(20) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Security policies table (advanced with compliance mapping)
CREATE TABLE IF NOT EXISTS security_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_level VARCHAR(20) NOT NULL CHECK (policy_level IN ('global', 'group', 'user')),
    target_type VARCHAR(20) CHECK (target_type IN ('department', 'role', 'user')),
    target_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    compliance_mapping JSONB DEFAULT '{}',
    regulatory_basis TEXT[] DEFAULT '{}',
    internal_policy_basis TEXT[] DEFAULT '{}'
);

-- 6. Threat categories table (comprehensive with detection patterns)
CREATE TABLE IF NOT EXISTS threat_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('predefined', 'custom', 'industry_specific')),
    industry VARCHAR(100),
    base_risk_score INTEGER DEFAULT 50 CHECK (base_risk_score >= 0 AND base_risk_score <= 100),
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    alert_threshold INTEGER DEFAULT 70 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    investigation_threshold INTEGER DEFAULT 85 CHECK (investigation_threshold >= 0 AND investigation_threshold <= 100),
    critical_threshold INTEGER DEFAULT 95 CHECK (critical_threshold >= 0 AND critical_threshold <= 100),
    detection_patterns JSONB DEFAULT '{}',
    risk_multipliers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_system_category BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Category keywords table
CREATE TABLE IF NOT EXISTS category_keywords (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0,
    is_phrase BOOLEAN DEFAULT false,
    context_required VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. App settings table (simple key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Employee metrics table (daily behavioral data)
CREATE TABLE IF NOT EXISTS employee_metrics (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    email_volume INTEGER DEFAULT 0,
    external_contacts INTEGER DEFAULT 0,
    after_hours_activity INTEGER DEFAULT 0,
    data_transfer NUMERIC(8,2) DEFAULT 0,
    security_events INTEGER DEFAULT 0,
    behavior_change INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 10. Chat messages table (AI assistant conversations)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Email communications table (comprehensive email analysis)
CREATE TABLE IF NOT EXISTS email_communications (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    thread_id VARCHAR(255),
    integration_source VARCHAR(20) NOT NULL CHECK (integration_source IN ('office365', 'google_workspace')),
    sender_employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    recipients JSONB NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB,
    sent_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags JSONB DEFAULT '{}',
    category VARCHAR(50) DEFAULT 'internal',
    is_flagged BOOLEAN DEFAULT false,
    is_analyzed BOOLEAN DEFAULT false,
    analyzed_at TIMESTAMP,
    analyzer_version VARCHAR(50),
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processed', 'error', 'skipped')),
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Internal policies table (advanced policy management)
CREATE TABLE IF NOT EXISTS internal_policies (
    id SERIAL PRIMARY KEY,
    policy_code VARCHAR(50) UNIQUE NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    policy_category VARCHAR(50) NOT NULL,
    description TEXT,
    configuration JSONB DEFAULT '{}',
    applies_to_departments TEXT[] DEFAULT '{}',
    applies_to_roles TEXT[] DEFAULT '{}',
    parent_policy_id INTEGER REFERENCES internal_policies(id),
    priority_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Category detection results table (email analysis results)
CREATE TABLE IF NOT EXISTS category_detection_results (
    id SERIAL PRIMARY KEY,
    email_id INTEGER REFERENCES email_communications(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    matched_keywords JSONB DEFAULT '[]',
    pattern_matches JSONB DEFAULT '[]',
    confidence_score NUMERIC(5,2) DEFAULT 0.0,
    risk_score INTEGER DEFAULT 0,
    detection_context JSONB DEFAULT '{}',
    false_positive BOOLEAN,
    analyst_notes TEXT,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    analyzer_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance (essential ones)
CREATE INDEX IF NOT EXISTS idx_employees_risk_score ON employees(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_compliance_profile ON employees(compliance_profile_id);
CREATE INDEX IF NOT EXISTS idx_violations_employee ON violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_sender ON email_communications(sender_employee_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_risk_score ON email_communications(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_employee_date ON employee_metrics(employee_id, date);

-- Sample data for essential tables
INSERT INTO app_settings (key, value) VALUES 
('company_info', '{"name": "SecureWatch Corporation", "domain": "company.com", "industry": "Technology", "employee_count": 1247}'),
('email_config', '{"enabled": true, "sync_interval_minutes": 15, "max_emails_per_sync": 1000, "retention_days": 90}'),
('dashboard_config', '{"refresh_interval": 30, "default_view": "high-risk", "alerts_enabled": true, "auto_refresh": true}'),
('office365_config', '{"enabled": false, "tenant_id": "", "client_id": "", "sync_status": "disconnected"}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO security_policies (name, description, policy_level) VALUES 
('Data Protection Policy', 'Comprehensive data protection and privacy policy', 'global'),
('Access Control Policy', 'Controls user access to systems and data', 'global'),
('Email Security Policy', 'Email communication security guidelines', 'global')
ON CONFLICT DO NOTHING;

INSERT INTO threat_categories (name, description, severity, base_risk_score, category_type) VALUES
('Data Exfiltration', 'Unauthorized removal or copying of sensitive data', 'High', 85, 'predefined'),
('Phishing Attempt', 'Social engineering attacks via email or other channels', 'Medium', 60, 'predefined'),
('Unauthorized Access', 'Improper or unauthorized system access attempts', 'High', 75, 'predefined'),
('Malware Detection', 'Malicious software or suspicious file activity', 'Critical', 95, 'predefined'),
('Policy Violation', 'Violations of internal security policies', 'Medium', 50, 'predefined')
ON CONFLICT (name) DO NOTHING;

INSERT INTO internal_policies (policy_code, policy_name, policy_category, description) VALUES
('SEC-001', 'Employee Code of Conduct', 'security', 'General security guidelines for all employees'),
('SEC-002', 'Data Handling Policy', 'data_protection', 'Procedures for handling sensitive company data'),
('SEC-003', 'Email Communication Policy', 'communication', 'Guidelines for secure email communication'),
('SEC-004', 'Access Control Policy', 'access_control', 'User access and authentication requirements')
ON CONFLICT (policy_code) DO NOTHING; 