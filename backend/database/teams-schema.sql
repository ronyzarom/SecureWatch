-- Microsoft Teams Integration Schema
-- This schema supports storing Teams messages, channels, and team data for security analysis

-- Teams messages table - stores individual Teams messages with risk analysis
CREATE TABLE IF NOT EXISTS teams_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL, -- Microsoft Graph message ID
    team_id VARCHAR(255) NOT NULL, -- Microsoft Graph team ID
    team_name VARCHAR(500) NOT NULL,
    channel_id VARCHAR(255) NOT NULL, -- Microsoft Graph channel ID
    channel_name VARCHAR(500) NOT NULL,
    from_user_name VARCHAR(255) NOT NULL,
    from_user_email VARCHAR(255) NOT NULL,
    subject VARCHAR(1000), -- Teams messages may not have subjects
    body TEXT, -- Message content
    body_type VARCHAR(50) DEFAULT 'text', -- 'text' or 'html'
    created_at TIMESTAMP NOT NULL, -- When message was created in Teams
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    category VARCHAR(100), -- Risk category determined by AI
    is_flagged BOOLEAN DEFAULT FALSE,
    analysis JSONB, -- Detailed risk analysis from AI
    attachments JSONB DEFAULT '[]'::jsonb, -- Message attachments
    mentions JSONB DEFAULT '[]'::jsonb, -- User mentions in message
    raw_data JSONB, -- Full raw message data from Microsoft Graph
    updated_at TIMESTAMP DEFAULT NOW(),
    imported_at TIMESTAMP DEFAULT NOW()
);

-- Teams configuration table - stores Teams-specific settings
CREATE TABLE IF NOT EXISTS teams_config (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_hours INTEGER DEFAULT 24, -- How often to sync (hours)
    max_messages_per_channel INTEGER DEFAULT 100,
    days_back_to_sync INTEGER DEFAULT 7,
    auto_analyze_messages BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'running', 'pending'
    last_sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams sync jobs table - tracks synchronization jobs
CREATE TABLE IF NOT EXISTS teams_sync_jobs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    parameters JSONB, -- Sync parameters (daysBack, maxMessages, etc.)
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    started_by INTEGER REFERENCES users(id),
    total_teams INTEGER DEFAULT 0,
    total_channels INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    processed_messages INTEGER DEFAULT 0,
    flagged_messages INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams channels cache table - stores team and channel information
CREATE TABLE IF NOT EXISTS teams_channels (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255) NOT NULL,
    team_name VARCHAR(500) NOT NULL,
    team_description TEXT,
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(500) NOT NULL,
    channel_description TEXT,
    channel_type VARCHAR(50), -- 'standard', 'private', etc.
    created_at_teams TIMESTAMP, -- When created in Teams
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP, -- Last message timestamp
    message_count INTEGER DEFAULT 0,
    flagged_message_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    imported_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, channel_id)
);

-- Teams violations table - specific policy violations found in Teams
CREATE TABLE IF NOT EXISTS teams_violations (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES teams_messages(id) ON DELETE CASCADE,
    teams_message_id VARCHAR(255) NOT NULL, -- Microsoft Graph message ID
    violation_type VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Resolved', 'False Positive')),
    confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    evidence TEXT[], -- Evidence that triggered this violation
    ai_analysis JSONB, -- AI analysis that led to this violation
    team_context JSONB, -- Team and channel context
    assigned_to INTEGER REFERENCES users(id), -- Who is investigating
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_messages_team_id ON teams_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_channel_id ON teams_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_from_user ON teams_messages(from_user_email);
CREATE INDEX IF NOT EXISTS idx_teams_messages_created_at ON teams_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_teams_messages_risk_score ON teams_messages(risk_score);
CREATE INDEX IF NOT EXISTS idx_teams_messages_is_flagged ON teams_messages(is_flagged);
CREATE INDEX IF NOT EXISTS idx_teams_messages_category ON teams_messages(category);

CREATE INDEX IF NOT EXISTS idx_teams_channels_team_id ON teams_channels(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_channels_channel_id ON teams_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_teams_channels_is_active ON teams_channels(is_active);

CREATE INDEX IF NOT EXISTS idx_teams_violations_message_id ON teams_violations(message_id);
CREATE INDEX IF NOT EXISTS idx_teams_violations_status ON teams_violations(status);
CREATE INDEX IF NOT EXISTS idx_teams_violations_severity ON teams_violations(severity);
CREATE INDEX IF NOT EXISTS idx_teams_violations_created_at ON teams_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_teams_sync_jobs_status ON teams_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_teams_sync_jobs_started_at ON teams_sync_jobs(started_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_teams_messages_updated_at ON teams_messages;
CREATE TRIGGER update_teams_messages_updated_at 
    BEFORE UPDATE ON teams_messages 
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_config_updated_at ON teams_config;
CREATE TRIGGER update_teams_config_updated_at 
    BEFORE UPDATE ON teams_config 
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_channels_updated_at ON teams_channels;
CREATE TRIGGER update_teams_channels_updated_at 
    BEFORE UPDATE ON teams_channels 
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_violations_updated_at ON teams_violations;
CREATE TRIGGER update_teams_violations_updated_at 
    BEFORE UPDATE ON teams_violations 
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at_column();

-- Insert default Teams configuration
INSERT INTO teams_config (tenant_id, is_active, sync_enabled) 
VALUES ('default', FALSE, TRUE) 
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE teams_messages IS 'Stores Microsoft Teams messages with AI risk analysis';
COMMENT ON TABLE teams_config IS 'Configuration settings for Microsoft Teams integration';
COMMENT ON TABLE teams_sync_jobs IS 'Tracks Teams synchronization job status and progress';
COMMENT ON TABLE teams_channels IS 'Cache of Teams and channel information for performance';
COMMENT ON TABLE teams_violations IS 'Policy violations detected in Teams communications';

COMMENT ON COLUMN teams_messages.message_id IS 'Unique Microsoft Graph message identifier';
COMMENT ON COLUMN teams_messages.risk_score IS 'AI-calculated risk score (0-100)';
COMMENT ON COLUMN teams_messages.is_flagged IS 'Whether message was flagged for review';
COMMENT ON COLUMN teams_messages.analysis IS 'Detailed AI analysis results in JSON format';
COMMENT ON COLUMN teams_messages.attachments IS 'Message attachments metadata in JSON format';
COMMENT ON COLUMN teams_messages.mentions IS 'User mentions in message in JSON format'; 