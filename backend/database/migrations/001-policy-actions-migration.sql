-- ==================================================
-- MIGRATION 001: Policy Actions Enhancement
-- Version: 1.1.0
-- Date: 2025-07-23
-- Description: Adds comprehensive policy action execution system
-- ==================================================

-- This migration adds the missing tables and columns needed for
-- full policy action execution in production environments

BEGIN;

-- ==================================================
-- 1. ENHANCE USERS TABLE
-- ==================================================

-- Expand role constraint to support new role types
DO $$
BEGIN
  -- Drop existing role constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
  
  -- Add expanded role constraint
  ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role::text = ANY (ARRAY[
      'admin'::character varying,
      'analyst'::character varying, 
      'viewer'::character varying,
      'security_admin'::character varying,
      'system_admin'::character varying,
      'manager'::character varying,
      'employee'::character varying
    ]::text[]));
END $$;

-- ==================================================
-- 2. INCIDENTS MANAGEMENT SYSTEM
-- ==================================================

CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_number VARCHAR(50) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Investigating', 'Resolved', 'Closed')),
  priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  
  -- Source and tracking
  source_type VARCHAR(50), -- 'policy_action', 'manual', 'automated'
  source_id INTEGER,
  policy_id INTEGER REFERENCES security_policies(id),
  violation_id INTEGER REFERENCES violations(id),
  
  -- Assignment and escalation
  assigned_to INTEGER REFERENCES users(id),
  reported_by INTEGER REFERENCES users(id),
  employee_id INTEGER REFERENCES employees(id),
  escalation_level VARCHAR(20) DEFAULT 'normal' CHECK (escalation_level IN ('normal', 'high', 'immediate', 'critical')),
  escalated_at TIMESTAMP,
  escalated_to INTEGER REFERENCES users(id),
  
  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  update_type VARCHAR(50) NOT NULL,
  message TEXT,
  old_value TEXT,
  new_value TEXT,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 3. EMPLOYEE MONITORING SYSTEM
-- ==================================================

CREATE TABLE IF NOT EXISTS employee_monitoring_settings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Monitoring configuration
  monitoring_level VARCHAR(20) DEFAULT 'normal' CHECK (monitoring_level IN ('minimal', 'normal', 'high', 'maximum')),
  enabled BOOLEAN DEFAULT true,
  
  -- Monitoring types
  email_monitoring BOOLEAN DEFAULT true,
  file_monitoring BOOLEAN DEFAULT false,
  network_monitoring BOOLEAN DEFAULT false,
  application_monitoring BOOLEAN DEFAULT false,
  screen_monitoring BOOLEAN DEFAULT false,
  
  -- Duration and triggers
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_hours INTEGER,
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  triggered_by_user_id INTEGER REFERENCES users(id),
  trigger_reason TEXT,
  reason TEXT, -- Alias for trigger_reason for compatibility
  
  -- Settings
  alert_threshold INTEGER DEFAULT 70,
  sample_rate DECIMAL(3,2) DEFAULT 0.10,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 4. EMPLOYEE LOGGING SYSTEM
-- ==================================================

CREATE TABLE IF NOT EXISTS employee_logging_settings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Logging configuration
  detailed_logging_enabled BOOLEAN DEFAULT true,
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
  log_level VARCHAR(20) DEFAULT 'detailed' CHECK (log_level IN ('minimal', 'standard', 'detailed', 'comprehensive')),
  
  -- Duration and triggers
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_hours INTEGER,
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  triggered_by_user_id INTEGER REFERENCES users(id),
  trigger_reason TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 5. SYSTEM NOTIFICATIONS
-- ==================================================

CREATE TABLE IF NOT EXISTS system_notifications (
  id SERIAL PRIMARY KEY,
  
  -- Targeting
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('user', 'role', 'all')),
  recipient_id VARCHAR(255),
  recipient_role VARCHAR(50),
  
  -- Content
  notification_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Additional data
  action_url TEXT,
  action_text VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  
  -- Source tracking
  source_type VARCHAR(50),
  source_id INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP
);

-- ==================================================
-- 6. ACTIVITY LOGGING
-- ==================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who and what
  employee_id INTEGER REFERENCES employees(id),
  user_id INTEGER REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  activity_category VARCHAR(50),
  
  -- Activity details
  description TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  
  -- Risk assessment
  risk_score INTEGER DEFAULT 0,
  risk_factors TEXT[],
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  location_info JSONB,
  
  -- Source and policy context
  source VARCHAR(50) NOT NULL,
  source_details JSONB DEFAULT '{}',
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  policy_execution_id INTEGER REFERENCES policy_executions(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Timestamps
  occurred_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 7. ACCESS CONTROL SYSTEM
-- ==================================================

CREATE TABLE IF NOT EXISTS employee_access_restrictions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Restriction details
  restriction_type VARCHAR(50) NOT NULL,
  restriction_level VARCHAR(20) DEFAULT 'full' CHECK (restriction_level IN ('partial', 'full', 'temporary')),
  
  -- Reason and context
  reason TEXT NOT NULL,
  triggered_by_policy_id INTEGER REFERENCES security_policies(id),
  triggered_by_violation_id INTEGER REFERENCES violations(id),
  applied_by_user_id INTEGER REFERENCES users(id),
  created_by VARCHAR(50) DEFAULT 'policy_engine',
  
  -- Duration
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_hours INTEGER,
  
  -- Status and overrides
  is_active BOOLEAN DEFAULT true,
  was_automatically_applied BOOLEAN DEFAULT true,
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
-- 8. PERFORMANCE INDEXES
-- ==================================================

-- Incidents indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_employee ON incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_incidents_policy ON incidents(policy_id);
CREATE INDEX IF NOT EXISTS idx_incidents_violation ON incidents(violation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);

-- Monitoring indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_employee_active ON employee_monitoring_settings(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_policy ON employee_monitoring_settings(triggered_by_policy_id);

-- Logging indexes
CREATE INDEX IF NOT EXISTS idx_logging_employee_active ON employee_logging_settings(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_logging_policy ON employee_logging_settings(triggered_by_policy_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON system_notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON system_notifications(is_read, created_at) WHERE is_read = false;

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_employee ON activity_logs(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_policy ON activity_logs(triggered_by_policy_id);

-- Access restrictions indexes
CREATE INDEX IF NOT EXISTS idx_access_restrictions_employee ON employee_access_restrictions(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_access_restrictions_policy ON employee_access_restrictions(triggered_by_policy_id);

-- ==================================================
-- 9. UTILITY FUNCTIONS
-- ==================================================

-- Function to generate incident numbers
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number = 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup functions for expired settings
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

-- ==================================================
-- 10. TRIGGERS
-- ==================================================

-- Incident number generation
DROP TRIGGER IF EXISTS incidents_generate_number ON incidents;
CREATE TRIGGER incidents_generate_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION generate_incident_number();

-- Update timestamp triggers
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

-- ==================================================
-- 11. DATA MIGRATION (if needed)
-- ==================================================

-- Update existing users with appropriate roles
UPDATE users SET role = 'security_admin' 
WHERE role = 'admin' AND (email LIKE '%security%' OR department LIKE '%Security%');

UPDATE users SET role = 'system_admin' 
WHERE role = 'admin' AND (email LIKE '%admin%' OR email LIKE '%system%');

-- Ensure all users have a role
UPDATE users SET role = 'employee' WHERE role IS NULL;

-- ==================================================
-- 12. VALIDATION
-- ==================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'incidents', 'employee_monitoring_settings', 'employee_logging_settings',
    'system_notifications', 'activity_logs', 'employee_access_restrictions',
    'user_sessions', 'incident_updates'
  );
  
  IF table_count = 8 THEN
    RAISE NOTICE 'SUCCESS: All policy action tables created (% tables)', table_count;
  ELSE
    RAISE EXCEPTION 'FAILED: Only % of 8 expected tables created', table_count;
  END IF;
END $$;

COMMIT;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================
-- Summary: Added comprehensive policy action execution system
-- - Incident management with escalation tracking
-- - Employee monitoring with configurable levels
-- - Detailed activity logging with retention policies
-- - System notifications with targeting
-- - Access control with restrictions and overrides
-- - Performance indexes and utility functions
-- - Automatic cleanup and maintenance procedures
-- ================================================== 