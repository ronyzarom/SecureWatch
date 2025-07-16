-- SecureWatch Database Schema (Single-Tenant)
-- Created: 2025-01-27

-- Drop existing tables (for development)
DROP TABLE IF EXISTS email_communications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS employee_metrics CASCADE;
DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- 1. Users table (system administrators/analysts)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),
    department VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Employees table (monitored employees)
CREATE TABLE employees (
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
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Violations table (policy violations)
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Low' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved')),
    evidence TEXT[], -- array of evidence strings
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Employee metrics (daily behavioral data)
CREATE TABLE employee_metrics (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    email_volume INTEGER DEFAULT 0,
    external_contacts INTEGER DEFAULT 0,
    after_hours_activity INTEGER DEFAULT 0, -- percentage
    data_transfer DECIMAL(8,2) DEFAULT 0, -- GB
    security_events INTEGER DEFAULT 0,
    behavior_change INTEGER DEFAULT 0, -- percentage
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 5. Chat messages (AI assistant conversations)
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- optional context
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Email communications (Office365/Google Workspace integration)
CREATE TABLE email_communications (
    id SERIAL PRIMARY KEY,
    
    -- Email metadata from connectors
    message_id VARCHAR(255) UNIQUE NOT NULL, -- Original email message ID from Office365/Gmail
    thread_id VARCHAR(255), -- Email thread identifier
    integration_source VARCHAR(20) NOT NULL CHECK (integration_source IN ('office365', 'google_workspace')),
    
    -- Sender and recipient information
    sender_employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    
    -- Recipients (JSON array for multiple recipients)
    recipients JSONB NOT NULL, -- [{"email": "user@company.com", "type": "to|cc|bcc", "employee_id": 123}]
    
    -- Email content
    subject TEXT,
    body_text TEXT, -- Plain text version
    body_html TEXT, -- HTML version (optional, may be large)
    
    -- Attachments
    attachments JSONB, -- [{"filename": "doc.pdf", "size": 1024, "type": "application/pdf", "attachment_id": "xyz"}]
    
    -- Email metadata
    sent_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    
    -- Security analysis
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags JSONB DEFAULT '{}', -- {"external_recipient": true, "sensitive_keywords": ["confidential"], "attachment_risk": "high"}
    
    -- Classification
    category VARCHAR(50) DEFAULT 'internal', -- "internal", "external", "suspicious", "policy_violation"
    is_flagged BOOLEAN DEFAULT false,
    is_analyzed BOOLEAN DEFAULT false,
    
    -- Monitoring metadata
    analyzed_at TIMESTAMP,
    analyzer_version VARCHAR(50),
    
    -- Connector sync info
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processed', 'error', 'skipped')),
    sync_error TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. App settings (configuration)
CREATE TABLE app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_employees_risk_score ON employees(risk_score DESC);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_risk_level ON employees(risk_level);
CREATE INDEX idx_violations_employee ON violations(employee_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_metrics_employee_date ON employee_metrics(employee_id, date);
CREATE INDEX idx_chat_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_chat_employee ON chat_messages(employee_id);

-- Email communications indexes
CREATE INDEX idx_email_sender ON email_communications(sender_employee_id, sent_at DESC);
CREATE INDEX idx_email_message_id ON email_communications(message_id);
CREATE INDEX idx_email_thread ON email_communications(thread_id);
CREATE INDEX idx_email_risk_score ON email_communications(risk_score DESC);
CREATE INDEX idx_email_flagged ON email_communications(is_flagged, sent_at DESC);
CREATE INDEX idx_email_category ON email_communications(category);
CREATE INDEX idx_email_sent_date ON email_communications(sent_at DESC);
CREATE INDEX idx_email_sync_status ON email_communications(sync_status);
CREATE INDEX idx_email_integration_source ON email_communications(integration_source);

-- JSONB indexes for email communications
CREATE INDEX idx_email_recipients ON email_communications USING GIN (recipients);
CREATE INDEX idx_email_risk_flags ON email_communications USING GIN (risk_flags);
CREATE INDEX idx_email_attachments ON email_communications USING GIN (attachments);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES 
('company_info', '{
  "name": "SecureWatch Corporation",
  "domain": "company.com", 
  "address": "123 Business Ave, Suite 100\nNew York, NY 10001",
  "phone": "+1 (555) 123-4567",
  "industry": "Technology",
  "employee_count": 1247,
  "logo_url": ""
}'),
('email_config', '{
  "enabled": true,
  "sync_interval_minutes": 15,
  "max_emails_per_sync": 1000,
  "retention_days": 90,
  "analysis_enabled": true
}'),
('office365_config', '{
  "enabled": false,
  "tenant_id": "",
  "client_id": "",
  "client_secret": "",
  "redirect_uri": "http://localhost:3001/api/integrations/office365/callback",
  "scopes": ["https://graph.microsoft.com/Mail.Read", "https://graph.microsoft.com/User.Read.All"],
  "last_sync": null,
  "sync_status": "disconnected"
}'),
('google_workspace_config', '{
  "enabled": false,
  "client_id": "",
  "client_secret": "",
  "redirect_uri": "http://localhost:3001/api/integrations/google/callback",
  "scopes": ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/admin.directory.user.readonly"],
  "domain": "",
  "last_sync": null,
  "sync_status": "disconnected"
}'),
('dashboard_config', '{
  "refresh_interval": 30,
  "default_view": "high-risk",
  "alerts_enabled": true,
  "auto_refresh": true
}');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role, department) VALUES 
('admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LsOeqHZq5Z5Z5Z5Z5', 'System Administrator', 'admin', 'IT Security');

-- Insert sample employees
INSERT INTO employees (name, email, department, job_title, photo_url, risk_score, risk_level, last_activity) VALUES 
('Sarah Mitchell', 'sarah.mitchell@company.com', 'Finance', 'Senior Analyst', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400', 92, 'Critical', NOW() - INTERVAL '2 hours'),
('David Chen', 'david.chen@company.com', 'Engineering', 'Software Developer', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400', 78, 'High', NOW() - INTERVAL '1 hour'),
('Emily Rodriguez', 'emily.rodriguez@company.com', 'Marketing', 'Marketing Manager', 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400', 65, 'High', NOW() - INTERVAL '30 minutes'),
('Michael Thompson', 'michael.thompson@company.com', 'Sales', 'Account Executive', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400', 45, 'Medium', NOW() - INTERVAL '15 minutes'),
('Lisa Wang', 'lisa.wang@company.com', 'HR', 'HR Specialist', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400', 28, 'Low', NOW() - INTERVAL '10 minutes'),
('James Wilson', 'james.wilson@company.com', 'IT', 'System Administrator', 'https://images.pexels.com/photos/1674666/pexels-photo-1674666.jpeg?auto=compress&cs=tinysrgb&w=400', 82, 'High', NOW() - INTERVAL '5 minutes');

-- Insert sample violations
INSERT INTO violations (employee_id, type, severity, description, status, evidence) VALUES 
(1, 'Unauthorized Data Access', 'Critical', 'Accessed financial records outside normal working hours', 'Active', ARRAY['Email metadata', 'System logs']),
(2, 'Policy Violation', 'High', 'Forwarded confidential emails to personal account', 'Investigating', ARRAY['Email forwarding logs']),
(6, 'Suspicious Activity', 'High', 'Unusual system access patterns detected', 'Investigating', ARRAY['System logs', 'Access patterns']);

-- Insert sample employee metrics
INSERT INTO employee_metrics (employee_id, date, email_volume, external_contacts, after_hours_activity, data_transfer, security_events, behavior_change) VALUES 
(1, CURRENT_DATE, 156, 23, 78, 2.3, 5, 85),
(2, CURRENT_DATE, 89, 12, 34, 1.7, 3, 45),
(3, CURRENT_DATE, 134, 18, 25, 0.8, 2, 20),
(4, CURRENT_DATE, 78, 15, 12, 0.4, 1, 10),
(5, CURRENT_DATE, 45, 8, 5, 0.2, 0, 5),
(6, CURRENT_DATE, 67, 6, 67, 3.1, 4, 72);

-- Update employee risk scores based on metrics and violations
UPDATE employees SET 
    risk_score = CASE 
        WHEN id = 1 THEN 92  -- Sarah (Critical)
        WHEN id = 2 THEN 78  -- David (High)
        WHEN id = 3 THEN 65  -- Emily (High)
        WHEN id = 4 THEN 45  -- Michael (Medium)
        WHEN id = 5 THEN 28  -- Lisa (Low)
        WHEN id = 6 THEN 82  -- James (High)
        ELSE risk_score
    END,
    risk_level = CASE 
        WHEN id = 1 THEN 'Critical'
        WHEN id IN (2, 3, 6) THEN 'High'
        WHEN id = 4 THEN 'Medium'
        WHEN id = 5 THEN 'Low'
        ELSE risk_level
    END;

-- Insert sample email communications
INSERT INTO email_communications (
    message_id, thread_id, integration_source, sender_employee_id, sender_email, recipients, 
    subject, body_text, sent_at, risk_score, risk_flags, category, is_flagged, is_analyzed, sync_status
) VALUES 
-- High-risk email from Sarah to external contact
('msg_001_office365', 'thread_001', 'office365', 1, 'sarah.mitchell@company.com', 
 '[{"email": "external.contact@competitor.com", "type": "to", "employee_id": null}]',
 'Q4 Financial Results - CONFIDENTIAL', 
 'Hi John, As discussed, here are the preliminary Q4 numbers. Please keep this confidential until the official announcement.',
 NOW() - INTERVAL '2 hours', 85, 
 '{"external_recipient": true, "sensitive_keywords": ["confidential", "financial"], "after_hours": true}',
 'external', true, true, 'processed'),

-- Internal team communication
('msg_002_office365', 'thread_002', 'office365', 2, 'david.chen@company.com',
 '[{"email": "emily.rodriguez@company.com", "type": "to", "employee_id": 3}, {"email": "michael.thompson@company.com", "type": "cc", "employee_id": 4}]',
 'Sprint Planning Meeting Notes',
 'Hi team, Here are the notes from todays sprint planning. Please review before tomorrow.',
 NOW() - INTERVAL '1 hour', 25,
 '{"internal_only": true, "project_related": true}',
 'internal', false, true, 'processed'),

-- Suspicious file sharing
('msg_003_google_workspace', 'thread_003', 'google_workspace', 6, 'james.wilson@company.com',
 '[{"email": "backup.service@external.com", "type": "to", "employee_id": null}]',
 'System Backup Files',
 'Attached are the backup files you requested. Please process them securely.',
 NOW() - INTERVAL '30 minutes', 78,
 '{"external_recipient": true, "large_attachments": true, "system_files": true}',
 'suspicious', true, true, 'processed'),

-- Normal HR communication
('msg_004_office365', 'thread_004', 'office365', 5, 'lisa.wang@company.com',
 '[{"email": "all-employees@company.com", "type": "bcc", "employee_id": null}]',
 'Updated Employee Handbook',
 'Dear team, Please find attached the updated employee handbook effective next month.',
 NOW() - INTERVAL '45 minutes', 15,
 '{"company_wide": true, "policy_update": true}',
 'internal', false, true, 'processed'),

-- Cross-department collaboration
('msg_005_google_workspace', 'thread_005', 'google_workspace', 3, 'emily.rodriguez@company.com',
 '[{"email": "sarah.mitchell@company.com", "type": "to", "employee_id": 1}, {"email": "lisa.wang@company.com", "type": "cc", "employee_id": 5}]',
 'Marketing Campaign Budget Approval',
 'Hi Sarah, Can you please approve the Q1 marketing budget? Lisa is CC''d for HR compliance.',
 NOW() - INTERVAL '15 minutes', 35,
 '{"budget_related": true, "cross_department": true}',
 'internal', false, true, 'processed');

-- Print success message
SELECT 'SecureWatch database schema with email communications created successfully! 📧🎉' AS status; 