-- Slack Integration Database Schema
-- Stores Slack workspace data, channels, messages, and configuration

-- ========================================
-- CONFIGURATION TABLES
-- ========================================

-- Slack workspace configuration
CREATE TABLE IF NOT EXISTS slack_config (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(255), -- Slack App ID
    client_id VARCHAR(255), -- Slack Client ID
    client_secret VARCHAR(255), -- Encrypted client secret
    signing_secret VARCHAR(255), -- Request signing secret
    bot_token VARCHAR(255), -- Bot User OAuth Token
    user_token VARCHAR(255), -- User OAuth Token (optional)
    workspace_id VARCHAR(255), -- Slack workspace/team ID
    workspace_name VARCHAR(255), -- Human-readable workspace name
    workspace_url VARCHAR(255), -- Workspace URL
    bot_user_id VARCHAR(255), -- Bot user ID
    is_active BOOLEAN DEFAULT FALSE,
    
    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_hours INTEGER DEFAULT 24,
    max_messages_per_channel INTEGER DEFAULT 200,
    days_back_to_sync INTEGER DEFAULT 7,
    sync_private_channels BOOLEAN DEFAULT FALSE,
    auto_analyze_messages BOOLEAN DEFAULT TRUE,
    
    -- Sync status
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'running', 'pending'
    last_sync_error TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- SYNC TRACKING TABLES
-- ========================================

-- Slack sync jobs table - tracks synchronization jobs
CREATE TABLE IF NOT EXISTS slack_sync_jobs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'messages', -- 'users', 'channels', 'messages', 'all'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    parameters JSONB, -- Sync parameters (daysBack, maxMessages, channels, etc.)
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    started_by INTEGER REFERENCES users(id),
    
    -- Progress tracking
    total_channels INTEGER DEFAULT 0,
    processed_channels INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    processed_messages INTEGER DEFAULT 0,
    flagged_messages INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    processed_users INTEGER DEFAULT 0,
    
    -- Results
    results JSONB DEFAULT '{}', -- Detailed sync results
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- WORKSPACE DATA TABLES
-- ========================================

-- Slack channels cache table - stores channel information
CREATE TABLE IF NOT EXISTS slack_channels (
    id SERIAL PRIMARY KEY,
    channel_id VARCHAR(255) UNIQUE NOT NULL, -- Slack channel ID (C1234567890)
    channel_name VARCHAR(255) NOT NULL, -- Channel name without #
    channel_topic TEXT, -- Channel topic/description
    channel_purpose TEXT, -- Channel purpose
    is_private BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_general BOOLEAN DEFAULT FALSE, -- #general channel
    is_member BOOLEAN DEFAULT FALSE, -- Bot is member of this channel
    
    -- Channel metadata
    created_at_slack TIMESTAMP, -- When channel was created in Slack
    creator_user_id VARCHAR(255), -- Slack user ID of creator
    member_count INTEGER DEFAULT 0,
    
    -- Sync tracking
    last_synced_at TIMESTAMP,
    last_message_ts VARCHAR(50), -- Timestamp of last synced message
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'synced', 'error', 'pending'
    sync_error TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Slack users cache table - stores user information
CREATE TABLE IF NOT EXISTS slack_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL, -- Slack user ID (U1234567890)
    username VARCHAR(255), -- Slack username
    display_name VARCHAR(255), -- User's display name
    real_name VARCHAR(255), -- User's real name
    email VARCHAR(255), -- User's email (if available)
    phone VARCHAR(255), -- User's phone (if available)
    title VARCHAR(255), -- Job title
    department VARCHAR(255), -- Department
    
    -- Profile information
    profile_image_url TEXT, -- Profile image URL
    timezone VARCHAR(100), -- User's timezone
    status_text VARCHAR(255), -- Current status text
    status_emoji VARCHAR(50), -- Current status emoji
    
    -- User flags
    is_admin BOOLEAN DEFAULT FALSE,
    is_owner BOOLEAN DEFAULT FALSE,
    is_primary_owner BOOLEAN DEFAULT FALSE,
    is_restricted BOOLEAN DEFAULT FALSE,
    is_ultra_restricted BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    is_app_user BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Employee linking
    employee_id INTEGER REFERENCES employees(id), -- Link to employees table
    
    -- Sync tracking
    last_synced_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- MESSAGES AND COMMUNICATIONS
-- ========================================

-- Slack messages table - stores all Slack messages with AI analysis
CREATE TABLE IF NOT EXISTS slack_messages (
    id SERIAL PRIMARY KEY,
    
    -- Message identification
    message_ts VARCHAR(50) UNIQUE NOT NULL, -- Slack message timestamp (unique ID)
    channel_id VARCHAR(255) NOT NULL, -- Slack channel ID
    channel_name VARCHAR(255) NOT NULL, -- Channel name for quick reference
    
    -- Sender information
    sender_employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    sender_email VARCHAR(255), -- Sender's email
    sender_name VARCHAR(255), -- Sender's name
    sender_user_id VARCHAR(255), -- Slack user ID of sender
    
    -- Message content
    message_text TEXT, -- Message text content
    message_type VARCHAR(50) DEFAULT 'message', -- 'message', 'file_comment', 'thread_broadcast'
    subtype VARCHAR(50), -- Message subtype (if any)
    
    -- Message metadata
    mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
    attachments JSONB DEFAULT '[]', -- File attachments metadata
    reactions JSONB DEFAULT '[]', -- Message reactions
    edited_at TIMESTAMP, -- When message was last edited
    
    -- Threading
    thread_ts VARCHAR(50), -- Thread timestamp (if in thread)
    is_thread_reply BOOLEAN DEFAULT FALSE,
    reply_count INTEGER DEFAULT 0,
    
    -- Channel context
    is_private_channel BOOLEAN DEFAULT FALSE,
    
    -- AI Risk Analysis
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags JSONB DEFAULT '{}', -- AI analysis results and risk factors
    
    -- Classification
    category VARCHAR(50) DEFAULT 'internal', -- 'internal', 'private_channel', 'suspicious', 'policy_violation'
    is_flagged BOOLEAN DEFAULT FALSE,
    is_analyzed BOOLEAN DEFAULT FALSE,
    
    -- Analysis metadata
    analyzed_at TIMESTAMP,
    analyzer_version VARCHAR(50),
    
    -- Timestamps
    sent_at TIMESTAMP NOT NULL, -- When message was sent
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- VIOLATIONS AND INCIDENTS
-- ========================================

-- Slack-specific violations detected in messages
CREATE TABLE IF NOT EXISTS slack_violations (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES slack_messages(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    
    -- Context
    channel_name VARCHAR(255),
    message_context TEXT, -- Relevant message content
    risk_factors JSONB DEFAULT '[]', -- Specific risk factors that triggered this violation
    
    -- Status
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved', 'False Positive')),
    resolution_notes TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    
    -- Compliance
    compliance_category VARCHAR(50),
    regulatory_impact JSONB DEFAULT '{}',
    requires_notification BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_slack_messages_channel ON slack_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_sender ON slack_messages(sender_employee_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_timestamp ON slack_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_slack_messages_risk_score ON slack_messages(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_slack_messages_flagged ON slack_messages(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_slack_messages_thread ON slack_messages(thread_ts) WHERE thread_ts IS NOT NULL;

-- Channel indexes
CREATE INDEX IF NOT EXISTS idx_slack_channels_name ON slack_channels(channel_name);
CREATE INDEX IF NOT EXISTS idx_slack_channels_private ON slack_channels(is_private);
CREATE INDEX IF NOT EXISTS idx_slack_channels_member ON slack_channels(is_member) WHERE is_member = true;

-- User indexes
CREATE INDEX IF NOT EXISTS idx_slack_users_email ON slack_users(email);
CREATE INDEX IF NOT EXISTS idx_slack_users_employee ON slack_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_slack_users_active ON slack_users(is_deleted) WHERE is_deleted = false;

-- Violation indexes
CREATE INDEX IF NOT EXISTS idx_slack_violations_employee ON slack_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_slack_violations_severity ON slack_violations(severity);
CREATE INDEX IF NOT EXISTS idx_slack_violations_status ON slack_violations(status);
CREATE INDEX IF NOT EXISTS idx_slack_violations_created ON slack_violations(created_at);

-- Sync job indexes
CREATE INDEX IF NOT EXISTS idx_slack_sync_jobs_status ON slack_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_slack_sync_jobs_type ON slack_sync_jobs(sync_type);
CREATE INDEX IF NOT EXISTS idx_slack_sync_jobs_created ON slack_sync_jobs(created_at);

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slack_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_slack_config_updated_at ON slack_config;
CREATE TRIGGER update_slack_config_updated_at 
    BEFORE UPDATE ON slack_config 
    FOR EACH ROW EXECUTE FUNCTION update_slack_updated_at_column();

DROP TRIGGER IF EXISTS update_slack_channels_updated_at ON slack_channels;
CREATE TRIGGER update_slack_channels_updated_at 
    BEFORE UPDATE ON slack_channels 
    FOR EACH ROW EXECUTE FUNCTION update_slack_updated_at_column();

DROP TRIGGER IF EXISTS update_slack_users_updated_at ON slack_users;
CREATE TRIGGER update_slack_users_updated_at 
    BEFORE UPDATE ON slack_users 
    FOR EACH ROW EXECUTE FUNCTION update_slack_updated_at_column();

DROP TRIGGER IF EXISTS update_slack_messages_updated_at ON slack_messages;
CREATE TRIGGER update_slack_messages_updated_at 
    BEFORE UPDATE ON slack_messages 
    FOR EACH ROW EXECUTE FUNCTION update_slack_updated_at_column();

DROP TRIGGER IF EXISTS update_slack_violations_updated_at ON slack_violations;
CREATE TRIGGER update_slack_violations_updated_at 
    BEFORE UPDATE ON slack_violations 
    FOR EACH ROW EXECUTE FUNCTION update_slack_updated_at_column();

-- ========================================
-- DEFAULT DATA
-- ========================================

-- Insert default Slack configuration
INSERT INTO slack_config (workspace_id, is_active, sync_enabled) 
VALUES ('default', FALSE, TRUE) 
ON CONFLICT DO NOTHING;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE slack_messages IS 'Stores Slack messages with AI risk analysis and compliance tracking';
COMMENT ON TABLE slack_config IS 'Configuration settings for Slack workspace integration';
COMMENT ON TABLE slack_sync_jobs IS 'Tracks Slack synchronization job status and progress';
COMMENT ON TABLE slack_channels IS 'Cache of Slack channel information for performance';
COMMENT ON TABLE slack_users IS 'Cache of Slack user information with employee linking';
COMMENT ON TABLE slack_violations IS 'Policy violations detected in Slack communications';

COMMENT ON COLUMN slack_messages.message_ts IS 'Unique Slack message timestamp identifier';
COMMENT ON COLUMN slack_messages.risk_score IS 'AI-calculated risk score (0-100)';
COMMENT ON COLUMN slack_messages.is_flagged IS 'Whether message was flagged for review';
COMMENT ON COLUMN slack_messages.risk_flags IS 'Detailed AI analysis results in JSON format';
COMMENT ON COLUMN slack_messages.attachments IS 'Message attachments metadata in JSON format';
COMMENT ON COLUMN slack_messages.mentions IS 'User mentions in message in JSON format';
COMMENT ON COLUMN slack_messages.thread_ts IS 'Thread timestamp for threaded conversations';
COMMENT ON COLUMN slack_config.bot_token IS 'Slack Bot User OAuth Token for API access';
COMMENT ON COLUMN slack_config.sync_private_channels IS 'Whether to sync private channels (requires user token)';
COMMENT ON COLUMN slack_users.employee_id IS 'Reference to employees table for linking Slack users to company employees'; 