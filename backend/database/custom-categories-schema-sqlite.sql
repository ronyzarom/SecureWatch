-- Custom Categories Database Schema for SQLite
-- For advanced threat detection and behavioral analysis

-- Drop existing tables if they exist
DROP TABLE IF EXISTS category_detection_results;
DROP TABLE IF EXISTS policy_category_rules;
DROP TABLE IF EXISTS category_keywords;
DROP TABLE IF EXISTS threat_categories;

-- 1. Threat Categories Table
CREATE TABLE threat_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    
    -- Pattern Configuration (JSON as TEXT in SQLite)
    detection_patterns TEXT DEFAULT '{}', -- JSON: {"email_patterns": [], "behavioral_patterns": [], "time_patterns": []}
    risk_multipliers TEXT DEFAULT '{}', -- JSON: {"after_hours": 1.5, "external_contact": 2.0, "frequency": 1.3}
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT 1,
    is_system_category BOOLEAN DEFAULT 0, -- Cannot be deleted if true
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (SQLite syntax)
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2. Category Keywords Table
CREATE TABLE category_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0, -- Keyword importance multiplier
    is_phrase BOOLEAN DEFAULT 0, -- True if it's a multi-word phrase
    context_required VARCHAR(255), -- Optional context requirement
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES threat_categories(id) ON DELETE CASCADE
);

-- 3. Policy Category Rules Table (links policies to categories)
CREATE TABLE policy_category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    
    -- Rule Configuration
    is_enabled BOOLEAN DEFAULT 1,
    custom_threshold INTEGER, -- Override category default threshold
    custom_risk_score INTEGER, -- Override category default risk score
    custom_keywords TEXT DEFAULT '[]', -- JSON: Additional keywords for this policy
    
    -- Behavioral Rules
    frequency_limit INTEGER, -- Max occurrences per time period
    time_window_hours INTEGER DEFAULT 24, -- Time window for frequency limit
    require_multiple_indicators BOOLEAN DEFAULT 0,
    
    -- Actions (JSON as TEXT in SQLite)
    action_config TEXT DEFAULT '{}', -- JSON: {"email_alert": true, "escalate": false, "lockdown": false}
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (policy_id) REFERENCES security_policies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES threat_categories(id) ON DELETE CASCADE,
    UNIQUE(policy_id, category_id)
);

-- 4. Category Detection Results Table (tracks analysis results)
CREATE TABLE category_detection_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Link to analysis target
    email_id INTEGER,
    employee_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    
    -- Detection Results
    matched_keywords TEXT DEFAULT '[]', -- JSON: Keywords that triggered detection
    pattern_matches TEXT DEFAULT '[]', -- JSON: Behavioral patterns that matched
    confidence_score DECIMAL(5,2) DEFAULT 0.0, -- 0.0 to 100.0
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- Context Information (JSON as TEXT in SQLite)
    detection_context TEXT DEFAULT '{}', -- JSON: Additional context about the detection
    false_positive BOOLEAN, -- Manual override for false positives
    analyst_notes TEXT,
    
    -- Metadata
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyzer_version VARCHAR(50) DEFAULT '1.0.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (email_id) REFERENCES email_communications(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES threat_categories(id) ON DELETE CASCADE
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

-- Insert predefined threat categories
INSERT INTO threat_categories (name, description, category_type, industry, base_risk_score, severity, is_system_category, detection_patterns, risk_multipliers) VALUES

-- Data Protection Categories
('Data Exfiltration', 'Unauthorized data export or transfer to external systems', 'predefined', 'All', 80, 'Critical', 1, 
 '{"email_patterns": ["bulk_download", "external_transfer", "personal_account"], "behavioral_patterns": ["after_hours_access", "unusual_volume"], "attachment_patterns": ["large_files", "encrypted_files"]}',
 '{"after_hours": 2.0, "external_recipient": 1.8, "large_attachment": 1.5, "frequency": 1.3}'),

('Intellectual Property Theft', 'Unauthorized access to proprietary information and trade secrets', 'predefined', 'Technology', 75, 'High', 1,
 '{"email_patterns": ["source_code", "patent_info", "proprietary_docs"], "behavioral_patterns": ["code_repository_access", "document_hoarding"], "access_patterns": ["research_data", "design_files"]}',
 '{"competitor_contact": 2.5, "after_hours": 1.7, "external_recipient": 2.0}'),

('Customer Data Misuse', 'Inappropriate handling or sharing of customer information', 'predefined', 'All', 70, 'High', 1,
 '{"email_patterns": ["customer_list", "personal_info", "contact_details"], "behavioral_patterns": ["database_queries", "export_activity"], "compliance_patterns": ["gdpr_violation", "privacy_breach"]}',
 '{"external_recipient": 2.2, "bulk_export": 1.8, "personal_email": 1.6}'),

-- Financial Fraud Categories  
('Expense Fraud', 'Fraudulent expense claims and reimbursement schemes', 'predefined', 'All', 65, 'High', 1,
 '{"email_patterns": ["duplicate_receipts", "personal_expenses", "inflated_amounts"], "behavioral_patterns": ["submission_timing", "approval_bypass"], "document_patterns": ["receipt_manipulation", "vendor_creation"]}',
 '{"weekend_submission": 1.4, "round_numbers": 1.3, "duplicate_vendor": 1.6}'),

('Vendor Kickbacks', 'Unauthorized benefits and payments from vendors', 'predefined', 'All', 85, 'Critical', 1,
 '{"email_patterns": ["personal_benefits", "cash_payments", "gift_exchanges"], "behavioral_patterns": ["vendor_personal_contact", "contract_influence"], "payment_patterns": ["irregular_payments", "personal_accounts"]}',
 '{"personal_communication": 2.0, "payment_irregularity": 1.8, "gift_mention": 1.5}'),

('Invoice Manipulation', 'Fraudulent invoice processing and payment schemes', 'predefined', 'Finance', 75, 'High', 1,
 '{"email_patterns": ["invoice_changes", "payment_redirects", "vendor_impersonation"], "behavioral_patterns": ["approval_rush", "documentation_gaps"], "system_patterns": ["payment_modifications", "vendor_updates"]}',
 '{"urgent_processing": 1.6, "payment_change": 2.0, "vendor_communication": 1.4}'),

-- Behavioral Risk Categories
('Pre-Termination Indicators', 'Signs of employee planning to leave with potential data theft', 'predefined', 'All', 60, 'Medium', 1,
 '{"email_patterns": ["job_search", "competitor_contact", "resignation_hints"], "behavioral_patterns": ["data_hoarding", "access_expansion", "meeting_decline"], "communication_patterns": ["external_increase", "internal_decrease"]}',
 '{"data_access_spike": 1.8, "competitor_communication": 2.2, "access_pattern_change": 1.5}'),

('Competitor Communication', 'Unauthorized contact and information sharing with competitors', 'predefined', 'All', 70, 'High', 1,
 '{"email_patterns": ["competitor_domains", "industry_contacts", "confidential_sharing"], "behavioral_patterns": ["strategic_info_access", "meeting_coordination"], "relationship_patterns": ["external_business_relationships"]}',
 '{"competitor_domain": 2.5, "confidential_context": 2.0, "meeting_coordination": 1.6}'),

('Policy Violations', 'General violations of company policies and procedures', 'predefined', 'All', 55, 'Medium', 1,
 '{"email_patterns": ["policy_bypass", "unauthorized_access", "procedure_violation"], "behavioral_patterns": ["system_misuse", "access_violations"], "compliance_patterns": ["regulatory_breach", "security_bypass"]}',
 '{"system_bypass": 1.5, "access_violation": 1.7, "policy_mention": 1.2}');

-- Insert default keywords for each category
INSERT INTO category_keywords (category_id, keyword, weight, is_phrase) VALUES

-- Data Exfiltration keywords
(1, 'export data', 1.5, 1),
(1, 'download database', 1.8, 1),
(1, 'backup', 1.2, 0),
(1, 'transfer files', 1.3, 1),
(1, 'personal account', 1.6, 1),
(1, 'dropbox', 1.4, 0),
(1, 'google drive', 1.4, 1),
(1, 'usb drive', 1.7, 1),
(1, 'external drive', 1.6, 1),

-- IP Theft keywords  
(2, 'source code', 1.8, 1),
(2, 'proprietary', 1.5, 0),
(2, 'trade secret', 1.9, 1),
(2, 'patent', 1.6, 0),
(2, 'confidential', 1.4, 0),
(2, 'algorithm', 1.5, 0),
(2, 'research data', 1.7, 1),

-- Customer Data Misuse keywords
(3, 'customer list', 1.8, 1),
(3, 'customer data', 1.6, 1),
(3, 'contact details', 1.5, 1),
(3, 'personal information', 1.7, 1),
(3, 'customer database', 1.9, 1),

-- Expense Fraud keywords
(4, 'duplicate receipt', 1.8, 1),
(4, 'personal expense', 1.6, 1),
(4, 'reimbursement', 1.3, 0),
(4, 'receipt', 1.2, 0),
(4, 'expense report', 1.4, 1),

-- Vendor Kickbacks keywords
(5, 'kickback', 2.0, 0),
(5, 'personal benefit', 1.7, 1),
(5, 'cash payment', 1.8, 1),
(5, 'gift', 1.4, 0),
(5, 'commission', 1.6, 0),

-- Invoice Manipulation keywords
(6, 'invoice change', 1.8, 1),
(6, 'payment redirect', 1.9, 1),
(6, 'vendor impersonation', 2.0, 1),
(6, 'payment modification', 1.7, 1),

-- Pre-termination keywords
(7, 'job interview', 1.8, 1),
(7, 'resignation', 1.9, 0),
(7, 'new opportunity', 1.5, 1),
(7, 'leaving company', 1.7, 1),
(7, 'competitor', 1.6, 0),

-- Competitor Communication keywords
(8, 'competitor', 1.8, 0),
(8, 'rival company', 1.7, 1),
(8, 'industry contact', 1.5, 1),
(8, 'confidential sharing', 1.9, 1),

-- Policy Violations keywords
(9, 'policy bypass', 1.6, 1),
(9, 'unauthorized access', 1.7, 1),
(9, 'procedure violation', 1.5, 1),
(9, 'against policy', 1.4, 1); 