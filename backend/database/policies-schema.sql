-- ==================================================
-- SECURITY POLICY MANAGEMENT SYSTEM
-- Database Schema for Policy Hierarchy & Automation
-- ==================================================

-- Main security policies table with hierarchy support
CREATE TABLE IF NOT EXISTS security_policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  policy_level VARCHAR(20) NOT NULL CHECK (policy_level IN ('global', 'group', 'user')),
  target_id VARCHAR(255), -- NULL for global, department_name for group/department, user_id for user
  target_type VARCHAR(20) CHECK (target_type IN ('department', 'role', 'user') OR target_type IS NULL),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_target_combination CHECK (
    (policy_level = 'global' AND target_id IS NULL AND target_type IS NULL) OR
    (policy_level = 'group' AND target_id IS NOT NULL AND target_type IN ('department', 'role')) OR
    (policy_level = 'user' AND target_id IS NOT NULL AND target_type = 'user')
  )
);

-- Policy conditions - when to trigger the policy
CREATE TABLE IF NOT EXISTS policy_conditions (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
  condition_type VARCHAR(50) NOT NULL, -- 'violation_type', 'risk_score', 'frequency', 'time_based', etc.
  operator VARCHAR(20) NOT NULL, -- 'equals', 'greater_than', 'less_than', 'contains', 'in', etc.
  value TEXT NOT NULL, -- JSON string for complex conditions or simple string
  logical_operator VARCHAR(10) DEFAULT 'AND' CHECK (logical_operator IN ('AND', 'OR')),
  condition_order INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Policy actions - what to do when conditions are met
CREATE TABLE IF NOT EXISTS policy_actions (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES security_policies(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'email_alert', 'disable_access', 'escalate', 'log_incident', etc.
  action_config JSONB DEFAULT '{}', -- Configuration for the action (recipients, settings, etc.)
  execution_order INTEGER DEFAULT 1, -- Order of execution (1 = first)
  delay_minutes INTEGER DEFAULT 0, -- Delay before execution
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Policy execution history - track when policies were triggered
CREATE TABLE IF NOT EXISTS policy_executions (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES security_policies(id),
  employee_id INTEGER REFERENCES employees(id),
  violation_id INTEGER REFERENCES violations(id),
  action_type VARCHAR(50),
  execution_status VARCHAR(20) DEFAULT 'pending' CHECK (execution_status IN ('pending', 'success', 'failed', 'skipped')),
  execution_details JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Policy inheritance cache - for performance optimization
CREATE TABLE IF NOT EXISTS policy_inheritance_cache (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  effective_policies JSONB, -- Cached effective policies for this employee
  last_calculated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(employee_id)
);

-- ==================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_security_policies_level_active ON security_policies(policy_level, is_active);
CREATE INDEX IF NOT EXISTS idx_security_policies_target ON security_policies(target_type, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_policies_priority ON security_policies(priority DESC, created_at DESC);

-- Condition lookup indexes
CREATE INDEX IF NOT EXISTS idx_policy_conditions_policy_id ON policy_conditions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_conditions_type ON policy_conditions(condition_type);

-- Action execution indexes
CREATE INDEX IF NOT EXISTS idx_policy_actions_policy_id ON policy_actions(policy_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_policy_actions_enabled ON policy_actions(is_enabled) WHERE is_enabled = true;

-- Execution history indexes
CREATE INDEX IF NOT EXISTS idx_policy_executions_policy_id ON policy_executions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_executions_employee ON policy_executions(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_executions_violation ON policy_executions(violation_id);
CREATE INDEX IF NOT EXISTS idx_policy_executions_status ON policy_executions(execution_status, started_at);

-- Inheritance cache index
CREATE INDEX IF NOT EXISTS idx_policy_inheritance_employee ON policy_inheritance_cache(employee_id);

-- ==================================================
-- SAMPLE DATA FOR TESTING
-- ==================================================

-- Global policies
INSERT INTO security_policies (name, description, policy_level, priority, created_by) VALUES
('Critical Risk Auto-Response', 'Automatic response for critical risk violations', 'global', 100, 1),
('Data Breach Protocol', 'Standard response for data breach incidents', 'global', 90, 1),
('After Hours Access Alert', 'Monitor and alert on after-hours access attempts', 'global', 50, 1);

-- Sample conditions for Critical Risk Auto-Response
INSERT INTO policy_conditions (policy_id, condition_type, operator, value) VALUES
(1, 'violation_severity', 'equals', 'Critical'),
(1, 'risk_score', 'greater_than', '85');

-- Sample actions for Critical Risk Auto-Response
INSERT INTO policy_actions (policy_id, action_type, action_config, execution_order) VALUES
(1, 'email_alert', '{"recipients": ["security@company.com"], "subject": "Critical Security Violation Detected"}', 1),
(1, 'escalate_incident', '{"escalation_level": "immediate", "notify_management": true}', 2),
(1, 'increase_monitoring', '{"duration_hours": 24, "monitoring_level": "high"}', 3);

-- Department-specific policy for R&D (using placeholder target_id)
INSERT INTO security_policies (name, description, policy_level, target_id, target_type, priority, created_by) VALUES
('R&D Intellectual Property Protection', 'Enhanced monitoring for R&D department data access', 'group', 'R&D', 'department', 80, 1);

-- User-specific policy for high-risk individual
INSERT INTO security_policies (name, description, policy_level, target_id, target_type, priority, created_by) VALUES
('Dr. Volkov Enhanced Monitoring', 'Specialized monitoring for high-risk individual', 'user', 'volkov@company.com', 'user', 95, 1);

-- Sample conditions for user-specific policy
INSERT INTO policy_conditions (policy_id, condition_type, operator, value) VALUES
(4, 'any_violation', 'equals', 'true'),
(4, 'data_access', 'greater_than', '100MB');

-- Sample actions for user-specific policy
INSERT INTO policy_actions (policy_id, action_type, action_config, execution_order) VALUES
(4, 'immediate_alert', '{"recipients": ["security@company.com", "cso@company.com"], "priority": "urgent"}', 1),
(4, 'log_detailed_activity', '{"include_network": true, "include_files": true}', 2);

-- ==================================================
-- UTILITY FUNCTIONS
-- ==================================================

-- Function to get effective policies for a user
CREATE OR REPLACE FUNCTION get_effective_policies(user_id INTEGER)
RETURNS TABLE(
  policy_id INTEGER,
  policy_name VARCHAR,
  policy_level VARCHAR,
  priority INTEGER,
  conditions JSONB,
  actions JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT e.id, e.department, u.role
    FROM employees e
    JOIN users u ON e.email = u.email
    WHERE e.id = user_id
  ),
  applicable_policies AS (
    SELECT sp.*
    FROM security_policies sp, user_info ui
    WHERE sp.is_active = true
    AND (
      -- Global policies
      (sp.policy_level = 'global') OR
      -- Department policies
      (sp.policy_level = 'group' AND sp.target_type = 'department' AND sp.target_id = ui.department) OR
      -- Role policies (if we had role mapping)
      (sp.policy_level = 'group' AND sp.target_type = 'role') OR
      -- User-specific policies
      (sp.policy_level = 'user' AND sp.target_id = ui.email)
    )
    ORDER BY sp.priority DESC, sp.created_at DESC
  )
  SELECT 
    ap.id,
    ap.name,
    ap.policy_level,
    ap.priority,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'type', pc.condition_type,
          'operator', pc.operator,
          'value', pc.value,
          'logical_operator', pc.logical_operator
        ) ORDER BY pc.condition_order
      ) FROM policy_conditions pc WHERE pc.policy_id = ap.id),
      '[]'::jsonb
    ) as conditions,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'type', pa.action_type,
          'config', pa.action_config,
          'order', pa.execution_order,
          'delay', pa.delay_minutes
        ) ORDER BY pa.execution_order
      ) FROM policy_actions pa WHERE pa.policy_id = ap.id AND pa.is_enabled = true),
      '[]'::jsonb
    ) as actions
  FROM applicable_policies ap;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger policy evaluation
CREATE OR REPLACE FUNCTION evaluate_policies_for_violation(
  violation_id INTEGER,
  employee_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  policies_triggered INTEGER := 0;
  policy_record RECORD;
  violation_record RECORD;
BEGIN
  -- Get violation details
  SELECT * INTO violation_record FROM violations WHERE id = violation_id;
  
  -- Get effective policies for the employee
  FOR policy_record IN 
    SELECT * FROM get_effective_policies(employee_id)
  LOOP
    -- Simple condition evaluation (can be enhanced)
    IF policy_record.conditions::text LIKE '%' || violation_record.severity || '%' OR
       policy_record.conditions::text LIKE '%any_violation%' THEN
      
      -- Create execution record
      INSERT INTO policy_executions (
        policy_id, employee_id, violation_id, execution_status
      ) VALUES (
        policy_record.policy_id, employee_id, violation_id, 'pending'
      );
      
      policies_triggered := policies_triggered + 1;
    END IF;
  END LOOP;
  
  RETURN policies_triggered;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==================================================

-- Trigger to update policy timestamp on changes
CREATE OR REPLACE FUNCTION update_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_policies_update_timestamp
  BEFORE UPDATE ON security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_policy_timestamp();

-- Trigger to invalidate inheritance cache when policies change
CREATE OR REPLACE FUNCTION invalidate_policy_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM policy_inheritance_cache 
  WHERE employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (TG_OP = 'DELETE' AND OLD.target_id = e.email) 
       OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.target_id = e.email)
       OR NEW.policy_level = 'global'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invalidate_policy_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON security_policies
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_policy_cache(); 