-- SecureWatch Compliance Framework Schema
-- Adds regulatory compliance and internal policy management
-- Backward compatible with existing SecureWatch database

-- ========================================
-- COMPLIANCE CONFIGURATION TABLES
-- ========================================

-- Table for regulatory frameworks (GDPR, SOX, HIPAA, etc.)
CREATE TABLE IF NOT EXISTS compliance_regulations (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(20) UNIQUE NOT NULL, -- 'gdpr', 'sox', 'hipaa', 'pci_dss'
    regulation_name VARCHAR(255) NOT NULL,
    description TEXT,
    region VARCHAR(10), -- 'EU', 'US', 'CA', 'GLOBAL'
    is_active BOOLEAN DEFAULT false,
    
    -- Flexible configuration for each regulation
    configuration JSONB DEFAULT '{}', -- retention rules, data categories, requirements
    
    -- Metadata
    configured_by INTEGER REFERENCES users(id),
    configured_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure valid regulation codes
    CONSTRAINT valid_regulation_code CHECK (regulation_code ~ '^[a-z_]+$')
);

-- Table for internal organizational policies
CREATE TABLE IF NOT EXISTS internal_policies (
    id SERIAL PRIMARY KEY,
    policy_code VARCHAR(50) UNIQUE NOT NULL, -- 'employee_monitoring', 'data_retention'
    policy_name VARCHAR(255) NOT NULL,
    policy_category VARCHAR(50) NOT NULL, -- 'privacy', 'security', 'hr', 'it'
    description TEXT,
    
    -- Policy configuration
    configuration JSONB DEFAULT '{}', -- rules, thresholds, exceptions
    
    -- Applicability
    applies_to_departments TEXT[] DEFAULT '{}', -- Empty array means all departments
    applies_to_roles TEXT[] DEFAULT '{}', -- Empty array means all roles
    
    -- Policy hierarchy and inheritance
    parent_policy_id INTEGER REFERENCES internal_policies(id),
    priority_order INTEGER DEFAULT 100, -- Lower number = higher priority
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for compliance profiles (per employee/department combinations)
CREATE TABLE IF NOT EXISTS compliance_profiles (
    id SERIAL PRIMARY KEY,
    profile_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Applicable regulations and policies
    applicable_regulations INTEGER[] DEFAULT '{}', -- Array of regulation IDs
    applicable_policies INTEGER[] DEFAULT '{}', -- Array of internal policy IDs
    
    -- Computed compliance settings
    retention_period_years INTEGER DEFAULT 3,
    monitoring_level VARCHAR(20) DEFAULT 'standard', -- 'minimal', 'standard', 'enhanced', 'strict'
    data_classification VARCHAR(20) DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
    
    -- Configuration overrides
    configuration_overrides JSONB DEFAULT '{}',
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure valid monitoring levels
    CONSTRAINT valid_monitoring_level CHECK (monitoring_level IN ('minimal', 'standard', 'enhanced', 'strict')),
    CONSTRAINT valid_data_classification CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'))
);

-- ========================================
-- EXISTING TABLE ENHANCEMENTS
-- ========================================

-- Extend employees table with compliance information
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compliance_profile_id INTEGER REFERENCES compliance_profiles(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compliance_notes TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS data_retention_until DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS regulatory_status JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_compliance_review DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compliance_exceptions JSONB DEFAULT '{}';

-- Extend violations table with compliance context
ALTER TABLE violations ADD COLUMN IF NOT EXISTS compliance_category VARCHAR(50);
ALTER TABLE violations ADD COLUMN IF NOT EXISTS regulatory_impact JSONB DEFAULT '{}';
ALTER TABLE violations ADD COLUMN IF NOT EXISTS policy_references TEXT[] DEFAULT '{}';
ALTER TABLE violations ADD COLUMN IF NOT EXISTS compliance_severity VARCHAR(20);
ALTER TABLE violations ADD COLUMN IF NOT EXISTS requires_notification BOOLEAN DEFAULT false;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS notification_timeline_hours INTEGER;

-- Extend security_policies table with compliance mapping
ALTER TABLE security_policies ADD COLUMN IF NOT EXISTS compliance_mapping JSONB DEFAULT '{}';
ALTER TABLE security_policies ADD COLUMN IF NOT EXISTS regulatory_basis TEXT[] DEFAULT '{}';
ALTER TABLE security_policies ADD COLUMN IF NOT EXISTS internal_policy_basis TEXT[] DEFAULT '{}';

-- ========================================
-- COMPLIANCE AUDIT AND TRACKING
-- ========================================

-- Table for compliance audit trail
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id SERIAL PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL, -- 'policy_change', 'regulation_update', 'employee_review'
    entity_type VARCHAR(50) NOT NULL, -- 'employee', 'policy', 'regulation'
    entity_id INTEGER NOT NULL,
    
    -- Audit details
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'reviewed'
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    
    -- Compliance context
    triggered_by_regulation VARCHAR(20),
    triggered_by_policy VARCHAR(50),
    
    -- Metadata
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Note: compliance_incidents is now a VIEW based on the enhanced violations table
-- This provides backward compatibility while using a single source of truth

-- Create view for compliance incidents (backward compatibility)
CREATE OR REPLACE VIEW compliance_incidents AS
SELECT 
  id,
  incident_type,
  severity,
  workflow_status as status,
  employee_id,
  id as violation_id, -- Self-reference since violation IS the incident
  regulation_id,
  policy_id,
  type as title,
  description,
  impact_assessment,
  discovered_at,
  must_notify_by,
  resolved_at,
  assigned_to,
  escalated_to,
  created_at,
  updated_at
FROM violations 
WHERE source IN ('compliance_analysis', 'regulatory_compliance_analysis', 'policy_compliance_analysis', 'email_security_violation', 'manual_compliance_incident')
   OR compliance_category IS NOT NULL
   OR regulation_id IS NOT NULL 
   OR policy_id IS NOT NULL;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Compliance regulations indexes
CREATE INDEX IF NOT EXISTS idx_compliance_regulations_active ON compliance_regulations(is_active, regulation_code);
CREATE INDEX IF NOT EXISTS idx_compliance_regulations_region ON compliance_regulations(region, is_active);

-- Internal policies indexes
CREATE INDEX IF NOT EXISTS idx_internal_policies_active ON internal_policies(is_active, policy_category);
CREATE INDEX IF NOT EXISTS idx_internal_policies_departments ON internal_policies USING gin(applies_to_departments);
CREATE INDEX IF NOT EXISTS idx_internal_policies_roles ON internal_policies USING gin(applies_to_roles);
CREATE INDEX IF NOT EXISTS idx_internal_policies_priority ON internal_policies(priority_order, is_active);

-- Compliance profiles indexes
CREATE INDEX IF NOT EXISTS idx_compliance_profiles_monitoring ON compliance_profiles(monitoring_level, data_classification);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_entity ON compliance_audit_log(entity_type, entity_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_user ON compliance_audit_log(performed_by, performed_at DESC);

-- Enhanced employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_compliance_profile ON employees(compliance_profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_retention_until ON employees(data_retention_until) WHERE data_retention_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_compliance_review ON employees(last_compliance_review) WHERE last_compliance_review IS NOT NULL;

-- Enhanced violations indexes
CREATE INDEX IF NOT EXISTS idx_violations_compliance_category ON violations(compliance_category) WHERE compliance_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violations_compliance_severity ON violations(compliance_severity) WHERE compliance_severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violations_requires_notification ON violations(requires_notification, created_at) WHERE requires_notification = true;

-- Enhanced violations table indexes for compliance queries (replaces compliance_incidents indexes)
CREATE INDEX IF NOT EXISTS idx_violations_compliance_source ON violations(source) WHERE source LIKE '%compliance%';
CREATE INDEX IF NOT EXISTS idx_violations_workflow_status ON violations(workflow_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_regulation_id ON violations(regulation_id) WHERE regulation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violations_policy_id ON violations(policy_id) WHERE policy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_violations_must_notify_by ON violations(must_notify_by) WHERE must_notify_by IS NOT NULL;

-- ========================================
-- TRIGGERS FOR AUDIT TRAIL
-- ========================================

-- Function to log compliance changes
CREATE OR REPLACE FUNCTION log_compliance_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO compliance_audit_log (
            audit_type, entity_type, entity_id, action, new_values, performed_by
        ) VALUES (
            'entity_change',
            TG_TABLE_NAME,
            NEW.id,
            'created',
            to_jsonb(NEW),
            COALESCE(NEW.created_by, NEW.updated_by, 1)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO compliance_audit_log (
            audit_type, entity_type, entity_id, action, old_values, new_values, performed_by
        ) VALUES (
            'entity_change',
            TG_TABLE_NAME,
            NEW.id,
            'updated',
            to_jsonb(OLD),
            to_jsonb(NEW),
            COALESCE(NEW.updated_by, 1)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO compliance_audit_log (
            audit_type, entity_type, entity_id, action, old_values, performed_by
        ) VALUES (
            'entity_change',
            TG_TABLE_NAME,
            OLD.id,
            'deleted',
            to_jsonb(OLD),
            1 -- Default to system user for deletes
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
DROP TRIGGER IF EXISTS compliance_regulations_audit_trigger ON compliance_regulations;
CREATE TRIGGER compliance_regulations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compliance_regulations
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

DROP TRIGGER IF EXISTS internal_policies_audit_trigger ON internal_policies;
CREATE TRIGGER internal_policies_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON internal_policies
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

DROP TRIGGER IF EXISTS compliance_profiles_audit_trigger ON compliance_profiles;
CREATE TRIGGER compliance_profiles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compliance_profiles
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

-- ========================================
-- DEFAULT COMPLIANCE CONFIGURATIONS
-- ========================================

-- Insert default regulations (disabled by default)
INSERT INTO compliance_regulations (regulation_code, regulation_name, description, region, configuration) VALUES
('gdpr', 'GDPR (General Data Protection Regulation)', 'EU data protection regulation requiring privacy by design and data subject rights', 'EU', '{
    "data_retention": {
        "employee_data": "3_years",
        "former_employee_data": "1_year_post_employment",
        "service_accounts": "2_years"
    },
    "data_subject_rights": ["access", "rectification", "erasure", "portability"],
    "breach_notification_hours": 72,
    "privacy_by_design": true,
    "data_minimization": true
}'),
('sox', 'Sarbanes-Oxley Act', 'US financial reporting and audit trail requirements for public companies', 'US', '{
    "audit_retention": "7_years",
    "financial_data_retention": "7_years", 
    "access_logging": "mandatory",
    "segregation_of_duties": true,
    "audit_trail_immutable": true
}'),
('hipaa', 'HIPAA (Health Insurance Portability and Accountability Act)', 'US healthcare data protection requirements', 'US', '{
    "phi_retention": "6_years",
    "audit_logs": "6_years",
    "encryption_required": true,
    "access_controls": "role_based",
    "breach_notification_days": 60
}'),
('pci_dss', 'PCI DSS (Payment Card Industry Data Security Standard)', 'Payment card data protection requirements', 'GLOBAL', '{
    "cardholder_data_retention": "minimal",
    "access_logging": "mandatory",
    "encryption_required": true,
    "network_segmentation": true,
    "vulnerability_scanning": "quarterly"
}')
ON CONFLICT (regulation_code) DO NOTHING;

-- Insert default internal policy templates (disabled by default)
INSERT INTO internal_policies (policy_code, policy_name, policy_category, description, configuration) VALUES
('employee_monitoring', 'Employee Monitoring Policy', 'privacy', 'Guidelines for monitoring employee digital activities', '{
    "monitoring_scope": "business_hours_only",
    "personal_device_monitoring": false,
    "email_scanning": "metadata_only",
    "web_browsing_monitoring": "business_sites_only",
    "keystroke_logging": false
}'),
('data_retention', 'Data Retention Policy', 'security', 'Organizational data retention and disposal requirements', '{
    "default_retention": "5_years",
    "confidential_data": "7_years",
    "public_data": "3_years",
    "automatic_deletion": true,
    "retention_review_frequency": "annual"
}'),
('privileged_access', 'Privileged Access Management', 'security', 'Controls for elevated system access', '{
    "mfa_required": true,
    "session_recording": true,
    "approval_required": true,
    "access_review_frequency": "quarterly",
    "emergency_access_procedure": true
}'),
('external_communication', 'External Communication Monitoring', 'security', 'Monitoring of external communications for data protection', '{
    "email_dlp": true,
    "file_transfer_monitoring": true,
    "social_media_monitoring": false,
    "personal_device_email": "blocked",
    "encryption_required": true
}')
ON CONFLICT (policy_code) DO NOTHING;

-- Insert default compliance profiles
INSERT INTO compliance_profiles (profile_name, description, monitoring_level, data_classification) VALUES
('Standard Employee', 'Default compliance profile for regular employees', 'standard', 'internal'),
('Finance Team', 'Enhanced compliance profile for finance department', 'enhanced', 'confidential'),
('IT Administration', 'Strict compliance profile for IT administrators', 'strict', 'restricted'),
('Contractors', 'Minimal compliance profile for external contractors', 'minimal', 'internal'),
('Service Accounts', 'Compliance profile for automated systems and service accounts', 'enhanced', 'internal')
ON CONFLICT DO NOTHING;

-- ========================================
-- VIEWS FOR COMMON COMPLIANCE QUERIES
-- ========================================

-- View for employee compliance status
CREATE OR REPLACE VIEW employee_compliance_status AS
SELECT 
    e.id,
    e.name,
    e.email,
    e.department,
    cp.profile_name as compliance_profile,
    cp.monitoring_level,
    cp.data_classification,
    e.data_retention_until,
    e.last_compliance_review,
    CASE 
        WHEN e.data_retention_until IS NOT NULL AND e.data_retention_until < CURRENT_DATE THEN 'overdue'
        WHEN e.data_retention_until IS NOT NULL AND e.data_retention_until < CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'compliant'
    END as retention_status,
    CASE
        WHEN e.last_compliance_review IS NULL THEN 'never_reviewed'
        WHEN e.last_compliance_review < CURRENT_DATE - INTERVAL '1 year' THEN 'review_overdue'
        WHEN e.last_compliance_review < CURRENT_DATE - INTERVAL '10 months' THEN 'review_due_soon'
        ELSE 'up_to_date'
    END as review_status
FROM employees e
LEFT JOIN compliance_profiles cp ON e.compliance_profile_id = cp.id;

-- View for active compliance incidents requiring attention
CREATE OR REPLACE VIEW compliance_incidents_dashboard AS
SELECT 
    v.id,
    v.incident_type,
    v.severity,
    v.workflow_status as status,
    v.type as title,
    v.discovered_at,
    v.must_notify_by,
    e.name as employee_name,
    e.email as employee_email,
    cr.regulation_name,
    ip.policy_name,
    CASE 
        WHEN v.must_notify_by IS NOT NULL AND v.must_notify_by < NOW() THEN 'notification_overdue'
        WHEN v.must_notify_by IS NOT NULL AND v.must_notify_by < NOW() + INTERVAL '24 hours' THEN 'notification_due_soon'
        ELSE 'on_track'
    END as notification_status
FROM violations v
LEFT JOIN employees e ON v.employee_id = e.id
LEFT JOIN compliance_regulations cr ON v.regulation_id = cr.id
LEFT JOIN internal_policies ip ON v.policy_id = ip.id
WHERE v.workflow_status IN ('open', 'investigating')
  AND (v.source LIKE '%compliance%' 
       OR v.compliance_category IS NOT NULL
       OR v.regulation_id IS NOT NULL 
       OR v.policy_id IS NOT NULL);

COMMENT ON SCHEMA public IS 'SecureWatch database with compliance framework integration'; 