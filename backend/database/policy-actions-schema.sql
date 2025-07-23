-- ==================================================
-- POLICY ACTIONS SUPPORT SCHEMA
-- Missing tables and columns for full policy action functionality
-- ==================================================

-- Add role column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';

-- Update existing users with default roles
UPDATE users SET role = 'admin' WHERE email LIKE '%admin%' OR email LIKE '%security%';
UPDATE users SET role = 'manager' WHERE role IS NULL AND id IN (
  SELECT DISTINCT created_by FROM security_policies WHERE created_by IS NOT NULL
);
UPDATE users SET role = 'employee' WHERE role IS NULL;

-- ==================================================
-- INCIDENTS MANAGEMENT
-- ==================================================

-- Main incidents table for escalation tracking
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Investigating', 'Resolved', 'Closed')),
  priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  
  -- Source information
  source_type VARCHAR(50), -- 'policy_action', 'manual', 'automated'
  source_id INTEGER, -- policy_execution_id, violation_id, etc.
  
  -- People involved
  assigned_to INTEGER REFERENCES users(id),
  reported_by INTEGER REFERENCES users(id),
  employee_id INTEGER REFERENCES employees(id), -- Employee involved in incident
  
  -- Escalation tracking
  escalation_level VARCHAR(20) DEFAULT 'normal' CHECK (escalation_level IN ('normal', 'high', 'immediate', 'critical')),
  escalated_at TIMESTAMP,
  escalated_to INTEGER REFERENCES users(id),
  
  -- Resolution tracking
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[], -- For categorization
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Incident updates/comments
CREATE TABLE IF NOT EXISTS incident_updates (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  update_type VARCHAR(50) NOT NULL, -- 'comment', 'status_change', 'assignment', 'escalation'
  message TEXT,
  old_value TEXT,
  new_value TEXT,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- EMPLOYEE MONITORING SETTINGS
-- ==================================================

-- Employee monitoring configuration
CREATE TABLE IF NOT EXISTS employee_monitoring_settings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Monitoring levels
  monitoring_level VARCHAR(20) DEFAULT 'normal' CHECK (monitoring_level IN ('minimal', 'normal', 'high', 'maximum')),
  
  -- Monitoring types
  email_monitoring BOOLEAN DEFAULT true,
  file_monitoring BOOLEAN DEFAULT false,
  network_monitoring BOOLEAN DEFAULT false,
  application_monitoring BOOLEAN DEFAULT false,
  screen_monitoring BOOLEAN DEFAULT false,
  
  -- Duration and scheduling
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP, -- NULL = indefinite
  duration_hours INTEGER,
  
  -- Triggering information
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  triggered_by_user_id INTEGER REFERENCES users(id),
  trigger_reason TEXT,
  
  -- Settings
  alert_threshold INTEGER DEFAULT 70, -- Risk score threshold for alerts
  sample_rate DECIMAL(3,2) DEFAULT 0.10, -- 10% sampling by default
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- EMPLOYEE LOGGING SETTINGS
-- ==================================================

-- Detailed activity logging configuration
CREATE TABLE IF NOT EXISTS employee_logging_settings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Logging types
  include_emails BOOLEAN DEFAULT true,
  include_files BOOLEAN DEFAULT false,
  include_network BOOLEAN DEFAULT false,
  include_applications BOOLEAN DEFAULT false,
  include_system_events BOOLEAN DEFAULT false,
  include_user_actions BOOLEAN DEFAULT true,
  
  -- Retention and storage
  retention_days INTEGER DEFAULT 90,
  storage_location VARCHAR(255) DEFAULT 'database',
  encryption_enabled BOOLEAN DEFAULT true,
  
  -- Duration
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP, -- NULL = indefinite
  duration_hours INTEGER,
  
  -- Triggering information
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  triggered_by_user_id INTEGER REFERENCES users(id),
  trigger_reason TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Settings
  log_level VARCHAR(20) DEFAULT 'detailed' CHECK (log_level IN ('minimal', 'standard', 'detailed', 'comprehensive')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- SYSTEM NOTIFICATIONS
-- ==================================================

-- System-wide notifications
CREATE TABLE IF NOT EXISTS system_notifications (
  id SERIAL PRIMARY KEY,
  
  -- Targeting
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('user', 'role', 'all')),
  recipient_id VARCHAR(255), -- user_id, role name, or NULL for all
  recipient_role VARCHAR(50), -- 'admin', 'security_admin', 'manager', etc.
  
  -- Notification content
  notification_type VARCHAR(50) NOT NULL, -- 'security_alert', 'policy_violation', 'system_update', etc.
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Additional data
  action_url TEXT, -- URL for action button
  action_text VARCHAR(100), -- Text for action button
  metadata JSONB DEFAULT '{}',
  
  -- Status tracking
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  
  -- Source tracking
  source_type VARCHAR(50), -- 'policy_action', 'manual', 'system'
  source_id INTEGER, -- Reference to source record
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

-- ==================================================
-- ACTIVITY LOGS
-- ==================================================

-- Comprehensive activity logging
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who and what
  employee_id INTEGER REFERENCES employees(id),
  user_id INTEGER REFERENCES users(id), -- For admin actions
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'file_access', 'email_sent', 'policy_triggered', etc.
  activity_category VARCHAR(50), -- 'security', 'compliance', 'system', 'user_action'
  
  -- Activity details
  description TEXT NOT NULL,
  entity_type VARCHAR(50), -- 'file', 'email', 'application', 'system'
  entity_id VARCHAR(255), -- ID of the entity involved
  entity_name VARCHAR(255), -- Name/path of the entity
  
  -- Risk assessment
  risk_score INTEGER DEFAULT 0,
  risk_factors TEXT[],
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  location_info JSONB,
  
  -- Source information
  source VARCHAR(50) NOT NULL, -- 'policy_action', 'integration', 'manual', 'system'
  source_details JSONB DEFAULT '{}',
  
  -- Policy context
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  policy_execution_id INTEGER REFERENCES policy_executions(id),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Timestamps
  occurred_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- ACCESS CONTROL TABLES
-- ==================================================

-- Employee access restrictions (for disable_access action)
CREATE TABLE IF NOT EXISTS employee_access_restrictions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Restriction details
  restriction_type VARCHAR(50) NOT NULL, -- 'all', 'email', 'teams', 'files', 'applications'
  restriction_level VARCHAR(20) DEFAULT 'full' CHECK (restriction_level IN ('partial', 'full', 'temporary')),
  
  -- Reason and context
  reason TEXT NOT NULL,
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  applied_by_user_id INTEGER REFERENCES users(id),
  
  -- Duration
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP, -- NULL = manual removal required
  duration_hours INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  was_automatically_applied BOOLEAN DEFAULT true,
  
  -- Override capabilities
  can_be_overridden BOOLEAN DEFAULT false,
  override_requires_approval BOOLEAN DEFAULT true,
  approved_by_user_id INTEGER REFERENCES users(id),
  override_reason TEXT,
  overridden_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP
);

-- User sessions tracking (for access control)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  user_id INTEGER REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  
  -- Session details
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_revoked BOOLEAN DEFAULT false,
  revocation_reason TEXT,
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- ==================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================

-- Incidents indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_employee ON incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_escalation ON incidents(escalation_level, escalated_at);

-- Monitoring settings indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_employee_active ON employee_monitoring_settings(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_end_time ON employee_monitoring_settings(end_time) WHERE end_time IS NOT NULL;

-- Logging settings indexes
CREATE INDEX IF NOT EXISTS idx_logging_employee_active ON employee_logging_settings(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_logging_end_time ON employee_logging_settings(end_time) WHERE end_time IS NOT NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON system_notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON system_notifications(is_read, created_at) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON system_notifications(priority, created_at);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_employee ON activity_logs(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_risk ON activity_logs(risk_score) WHERE risk_score > 50;
CREATE INDEX IF NOT EXISTS idx_activity_policy ON activity_logs(triggered_by_policy_id);

-- Access restrictions indexes
CREATE INDEX IF NOT EXISTS idx_access_restrictions_employee ON employee_access_restrictions(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_access_restrictions_end_time ON employee_access_restrictions(end_time) WHERE end_time IS NOT NULL;

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(employee_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- ==================================================
-- FUNCTIONS FOR AUTOMATIC CLEANUP
-- ==================================================

-- Function to automatically expire monitoring settings
CREATE OR REPLACE FUNCTION cleanup_expired_monitoring()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE employee_monitoring_settings 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true 
  AND end_time IS NOT NULL 
  AND end_time <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire logging settings
CREATE OR REPLACE FUNCTION cleanup_expired_logging()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE employee_logging_settings 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true 
  AND end_time IS NOT NULL 
  AND end_time <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire access restrictions
CREATE OR REPLACE FUNCTION cleanup_expired_restrictions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE employee_access_restrictions 
  SET is_active = false, removed_at = NOW(), updated_at = NOW()
  WHERE is_active = true 
  AND end_time IS NOT NULL 
  AND end_time <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
DROP TRIGGER IF EXISTS incidents_update_timestamp ON incidents;
CREATE TRIGGER incidents_update_timestamp
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS monitoring_settings_update_timestamp ON employee_monitoring_settings;
CREATE TRIGGER monitoring_settings_update_timestamp
  BEFORE UPDATE ON employee_monitoring_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS logging_settings_update_timestamp ON employee_logging_settings;
CREATE TRIGGER logging_settings_update_timestamp
  BEFORE UPDATE ON employee_logging_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS access_restrictions_update_timestamp ON employee_access_restrictions;
CREATE TRIGGER access_restrictions_update_timestamp
  BEFORE UPDATE ON employee_access_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Generate incident numbers automatically
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number = 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('incidents_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidents_generate_number ON incidents;
CREATE TRIGGER incidents_generate_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION generate_incident_number();

-- ==================================================
-- SAMPLE DATA FOR TESTING
-- ==================================================

-- Sample incident types
INSERT INTO incidents (title, description, severity, status, source_type, employee_id, escalation_level) VALUES
('Test Security Incident', 'Sample incident for testing policy actions', 'Medium', 'Open', 'policy_action', 
 (SELECT id FROM employees LIMIT 1), 'normal')
ON CONFLICT DO NOTHING;

-- Update existing users with proper roles if not set
UPDATE users SET role = 'security_admin' WHERE email LIKE '%security%' AND role = 'admin';
UPDATE users SET role = 'system_admin' WHERE email LIKE '%admin%' AND role = 'admin';

COMMIT; 