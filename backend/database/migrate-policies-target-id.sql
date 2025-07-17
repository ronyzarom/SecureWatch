-- Migration: Change target_id from INTEGER to VARCHAR(255)
-- This allows storing department names directly instead of requiring integer IDs

BEGIN;

-- 1. Add a new temporary column
ALTER TABLE security_policies ADD COLUMN target_id_new VARCHAR(255);

-- 2. Migrate existing data
-- For department policies, use actual department names
UPDATE security_policies 
SET target_id_new = 'R&D' 
WHERE target_type = 'department' AND target_id = 1;

-- For user policies, convert user ID to email (we'll use email as identifier)
UPDATE security_policies 
SET target_id_new = 'volkov@company.com' 
WHERE target_type = 'user' AND target_id = 1;

-- For global policies, keep NULL
UPDATE security_policies 
SET target_id_new = NULL 
WHERE policy_level = 'global';

-- 3. Drop the old column and rename the new one
ALTER TABLE security_policies DROP COLUMN target_id;
ALTER TABLE security_policies RENAME COLUMN target_id_new TO target_id;

-- 4. Update the constraint to work with VARCHAR
ALTER TABLE security_policies DROP CONSTRAINT IF EXISTS valid_target_combination;
ALTER TABLE security_policies ADD CONSTRAINT valid_target_combination CHECK (
  (policy_level = 'global' AND target_id IS NULL AND target_type IS NULL) OR
  (policy_level = 'group' AND target_id IS NOT NULL AND target_type IN ('department', 'role')) OR
  (policy_level = 'user' AND target_id IS NOT NULL AND target_type = 'user')
);

-- 5. Update the utility function to work with the new schema
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
    SELECT e.id, e.department, e.email, u.role
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
      (sp.policy_level = 'group' AND sp.target_type = 'role' AND sp.target_id = ui.role) OR
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
      (SELECT json_agg(json_build_object(
        'id', pc.id,
        'type', pc.condition_type,
        'operator', pc.operator,
        'value', pc.value,
        'logical_operator', pc.logical_operator,
        'order', pc.condition_order
      ) ORDER BY pc.condition_order)
      FROM policy_conditions pc WHERE pc.policy_id = ap.id),
      '[]'::json
    )::jsonb as conditions,
    COALESCE(
      (SELECT json_agg(json_build_object(
        'id', pa.id,
        'type', pa.action_type,
        'config', pa.action_config,
        'order', pa.execution_order,
        'delay', pa.delay_minutes,
        'enabled', pa.is_enabled
      ) ORDER BY pa.execution_order)
      FROM policy_actions pa WHERE pa.policy_id = ap.id),
      '[]'::json
    )::jsonb as actions
  FROM applicable_policies ap;
END;
$$ LANGUAGE plpgsql;

COMMIT; 