-- Custom Categories Database Schema
-- For advanced threat detection and behavioral analysis

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS category_detection_results CASCADE;
DROP TABLE IF EXISTS policy_category_rules CASCADE;
DROP TABLE IF EXISTS category_keywords CASCADE;
DROP TABLE IF EXISTS threat_categories CASCADE;

-- 1. Threat Categories Table
CREATE TABLE threat_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('predefined', 'custom', 'industry_specific')),
    industry VARCHAR(100), -- Healthcare, Finance, Technology, etc.
    
    -- Risk Configuration
    base_risk_score INTEGER DEFAULT 50 CHECK (base_risk_score >= 0 AND base_risk_score <= 100),
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    
    -- Alert Thresholds
    alert_threshold INTEGER DEFAULT 70 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    investigation_threshold INTEGER DEFAULT 85 CHECK (investigation_threshold >= 0 AND investigation_threshold <= 100),
    critical_threshold INTEGER DEFAULT 95 CHECK (critical_threshold >= 0 AND critical_threshold <= 100),
    
    -- Pattern Configuration
    detection_patterns JSONB DEFAULT '{}', -- {"email_patterns": [], "behavioral_patterns": [], "time_patterns": []}
    risk_multipliers JSONB DEFAULT '{}', -- {"after_hours": 1.5, "external_contact": 2.0, "frequency": 1.3}
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    is_system_category BOOLEAN DEFAULT false, -- Cannot be deleted if true
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Category Keywords Table
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0, -- Keyword importance multiplier
    is_phrase BOOLEAN DEFAULT false, -- True if it's a multi-word phrase
    context_required VARCHAR(255), -- Optional context requirement
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Policy Category Rules Table (links policies to categories)
CREATE TABLE policy_category_rules (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    
    -- Rule Configuration
    is_enabled BOOLEAN DEFAULT true,
    custom_threshold INTEGER, -- Override category default threshold
    custom_risk_score INTEGER, -- Override category default risk score
    custom_keywords JSONB DEFAULT '[]', -- Additional keywords for this policy
    
    -- Behavioral Rules
    frequency_limit INTEGER, -- Max occurrences per time period
    time_window_hours INTEGER DEFAULT 24, -- Time window for frequency limit
    require_multiple_indicators BOOLEAN DEFAULT false,
    
    -- Actions
    action_config JSONB DEFAULT '{}', -- {"email_alert": true, "escalate": false, "lockdown": false}
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(policy_id, category_id)
);

-- 4. Category Detection Results Table (tracks analysis results)
CREATE TABLE category_detection_results (
    id SERIAL PRIMARY KEY,
    
    -- Link to analysis target
    email_id INTEGER REFERENCES email_communications(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES threat_categories(id) ON DELETE CASCADE,
    
    -- Detection Results
    matched_keywords JSONB DEFAULT '[]', -- Keywords that triggered detection
    pattern_matches JSONB DEFAULT '[]', -- Behavioral patterns that matched
    confidence_score DECIMAL(5,2) DEFAULT 0.0, -- 0.0 to 100.0
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Context Information
    detection_context JSONB DEFAULT '{}', -- Additional context about the detection
    false_positive BOOLEAN, -- Manual override for false positives
    analyst_notes TEXT,
    
    -- Metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    analyzer_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_threat_categories_type ON threat_categories(category_type);
CREATE INDEX idx_threat_categories_industry ON threat_categories(industry);
CREATE INDEX idx_threat_categories_active ON threat_categories(is_active);
CREATE INDEX idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX idx_policy_category_rules_policy ON policy_category_rules(policy_id);
CREATE INDEX idx_policy_category_rules_category ON policy_category_rules(category_id);
CREATE INDEX idx_detection_results_email ON category_detection_results(email_id);
CREATE INDEX idx_detection_results_employee ON category_detection_results(employee_id);
CREATE INDEX idx_detection_results_category ON category_detection_results(category_id);
CREATE INDEX idx_detection_results_analyzed_at ON category_detection_results(analyzed_at DESC);

-- JSONB indexes for pattern matching
CREATE INDEX idx_threat_categories_patterns ON threat_categories USING GIN (detection_patterns);
CREATE INDEX idx_detection_results_keywords ON category_detection_results USING GIN (matched_keywords);
CREATE INDEX idx_detection_results_patterns ON category_detection_results USING GIN (pattern_matches);

-- Insert predefined threat categories
INSERT INTO threat_categories (name, description, category_type, industry, base_risk_score, severity, is_system_category, detection_patterns, risk_multipliers) VALUES

-- Data Protection Categories
('Data Exfiltration', 'Unauthorized data export or transfer to external systems', 'predefined', 'All', 80, 'Critical', true, 
 '{"email_patterns": ["bulk_download", "external_transfer", "personal_account"], "behavioral_patterns": ["after_hours_access", "unusual_volume"], "attachment_patterns": ["large_files", "encrypted_files"]}',
 '{"after_hours": 2.0, "external_recipient": 1.8, "large_attachment": 1.5, "frequency": 1.3}'),

('Intellectual Property Theft', 'Unauthorized access to proprietary information and trade secrets', 'predefined', 'Technology', 75, 'High', true,
 '{"email_patterns": ["source_code", "patent_info", "proprietary_docs"], "behavioral_patterns": ["code_repository_access", "document_hoarding"], "access_patterns": ["research_data", "design_files"]}',
 '{"competitor_contact": 2.5, "after_hours": 1.7, "external_recipient": 2.0}'),

('Customer Data Misuse', 'Inappropriate handling or sharing of customer information', 'predefined', 'All', 70, 'High', true,
 '{"email_patterns": ["customer_list", "personal_info", "contact_details"], "behavioral_patterns": ["database_queries", "export_activity"], "compliance_patterns": ["gdpr_violation", "privacy_breach"]}',
 '{"external_recipient": 2.2, "bulk_export": 1.8, "personal_email": 1.6}'),

-- Financial Fraud Categories  
('Expense Fraud', 'Fraudulent expense claims and reimbursement schemes', 'predefined', 'All', 65, 'High', true,
 '{"email_patterns": ["duplicate_receipts", "personal_expenses", "inflated_amounts"], "behavioral_patterns": ["submission_timing", "approval_bypass"], "document_patterns": ["receipt_manipulation", "vendor_creation"]}',
 '{"weekend_submission": 1.4, "round_numbers": 1.3, "duplicate_vendor": 1.6}'),

('Vendor Kickbacks', 'Unauthorized benefits and payments from vendors', 'predefined', 'All', 85, 'Critical', true,
 '{"email_patterns": ["personal_benefits", "cash_payments", "gift_exchanges"], "behavioral_patterns": ["vendor_personal_contact", "contract_influence"], "payment_patterns": ["irregular_payments", "personal_accounts"]}',
 '{"personal_communication": 2.0, "payment_irregularity": 1.8, "gift_mention": 1.5}'),

('Invoice Manipulation', 'Fraudulent invoice processing and payment schemes', 'predefined', 'Finance', 75, 'High', true,
 '{"email_patterns": ["invoice_changes", "payment_redirects", "vendor_impersonation"], "behavioral_patterns": ["approval_rush", "documentation_gaps"], "system_patterns": ["payment_modifications", "vendor_updates"]}',
 '{"urgent_processing": 1.6, "payment_change": 2.0, "vendor_communication": 1.4}'),

-- Behavioral Risk Categories
('Pre-Termination Indicators', 'Signs of employee planning to leave with potential data theft', 'predefined', 'All', 60, 'Medium', true,
 '{"email_patterns": ["job_search", "competitor_contact", "resignation_hints"], "behavioral_patterns": ["data_hoarding", "access_expansion", "meeting_decline"], "communication_patterns": ["external_increase", "internal_decrease"]}',
 '{"data_access_spike": 1.8, "competitor_communication": 2.2, "access_pattern_change": 1.5}'),

('Competitor Communication', 'Unauthorized contact and information sharing with competitors', 'predefined', 'All', 70, 'High', true,
 '{"email_patterns": ["competitor_domains", "industry_contacts", "confidential_sharing"], "behavioral_patterns": ["strategic_info_access", "meeting_coordination"], "relationship_patterns": ["external_business_relationships"]}',
 '{"competitor_domain": 2.5, "confidential_context": 2.0, "meeting_coordination": 1.6}'),

('Policy Violations', 'General violations of company policies and procedures', 'predefined', 'All', 55, 'Medium', true,
 '{"email_patterns": ["policy_bypass", "unauthorized_access", "procedure_violation"], "behavioral_patterns": ["system_misuse", "access_violations"], "compliance_patterns": ["regulatory_breach", "security_bypass"]}',
 '{"system_bypass": 1.5, "access_violation": 1.7, "policy_mention": 1.2}');

-- Insert default keywords for each category
INSERT INTO category_keywords (category_id, keyword, weight, is_phrase) VALUES

-- Data Exfiltration keywords
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'export data', 1.5, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'download database', 1.8, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'backup', 1.2, false),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'transfer files', 1.3, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'personal account', 1.6, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'dropbox', 1.4, false),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'google drive', 1.4, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'usb drive', 1.7, true),
((SELECT id FROM threat_categories WHERE name = 'Data Exfiltration'), 'external drive', 1.6, true),

-- IP Theft keywords  
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'source code', 1.8, true),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'proprietary', 1.5, false),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'trade secret', 1.9, true),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'patent', 1.6, false),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'confidential', 1.4, false),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'algorithm', 1.5, false),
((SELECT id FROM threat_categories WHERE name = 'Intellectual Property Theft'), 'research data', 1.7, true),

-- Expense Fraud keywords
((SELECT id FROM threat_categories WHERE name = 'Expense Fraud'), 'duplicate receipt', 1.8, true),
((SELECT id FROM threat_categories WHERE name = 'Expense Fraud'), 'personal expense', 1.6, true),
((SELECT id FROM threat_categories WHERE name = 'Expense Fraud'), 'reimbursement', 1.3, false),
((SELECT id FROM threat_categories WHERE name = 'Expense Fraud'), 'receipt', 1.2, false),
((SELECT id FROM threat_categories WHERE name = 'Expense Fraud'), 'expense report', 1.4, true),

-- Vendor Kickbacks keywords
((SELECT id FROM threat_categories WHERE name = 'Vendor Kickbacks'), 'kickback', 2.0, false),
((SELECT id FROM threat_categories WHERE name = 'Vendor Kickbacks'), 'personal benefit', 1.7, true),
((SELECT id FROM threat_categories WHERE name = 'Vendor Kickbacks'), 'cash payment', 1.8, true),
((SELECT id FROM threat_categories WHERE name = 'Vendor Kickbacks'), 'gift', 1.4, false),
((SELECT id FROM threat_categories WHERE name = 'Vendor Kickbacks'), 'commission', 1.6, false),

-- Pre-termination keywords
((SELECT id FROM threat_categories WHERE name = 'Pre-Termination Indicators'), 'job interview', 1.8, true),
((SELECT id FROM threat_categories WHERE name = 'Pre-Termination Indicators'), 'resignation', 1.9, false),
((SELECT id FROM threat_categories WHERE name = 'Pre-Termination Indicators'), 'new opportunity', 1.5, true),
((SELECT id FROM threat_categories WHERE name = 'Pre-Termination Indicators'), 'leaving company', 1.7, true),
((SELECT id FROM threat_categories WHERE name = 'Pre-Termination Indicators'), 'competitor', 1.6, false); 