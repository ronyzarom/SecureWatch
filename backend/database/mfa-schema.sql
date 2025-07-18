-- MFA Schema Extensions for SecureWatch
-- Adds Multi-Factor Authentication support using email verification

-- Add MFA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used TIMESTAMP;

-- Create MFA codes table for email verification
CREATE TABLE IF NOT EXISTS mfa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(20) DEFAULT 'login' CHECK (code_type IN ('login', 'setup', 'backup')),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mfa_codes_user_id ON mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_code ON mfa_codes(code);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_expires ON mfa_codes(expires_at);

-- Create function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM mfa_codes 
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create table for MFA settings (global configuration)
CREATE TABLE IF NOT EXISTS mfa_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default MFA settings
INSERT INTO mfa_settings (setting_key, setting_value, description) VALUES
('mfa_code_length', '6', 'Length of MFA verification codes'),
('mfa_code_expiry_minutes', '10', 'Minutes before MFA code expires'),
('mfa_max_attempts', '3', 'Maximum verification attempts before lockout'),
('mfa_lockout_minutes', '15', 'Minutes to wait after max attempts exceeded'),
('mfa_email_from_name', 'SecureWatch Security', 'Display name for MFA emails'),
('mfa_email_subject', 'SecureWatch - Verification Code', 'Subject line for MFA emails')
ON CONFLICT (setting_key) DO NOTHING;

-- Add audit logging for MFA events
CREATE TABLE IF NOT EXISTS mfa_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'code_sent', 'code_verified', 'code_failed'
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_user_id ON mfa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_event_type ON mfa_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_created_at ON mfa_audit_log(created_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_codes TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_settings TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_audit_log TO postgres;
GRANT USAGE ON SEQUENCE mfa_codes_id_seq TO postgres;
GRANT USAGE ON SEQUENCE mfa_settings_id_seq TO postgres;
GRANT USAGE ON SEQUENCE mfa_audit_log_id_seq TO postgres;

SELECT 'MFA schema extensions applied successfully! 🔐✅' AS status; 