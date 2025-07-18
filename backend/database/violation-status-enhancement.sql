-- ============================================================
-- VIOLATION STATUS ENHANCEMENT SCHEMA
-- Adds False Positive status, audit trail, and AI validation
-- ============================================================

-- 1. Update violations status constraint to include False Positive
ALTER TABLE violations DROP CONSTRAINT violations_status_check;
ALTER TABLE violations ADD CONSTRAINT violations_status_check 
  CHECK (status IN ('Active', 'Investigating', 'False Positive', 'Resolved'));

-- 2. Add AI validation fields to violations table
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_validation_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (ai_validation_status IN ('pending', 'validated', 'rejected', 'manual_override'));
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_validation_score DECIMAL(5,2);
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_validation_reasoning TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_validated_at TIMESTAMP;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ai_validator_version VARCHAR(50);

-- 3. Enhance evidence format for structured data
ALTER TABLE violations ADD COLUMN IF NOT EXISTS structured_evidence JSONB DEFAULT '[]';

-- 4. Create violation status audit trail table
CREATE TABLE IF NOT EXISTS violation_status_history (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  ai_assisted BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create AI validation requests table
CREATE TABLE IF NOT EXISTS ai_validation_requests (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER REFERENCES violations(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'evidence_validation', 'classification_review', 'false_positive_check'
  request_data JSONB NOT NULL,
  ai_response JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  confidence_score DECIMAL(5,2),
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_violations_ai_validation_status ON violations(ai_validation_status);
CREATE INDEX IF NOT EXISTS idx_violation_status_history_violation_id ON violation_status_history(violation_id);
CREATE INDEX IF NOT EXISTS idx_violation_status_history_created_at ON violation_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_validation_requests_violation_id ON ai_validation_requests(violation_id);
CREATE INDEX IF NOT EXISTS idx_ai_validation_requests_status ON ai_validation_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_validation_requests_created_at ON ai_validation_requests(created_at DESC);

-- 7. Create trigger function for status change audit
CREATE OR REPLACE FUNCTION log_violation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO violation_status_history (
      violation_id, 
      previous_status, 
      new_status, 
      changed_by,
      change_reason,
      ai_assisted,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.metadata ? 'changed_by' THEN (NEW.metadata->>'changed_by')::INTEGER
        ELSE NULL
      END,
      CASE 
        WHEN NEW.metadata ? 'change_reason' THEN NEW.metadata->>'change_reason'
        ELSE NULL
      END,
      CASE 
        WHEN NEW.metadata ? 'ai_assisted' THEN (NEW.metadata->>'ai_assisted')::BOOLEAN
        ELSE false
      END,
      jsonb_build_object(
        'previous_ai_validation', OLD.ai_validation_status,
        'new_ai_validation', NEW.ai_validation_status,
        'change_timestamp', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS violation_status_change_trigger ON violations;
CREATE TRIGGER violation_status_change_trigger
  AFTER UPDATE ON violations
  FOR EACH ROW
  EXECUTE FUNCTION log_violation_status_change();

-- 9. Add sample data for testing
INSERT INTO violation_status_history (violation_id, previous_status, new_status, change_reason, created_at)
SELECT 
  id, 
  'Active', 
  status, 
  'Initial status from existing data',
  created_at
FROM violations 
WHERE NOT EXISTS (
  SELECT 1 FROM violation_status_history WHERE violation_id = violations.id
);

-- 10. Update existing violations with default AI validation status
UPDATE violations 
SET ai_validation_status = 'pending', ai_validator_version = '1.0.0'
WHERE ai_validation_status IS NULL; 