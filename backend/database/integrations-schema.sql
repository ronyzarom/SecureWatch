-- Office 365 Integration Schema
-- This file contains the database schema for Office 365 email integration

-- Create sync_jobs table to track synchronization jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id SERIAL PRIMARY KEY,
  integration_type VARCHAR(50) NOT NULL, -- 'office365', 'google_workspace', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  parameters JSONB DEFAULT '{}', -- Sync parameters (daysBack, maxEmailsPerUser, etc.)
  results JSONB DEFAULT '{}', -- Sync results (totalUsers, processedEmails, violations, etc.)
  error_message TEXT, -- Error message if sync failed
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  started_by INTEGER REFERENCES users(id), -- User who started the sync
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration_type ON sync_jobs(integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync_jobs(started_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_jobs_update_timestamp
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_jobs_timestamp();

-- Add source column to violations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'violations' AND column_name = 'source'
  ) THEN
    ALTER TABLE violations ADD COLUMN source VARCHAR(50);
    
    -- Update existing violations with default source
    UPDATE violations SET source = 'manual' WHERE source IS NULL;
  END IF;
END $$;

-- Add metadata column to violations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'violations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE violations ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add integration_source index to email_communications if not exists
CREATE INDEX IF NOT EXISTS idx_email_communications_integration_source 
ON email_communications(integration_source);

-- Add created_at index to email_communications for performance
CREATE INDEX IF NOT EXISTS idx_email_communications_created_at 
ON email_communications(created_at);

-- Add source index to violations for performance (now that column exists)
CREATE INDEX IF NOT EXISTS idx_violations_source 
ON violations(source);

-- Sample Office 365 configuration (commented out - should be set via API)
/*
INSERT INTO app_settings (key, value) VALUES (
  'office365_config',
  '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tenantId": "your-tenant-id",
    "isActive": false,
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }'
) ON CONFLICT (key) DO NOTHING;
*/ 