-- Google Workspace Integration Schema
-- This schema supports storing Gmail messages and Google Drive files for security analysis

-- Gmail messages table - stores Gmail messages with risk analysis
CREATE TABLE IF NOT EXISTS gmail_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL, -- Gmail message ID
    thread_id VARCHAR(255) NOT NULL, -- Gmail thread ID
    user_email VARCHAR(255) NOT NULL, -- User who owns the mailbox
    from_email VARCHAR(255) NOT NULL, -- Sender email address
    to_emails TEXT, -- Recipient email addresses (comma-separated)
    cc_emails TEXT, -- CC email addresses (comma-separated)
    bcc_emails TEXT, -- BCC email addresses (comma-separated)
    subject VARCHAR(2000), -- Email subject
    body TEXT, -- Email body content
    body_type VARCHAR(50) DEFAULT 'text/plain', -- 'text/plain' or 'text/html'
    sent_at TIMESTAMP NOT NULL, -- When email was sent
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    category VARCHAR(100), -- Risk category determined by AI
    is_flagged BOOLEAN DEFAULT FALSE,
    analysis JSONB, -- Detailed risk analysis from AI
    labels JSONB DEFAULT '[]'::jsonb, -- Gmail labels
    raw_data JSONB, -- Full raw message data from Gmail API
    updated_at TIMESTAMP DEFAULT NOW(),
    imported_at TIMESTAMP DEFAULT NOW()
);

-- Google Drive files table - stores monitored Drive files and sharing info
CREATE TABLE IF NOT EXISTS google_drive_files (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(255) UNIQUE NOT NULL, -- Google Drive file ID
    name VARCHAR(1000) NOT NULL, -- File name
    mime_type VARCHAR(100), -- File MIME type
    owner_email VARCHAR(255) NOT NULL, -- File owner email
    size_bytes BIGINT DEFAULT 0, -- File size in bytes
    created_at_drive TIMESTAMP, -- When file was created in Drive
    modified_at_drive TIMESTAMP, -- When file was last modified in Drive
    shared_publicly BOOLEAN DEFAULT FALSE, -- Whether file is publicly accessible
    sharing_permissions JSONB DEFAULT '[]'::jsonb, -- Detailed sharing permissions
    parent_folders JSONB DEFAULT '[]'::jsonb, -- Parent folder information
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    is_flagged BOOLEAN DEFAULT FALSE,
    analysis JSONB, -- Risk analysis for file sharing
    drive_link VARCHAR(500), -- Direct link to file in Drive
    raw_data JSONB, -- Full raw file data from Drive API
    updated_at TIMESTAMP DEFAULT NOW(),
    imported_at TIMESTAMP DEFAULT NOW()
);

-- Google Workspace configuration table
CREATE TABLE IF NOT EXISTS google_workspace_config (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL, -- Organization domain
    service_account_email VARCHAR(255), -- Service account email
    delegated_admin_email VARCHAR(255), -- Admin email for delegation
    is_active BOOLEAN DEFAULT FALSE,
    gmail_sync_enabled BOOLEAN DEFAULT TRUE,
    drive_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_hours INTEGER DEFAULT 24,
    max_messages_per_user INTEGER DEFAULT 100,
    days_back_to_sync INTEGER DEFAULT 7,
    auto_analyze_emails BOOLEAN DEFAULT TRUE,
    auto_analyze_files BOOLEAN DEFAULT TRUE,
    last_gmail_sync_at TIMESTAMP,
    last_drive_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'running', 'pending'
    last_sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Workspace sync jobs table
CREATE TABLE IF NOT EXISTS google_workspace_sync_jobs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'gmail', 'drive', 'both'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    parameters JSONB, -- Sync parameters
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    started_by INTEGER REFERENCES users(id),
    total_users INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    processed_messages INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    flagged_messages INTEGER DEFAULT 0,
    flagged_files INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Google Workspace users cache table
CREATE TABLE IF NOT EXISTS google_workspace_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Google user ID
    email VARCHAR(255) UNIQUE NOT NULL, -- User email address
    name VARCHAR(255), -- User full name
    given_name VARCHAR(255), -- First name
    family_name VARCHAR(255), -- Last name
    is_admin BOOLEAN DEFAULT FALSE, -- Whether user is admin
    is_suspended BOOLEAN DEFAULT FALSE, -- Whether user is suspended
    organizational_unit VARCHAR(500), -- Organizational unit path
    last_login_time TIMESTAMP, -- Last login timestamp
    is_active BOOLEAN DEFAULT TRUE,
    last_email_count INTEGER DEFAULT 0, -- Count from last sync
    last_flagged_email_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    imported_at TIMESTAMP DEFAULT NOW()
);

-- Gmail violations table - specific policy violations found in Gmail
CREATE TABLE IF NOT EXISTS gmail_violations (
    id SERIAL PRIMARY KEY,
    gmail_message_id INTEGER REFERENCES gmail_messages(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL, -- Gmail message ID
    user_email VARCHAR(255) NOT NULL, -- User email
    violation_type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved', 'False Positive')),
    confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    evidence TEXT[], -- Evidence that triggered this violation
    ai_analysis JSONB, -- AI analysis that led to this violation
    email_context JSONB, -- Email context (subject, sender, etc.)
    assigned_to INTEGER REFERENCES users(id), -- Who is investigating
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Drive violations table - violations in file sharing
CREATE TABLE IF NOT EXISTS drive_violations (
    id SERIAL PRIMARY KEY,
    drive_file_id INTEGER REFERENCES google_drive_files(id) ON DELETE CASCADE,
    file_id VARCHAR(255) NOT NULL, -- Google Drive file ID
    owner_email VARCHAR(255) NOT NULL, -- File owner
    violation_type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved', 'False Positive')),
    confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    evidence TEXT[], -- Evidence (sharing settings, file type, etc.)
    ai_analysis JSONB, -- AI analysis results
    file_context JSONB, -- File context (name, type, sharing, etc.)
    assigned_to INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_email ON gmail_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_from_email ON gmail_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_sent_at ON gmail_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_risk_score ON gmail_messages(risk_score);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_is_flagged ON gmail_messages(is_flagged);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_category ON gmail_messages(category);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread_id ON gmail_messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_google_drive_files_owner_email ON google_drive_files(owner_email);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_shared_publicly ON google_drive_files(shared_publicly);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_risk_score ON google_drive_files(risk_score);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_is_flagged ON google_drive_files(is_flagged);
CREATE INDEX IF NOT EXISTS idx_google_drive_files_modified_at ON google_drive_files(modified_at_drive);

CREATE INDEX IF NOT EXISTS idx_google_workspace_users_email ON google_workspace_users(email);
CREATE INDEX IF NOT EXISTS idx_google_workspace_users_is_active ON google_workspace_users(is_active);
CREATE INDEX IF NOT EXISTS idx_google_workspace_users_is_admin ON google_workspace_users(is_admin);

CREATE INDEX IF NOT EXISTS idx_gmail_violations_user_email ON gmail_violations(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_violations_status ON gmail_violations(status);
CREATE INDEX IF NOT EXISTS idx_gmail_violations_severity ON gmail_violations(severity);
CREATE INDEX IF NOT EXISTS idx_gmail_violations_created_at ON gmail_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_drive_violations_owner_email ON drive_violations(owner_email);
CREATE INDEX IF NOT EXISTS idx_drive_violations_status ON drive_violations(status);
CREATE INDEX IF NOT EXISTS idx_drive_violations_severity ON drive_violations(severity);
CREATE INDEX IF NOT EXISTS idx_drive_violations_created_at ON drive_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_google_workspace_sync_jobs_status ON google_workspace_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_google_workspace_sync_jobs_sync_type ON google_workspace_sync_jobs(sync_type);
CREATE INDEX IF NOT EXISTS idx_google_workspace_sync_jobs_started_at ON google_workspace_sync_jobs(started_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_workspace_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_gmail_messages_updated_at ON gmail_messages;
CREATE TRIGGER update_gmail_messages_updated_at 
    BEFORE UPDATE ON gmail_messages 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

DROP TRIGGER IF EXISTS update_google_drive_files_updated_at ON google_drive_files;
CREATE TRIGGER update_google_drive_files_updated_at 
    BEFORE UPDATE ON google_drive_files 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

DROP TRIGGER IF EXISTS update_google_workspace_config_updated_at ON google_workspace_config;
CREATE TRIGGER update_google_workspace_config_updated_at 
    BEFORE UPDATE ON google_workspace_config 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

DROP TRIGGER IF EXISTS update_google_workspace_users_updated_at ON google_workspace_users;
CREATE TRIGGER update_google_workspace_users_updated_at 
    BEFORE UPDATE ON google_workspace_users 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

DROP TRIGGER IF EXISTS update_gmail_violations_updated_at ON gmail_violations;
CREATE TRIGGER update_gmail_violations_updated_at 
    BEFORE UPDATE ON gmail_violations 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

DROP TRIGGER IF EXISTS update_drive_violations_updated_at ON drive_violations;
CREATE TRIGGER update_drive_violations_updated_at 
    BEFORE UPDATE ON drive_violations 
    FOR EACH ROW EXECUTE FUNCTION update_google_workspace_updated_at_column();

-- Insert default Google Workspace configuration
INSERT INTO google_workspace_config (domain, is_active, gmail_sync_enabled, drive_sync_enabled) 
VALUES ('example.com', FALSE, TRUE, TRUE) 
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE gmail_messages IS 'Stores Gmail messages with AI risk analysis';
COMMENT ON TABLE google_drive_files IS 'Stores Google Drive files and sharing permissions for security monitoring';
COMMENT ON TABLE google_workspace_config IS 'Configuration settings for Google Workspace integration';
COMMENT ON TABLE google_workspace_sync_jobs IS 'Tracks Google Workspace synchronization job status and progress';
COMMENT ON TABLE google_workspace_users IS 'Cache of Google Workspace users for performance and reporting';
COMMENT ON TABLE gmail_violations IS 'Policy violations detected in Gmail communications';
COMMENT ON TABLE drive_violations IS 'Policy violations detected in Google Drive file sharing';

COMMENT ON COLUMN gmail_messages.message_id IS 'Unique Gmail message identifier';
COMMENT ON COLUMN gmail_messages.risk_score IS 'AI-calculated risk score (0-100)';
COMMENT ON COLUMN gmail_messages.is_flagged IS 'Whether message was flagged for review';
COMMENT ON COLUMN gmail_messages.analysis IS 'Detailed AI analysis results in JSON format';

COMMENT ON COLUMN google_drive_files.shared_publicly IS 'Whether file is accessible by anyone with the link';
COMMENT ON COLUMN google_drive_files.sharing_permissions IS 'Detailed sharing permissions in JSON format';
COMMENT ON COLUMN google_drive_files.risk_score IS 'AI-calculated file sharing risk score (0-100)'; 