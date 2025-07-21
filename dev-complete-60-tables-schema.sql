-- SecureWatch COMPLETE 60-Table Schema (Development Database Full Export)
-- This includes ALL tables for complete feature parity across environments

-- ===========================================
-- CORE AUTHENTICATION & USER MANAGEMENT
-- ===========================================

-- Users table (core authentication)
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

-- MFA related tables
CREATE TABLE IF NOT EXISTS mfa_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    secret_key VARCHAR(255),
    backup_codes TEXT[],
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- EMPLOYEE MANAGEMENT & MONITORING
-- ===========================================

-- Employees table (monitored users)
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

-- Employee metrics and behavior tracking
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

-- ===========================================
-- COMPLIANCE & REGULATORY FRAMEWORK
-- ===========================================

-- Compliance profiles
CREATE TABLE IF NOT EXISTS compliance_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    regulatory_framework VARCHAR(100),
    requirements JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance regulations
CREATE TABLE IF NOT EXISTS compliance_regulations (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(50) UNIQUE NOT NULL,
    regulation_name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100),
    effective_date DATE,
    description TEXT,
    requirements JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance incidents
CREATE TABLE IF NOT EXISTS compliance_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER REFERENCES employees(id),
    violation_id INTEGER REFERENCES violations(id),
    policy_id INTEGER REFERENCES internal_policies(id),
    severity VARCHAR(20) CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    status VARCHAR(30) DEFAULT 'Open',
    description TEXT NOT NULL,
    impact_assessment TEXT,
    remediation_plan TEXT,
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    escalated_to INTEGER REFERENCES users(id),
    due_date DATE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance dashboard metrics
CREATE TABLE IF NOT EXISTS compliance_incidents_dashboard (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_incidents INTEGER DEFAULT 0,
    critical_incidents INTEGER DEFAULT 0,
    high_incidents INTEGER DEFAULT 0,
    resolved_incidents INTEGER DEFAULT 0,
    overdue_incidents INTEGER DEFAULT 0,
    avg_resolution_days NUMERIC(5,2) DEFAULT 0,
    compliance_score NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date)
);

-- Compliance alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    triggered_by JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'Active',
    resolved_by INTEGER REFERENCES employees(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance analysis logs
CREATE TABLE IF NOT EXISTS compliance_analysis_log (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    data_sources JSONB DEFAULT '[]',
    findings JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    risk_score INTEGER DEFAULT 0,
    compliance_score INTEGER DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    analyzer_version VARCHAR(50)
);

-- Compliance audit log
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id SERIAL PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by INTEGER REFERENCES users(id),
    audit_timestamp TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(255)
);

-- Employee compliance status tracking
CREATE TABLE IF NOT EXISTS employee_compliance_status (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    regulation_code VARCHAR(50),
    compliance_status VARCHAR(30) DEFAULT 'Unknown',
    last_assessment DATE,
    next_assessment DATE,
    risk_factors JSONB DEFAULT '[]',
    mitigation_actions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, regulation_code)
);

-- Employee compliance analysis summary
CREATE TABLE IF NOT EXISTS employee_compliance_analysis_summary (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    analysis_date DATE DEFAULT CURRENT_DATE,
    overall_score INTEGER DEFAULT 0,
    risk_indicators JSONB DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    training_required JSONB DEFAULT '[]',
    recommendations TEXT,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, analysis_date)
);

-- ===========================================
-- TRAINING & CERTIFICATION SYSTEM
-- ===========================================

-- Training programs
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
    program_code VARCHAR(50) UNIQUE NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) DEFAULT 'security',
    duration_hours INTEGER DEFAULT 1,
    difficulty_level VARCHAR(20) DEFAULT 'Beginner',
    prerequisites JSONB DEFAULT '[]',
    learning_objectives JSONB DEFAULT '[]',
    created_by INTEGER REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training categories
CREATE TABLE IF NOT EXISTS training_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER REFERENCES training_categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Training content
CREATE TABLE IF NOT EXISTS training_content (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_data JSONB NOT NULL,
    display_order INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 5,
    is_mandatory BOOLEAN DEFAULT false,
    author_id INTEGER REFERENCES employees(id),
    reviewer_id INTEGER REFERENCES employees(id),
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training program content linking
CREATE TABLE IF NOT EXISTS training_program_content (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES training_content(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(program_id, content_id)
);

-- Training assignments
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES employees(id),
    assignment_reason VARCHAR(100),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'Assigned',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    score NUMERIC(5,2),
    attempts INTEGER DEFAULT 0,
    exemption_reason TEXT,
    exemption_approved_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training content progress
CREATE TABLE IF NOT EXISTS training_content_progress (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES training_content(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES training_assignments(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    score NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, content_id, assignment_id)
);

-- Training certificates
CREATE TABLE IF NOT EXISTS training_certificates (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES training_programs(id),
    certificate_id VARCHAR(100) UNIQUE NOT NULL,
    issued_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    score NUMERIC(5,2),
    certificate_data JSONB DEFAULT '{}',
    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES employees(id),
    revocation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Training compliance requirements
CREATE TABLE IF NOT EXISTS training_compliance_requirements (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    job_title VARCHAR(100),
    required_programs JSONB DEFAULT '[]',
    frequency_months INTEGER DEFAULT 12,
    grace_period_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee training compliance tracking
CREATE TABLE IF NOT EXISTS employee_training_compliance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    requirement_id INTEGER REFERENCES training_compliance_requirements(id),
    compliance_status VARCHAR(30) DEFAULT 'Not Started',
    last_completed DATE,
    next_due_date DATE,
    overdue_days INTEGER DEFAULT 0,
    exemption_granted BOOLEAN DEFAULT false,
    exemption_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, requirement_id)
);

-- Training notifications
CREATE TABLE IF NOT EXISTS training_notifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    program_id INTEGER REFERENCES training_programs(id),
    message TEXT NOT NULL,
    sent_at TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'Pending',
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- VIOLATIONS & INCIDENTS
-- ===========================================

-- Violations table
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

-- Violation status history
CREATE TABLE IF NOT EXISTS violation_status_history (
    id SERIAL PRIMARY KEY,
    violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- EMAIL COMMUNICATION ANALYSIS
-- ===========================================

-- Email communications
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

-- Gmail specific tables
CREATE TABLE IF NOT EXISTS gmail_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    thread_id VARCHAR(255),
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    recipients JSONB NOT NULL,
    subject TEXT,
    body_text TEXT,
    labels TEXT[],
    sent_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP DEFAULT NOW(),
    is_analyzed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmail_violations (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES gmail_messages(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    confidence_score NUMERIC(5,2) DEFAULT 0,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- GOOGLE WORKSPACE INTEGRATION
-- ===========================================

-- Google Workspace configuration
CREATE TABLE IF NOT EXISTS google_workspace_config (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255),
    client_secret VARCHAR(255),
    service_account_key JSONB,
    admin_email VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'never_synced',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Workspace users
CREATE TABLE IF NOT EXISTS google_workspace_users (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    google_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    is_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    last_login_time TIMESTAMP,
    creation_time TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Workspace sync jobs
CREATE TABLE IF NOT EXISTS google_workspace_sync_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Google Drive files tracking
CREATE TABLE IF NOT EXISTS google_drive_files (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) UNIQUE NOT NULL,
    owner_employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    sharing_permissions JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    last_modified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Drive violations
CREATE TABLE IF NOT EXISTS drive_violations (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES google_drive_files(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    description TEXT,
    detected_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'Active',
    resolved_at TIMESTAMP
);

-- ===========================================
-- MICROSOFT TEAMS INTEGRATION
-- ===========================================

-- Teams configuration
CREATE TABLE IF NOT EXISTS teams_config (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255),
    client_secret VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'never_synced',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams channels
CREATE TABLE IF NOT EXISTS teams_channels (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) DEFAULT 'standard',
    is_private BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams messages
CREATE TABLE IF NOT EXISTS teams_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    channel_id INTEGER REFERENCES teams_channels(id) ON DELETE CASCADE,
    sender_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    sender_email VARCHAR(255),
    message_text TEXT,
    message_type VARCHAR(50) DEFAULT 'message',
    attachments JSONB DEFAULT '[]',
    sent_at TIMESTAMP NOT NULL,
    is_analyzed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams sync jobs
CREATE TABLE IF NOT EXISTS teams_sync_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams violations
CREATE TABLE IF NOT EXISTS teams_violations (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES teams_messages(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    confidence_score NUMERIC(5,2) DEFAULT 0,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- THREAT DETECTION & SECURITY POLICIES
-- ===========================================

-- Threat categories
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

-- Category keywords
CREATE TABLE IF NOT EXISTS category_keywords (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0,
    is_phrase BOOLEAN DEFAULT false,
    context_required VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Category detection results
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

-- Security policies
CREATE TABLE IF NOT EXISTS security_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_level VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (policy_level IN ('global', 'group', 'user')),
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

-- Policy framework tables
CREATE TABLE IF NOT EXISTS policy_conditions (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
    condition_type VARCHAR(50) NOT NULL,
    condition_data JSONB NOT NULL,
    logic_operator VARCHAR(10) DEFAULT 'AND',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_actions (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL,
    execution_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_category_rules (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    rule_parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_executions (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id),
    trigger_event_type VARCHAR(50) NOT NULL,
    trigger_event_id INTEGER,
    execution_status VARCHAR(20) DEFAULT 'pending',
    execution_result JSONB DEFAULT '{}',
    executed_at TIMESTAMP DEFAULT NOW(),
    execution_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS policy_inheritance_cache (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    effective_policy JSONB NOT NULL,
    cache_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(policy_id, target_type, target_id)
);

-- Internal policies
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

-- ===========================================
-- AI & AUTOMATION
-- ===========================================

-- AI training and generation logs
CREATE TABLE IF NOT EXISTS ai_training_generation_log (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    requested_by INTEGER REFERENCES employees(id),
    employee_target_id INTEGER REFERENCES employees(id),
    generation_parameters JSONB DEFAULT '{}',
    generated_content JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    quality_score NUMERIC(3,2),
    reviewer_id INTEGER REFERENCES employees(id),
    review_notes TEXT,
    approved BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- AI validation requests
CREATE TABLE IF NOT EXISTS ai_validation_requests (
    id SERIAL PRIMARY KEY,
    validation_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB NOT NULL,
    validation_criteria JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    validation_result JSONB DEFAULT '{}',
    confidence_score NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ===========================================
-- NOTIFICATIONS & MESSAGING
-- ===========================================

-- Core notifications
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

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    delivery_method VARCHAR(20) DEFAULT 'web',
    frequency VARCHAR(20) DEFAULT 'immediate',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Notification delivery log
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    delivery_method VARCHAR(20) NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivery_attempt INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages (AI assistant)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- SYNC & INTEGRATION JOBS
-- ===========================================

-- General sync jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    integration_source VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sync statistics
CREATE TABLE IF NOT EXISTS sync_alert_statistics (
    id SERIAL PRIMARY KEY,
    sync_date DATE DEFAULT CURRENT_DATE,
    integration_source VARCHAR(50) NOT NULL,
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    high_alerts INTEGER DEFAULT 0,
    medium_alerts INTEGER DEFAULT 0,
    low_alerts INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sync_date, integration_source)
);

CREATE TABLE IF NOT EXISTS sync_compliance_statistics (
    id SERIAL PRIMARY KEY,
    sync_date DATE DEFAULT CURRENT_DATE,
    integration_source VARCHAR(50) NOT NULL,
    compliance_violations INTEGER DEFAULT 0,
    policy_violations INTEGER DEFAULT 0,
    training_violations INTEGER DEFAULT 0,
    data_violations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sync_date, integration_source)
);

-- ===========================================
-- SYSTEM CONFIGURATION
-- ===========================================

-- App settings (key-value configuration)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Core performance indexes
CREATE INDEX IF NOT EXISTS idx_employees_risk_score ON employees(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_compliance_profile ON employees(compliance_profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_ai_compliance_score ON employees(ai_compliance_score);
CREATE INDEX IF NOT EXISTS idx_employees_ai_compliance_status ON employees(ai_compliance_status);
CREATE INDEX IF NOT EXISTS idx_employees_ai_last_analyzed ON employees(ai_last_analyzed);

-- Violations indexes
CREATE INDEX IF NOT EXISTS idx_violations_employee ON violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_compliance_category ON violations(compliance_category);
CREATE INDEX IF NOT EXISTS idx_violations_requires_notification ON violations(requires_notification, created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Email analysis indexes
CREATE INDEX IF NOT EXISTS idx_email_sender ON email_communications(sender_employee_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_risk_score ON email_communications(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_email_flagged ON email_communications(is_flagged, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sync_status ON email_communications(sync_status);
CREATE INDEX IF NOT EXISTS idx_email_integration_source ON email_communications(integration_source);

-- Chat and metrics indexes
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_employee_date ON employee_metrics(employee_id, date);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_employee ON compliance_incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_employee ON compliance_alerts(employee_id);

-- Training indexes  
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_progress_employee ON training_content_progress(employee_id);

-- Policy indexes
CREATE INDEX IF NOT EXISTS idx_security_policies_level_active ON security_policies(policy_level, is_active);
CREATE INDEX IF NOT EXISTS idx_security_policies_target ON security_policies(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_threat_categories_active ON threat_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_threat_categories_type ON threat_categories(category_type);

-- ===========================================
-- SAMPLE DATA FOR IMMEDIATE FUNCTIONALITY
-- ===========================================

-- Essential app settings
INSERT INTO app_settings (key, value) VALUES 
('company_info', '{"name": "SecureWatch Corporation", "domain": "company.com", "industry": "Technology", "employee_count": 121}'),
('email_config', '{"enabled": true, "sync_interval_minutes": 15, "max_emails_per_sync": 1000, "retention_days": 90}'),
('dashboard_config', '{"refresh_interval": 30, "default_view": "high-risk", "alerts_enabled": true, "auto_refresh": true}'),
('office365_config', '{"enabled": false, "tenant_id": "", "client_id": "", "sync_status": "disconnected"}'),
('google_workspace_config', '{"enabled": false, "client_id": "", "client_secret": "", "sync_status": "disconnected"}'),
('teams_config', '{"enabled": false, "tenant_id": "", "client_id": "", "sync_status": "disconnected"}'),
('ai_config', '{"enabled": true, "model_version": "1.0", "analysis_enabled": true, "training_enabled": false}'),
('compliance_config', '{"enabled": true, "auto_assessment": true, "alert_threshold": 70, "regulations": ["GDPR", "SOX", "HIPAA"]}')
ON CONFLICT (key) DO NOTHING;

-- Core security policies
INSERT INTO security_policies (name, description, policy_level) VALUES 
('Data Protection Policy', 'Comprehensive data protection and privacy policy', 'global'),
('Access Control Policy', 'Controls user access to systems and data', 'global'),
('Email Security Policy', 'Email communication security guidelines', 'global'),
('Incident Response Policy', 'Procedures for handling security incidents', 'global'),
('Training Compliance Policy', 'Mandatory training requirements', 'global')
ON CONFLICT DO NOTHING;

-- Essential threat categories
INSERT INTO threat_categories (name, description, severity, base_risk_score, category_type) VALUES
('Data Exfiltration', 'Unauthorized removal or copying of sensitive data', 'High', 85, 'predefined'),
('Phishing Attempt', 'Social engineering attacks via email or other channels', 'Medium', 60, 'predefined'),
('Unauthorized Access', 'Improper or unauthorized system access attempts', 'High', 75, 'predefined'),
('Malware Detection', 'Malicious software or suspicious file activity', 'Critical', 95, 'predefined'),
('Policy Violation', 'Violations of internal security policies', 'Medium', 50, 'predefined'),
('Suspicious Behavior', 'Unusual employee behavior patterns', 'Medium', 55, 'predefined'),
('Data Loss Prevention', 'Potential data loss scenarios', 'High', 80, 'predefined'),
('Compliance Violation', 'Regulatory compliance violations', 'High', 85, 'predefined')
ON CONFLICT (name) DO NOTHING;

-- Essential internal policies
INSERT INTO internal_policies (policy_code, policy_name, policy_category, description) VALUES
('SEC-001', 'Employee Code of Conduct', 'security', 'General security guidelines for all employees'),
('SEC-002', 'Data Handling Policy', 'data_protection', 'Procedures for handling sensitive company data'),
('SEC-003', 'Email Communication Policy', 'communication', 'Guidelines for secure email communication'),
('SEC-004', 'Access Control Policy', 'access_control', 'User access and authentication requirements'),
('SEC-005', 'Incident Reporting Policy', 'incident_response', 'Procedures for reporting security incidents'),
('SEC-006', 'Training Requirements Policy', 'training', 'Mandatory training requirements for all staff'),
('COMP-001', 'GDPR Compliance Policy', 'compliance', 'General Data Protection Regulation compliance'),
('COMP-002', 'SOX Compliance Policy', 'compliance', 'Sarbanes-Oxley Act compliance requirements')
ON CONFLICT (policy_code) DO NOTHING;

-- Basic training programs
INSERT INTO training_programs (program_code, program_name, description, program_type, duration_hours) VALUES
('SEC-BASIC-001', 'Security Awareness Basics', 'Basic security awareness training for all employees', 'security', 2),
('SEC-EMAIL-001', 'Email Security Training', 'Email security and phishing awareness', 'security', 1),
('COMP-GDPR-001', 'GDPR Compliance Training', 'Data protection and GDPR compliance', 'compliance', 3),
('SEC-INCIDENT-001', 'Incident Response Training', 'How to respond to security incidents', 'security', 2)
ON CONFLICT (program_code) DO NOTHING;

-- Training categories
INSERT INTO training_categories (category_name, description) VALUES
('Security Fundamentals', 'Basic security awareness and practices'),
('Compliance & Regulatory', 'Regulatory compliance training'),
('Incident Response', 'Security incident handling procedures'),
('Data Protection', 'Data handling and privacy protection')
ON CONFLICT (category_name) DO NOTHING; 