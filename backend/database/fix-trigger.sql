-- Fix the invalidate_policy_cache trigger function to handle VARCHAR target_id properly

CREATE OR REPLACE FUNCTION invalidate_policy_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM policy_inheritance_cache 
  WHERE employee_id IN (
    SELECT e.id FROM employees e 
    WHERE (TG_OP = 'DELETE') OR 
          (TG_OP IN ('INSERT', 'UPDATE') AND (
            NEW.policy_level = 'global' OR
            (NEW.target_type = 'user' AND NEW.target_id = e.email) OR
            (NEW.target_type = 'department' AND NEW.target_id = e.department)
          ))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql; 