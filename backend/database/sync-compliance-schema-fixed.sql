-- Sync-Triggered Compliance Analysis Database Schema
-- Supports automatic AI compliance analysis triggered by email sync

-- Compliance Analysis Log
-- Stores detailed results from sync-triggered AI compliance analysis
CREATE TABLE IF NOT EXISTS compliance_analysis_log (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL DEFAULT 'ai_enhanced_sync',
    trigger_source VARCHAR(50) NOT NULL, -- 'email_sync', 'office365_sync', 'google_sync', 'manual'
    
    -- Risk Scores
    ai_risk_score INTEGER DEFAULT 0, -- AI-enhanced risk score (0-100)
    traditional_risk_score INTEGER DEFAULT 0, -- Traditional rule-based score (0-100)
    
    -- AI Analysis Results (JSON)
    behavioral_patterns JSONB DEFAULT '{}', -- Behavioral pattern analysis
    contextual_violations JSONB DEFAULT '[]', -- Contextual violations detected
    predictive_risks JSONB DEFAULT '[]', -- Predicted future risks
    ai_recommendations JSONB DEFAULT '[]', -- AI-generated recommendations
    
    -- Analysis Metadata
    confidence_score INTEGER DEFAULT 0, -- AI confidence level (0-100)
    analyzed_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(employee_id, analysis_type) -- One record per employee per analysis type
);

-- Compliance Alerts
-- High-priority alerts generated by sync-triggered AI analysis
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Alert Details
    alert_type VARCHAR(100) NOT NULL, -- 'high_compliance_risk', 'critical_predictive_risk', 'multiple_violations'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}', -- Additional alert details
    
    -- Alert Metadata
    triggered_by VARCHAR(50) NOT NULL, -- 'sync_ai_analysis', 'manual_review', 'batch_analysis'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'dismissed'
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES employees(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for compliance_analysis_log
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_employee ON compliance_analysis_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_trigger ON compliance_analysis_log(trigger_source);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_analyzed_at ON compliance_analysis_log(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_ai_risk ON compliance_analysis_log(ai_risk_score);

-- Create indexes for compliance_alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_employee ON compliance_alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_triggered_by ON compliance_alerts(triggered_by);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created_at ON compliance_alerts(created_at);

-- Add AI compliance fields to employees table
-- Stores latest AI compliance analysis results for quick access
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS ai_compliance_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_compliance_status VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ai_risk_trend VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ai_last_analyzed TIMESTAMP;

-- Create indexes for new employee AI fields
CREATE INDEX IF NOT EXISTS idx_employees_ai_compliance_score ON employees(ai_compliance_score);
CREATE INDEX IF NOT EXISTS idx_employees_ai_compliance_status ON employees(ai_compliance_status);
CREATE INDEX IF NOT EXISTS idx_employees_ai_last_analyzed ON employees(ai_last_analyzed);

-- Compliance Analysis Summary View
-- Provides easy access to latest compliance analysis for each employee
CREATE OR REPLACE VIEW employee_compliance_analysis_summary AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.department,
    e.risk_score as traditional_risk_score,
    e.ai_compliance_score,
    e.ai_compliance_status,
    e.ai_risk_trend,
    e.ai_last_analyzed,
    
    -- Latest analysis details
    cal.analysis_type,
    cal.trigger_source,
    cal.confidence_score,
    cal.analyzed_at,
    
    -- Risk level classification
    CASE 
        WHEN e.ai_compliance_score >= 80 THEN 'critical'
        WHEN e.ai_compliance_score >= 60 THEN 'high'
        WHEN e.ai_compliance_score >= 40 THEN 'medium'
        WHEN e.ai_compliance_score >= 20 THEN 'low'
        ELSE 'unknown'
    END as ai_risk_level,
    
    -- Alert counts
    (SELECT COUNT(*) FROM compliance_alerts WHERE employee_id = e.id AND status = 'active') as active_alerts,
    (SELECT COUNT(*) FROM compliance_alerts WHERE employee_id = e.id AND triggered_by = 'sync_ai_analysis') as sync_alerts
    
FROM employees e
LEFT JOIN compliance_analysis_log cal ON e.id = cal.employee_id AND cal.analysis_type = 'ai_enhanced_sync'
WHERE e.is_active = true;

-- Sync Analysis Statistics View
-- Provides overview of sync-triggered compliance analysis
CREATE OR REPLACE VIEW sync_compliance_statistics AS
SELECT 
    -- Analysis counts
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN analyzed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as analyses_24h,
    COUNT(CASE WHEN analyzed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as analyses_7d,
    
    -- Risk distribution
    COUNT(CASE WHEN ai_risk_score >= 80 THEN 1 END) as critical_risk_count,
    COUNT(CASE WHEN ai_risk_score >= 60 AND ai_risk_score < 80 THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN ai_risk_score >= 40 AND ai_risk_score < 60 THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN ai_risk_score < 40 THEN 1 END) as low_risk_count,
    
    -- Average scores
    AVG(ai_risk_score) as avg_ai_risk_score,
    AVG(confidence_score) as avg_confidence_score,
    
    -- Latest analysis
    MAX(analyzed_at) as last_analysis
    
FROM compliance_analysis_log 
WHERE analysis_type = 'ai_enhanced_sync';

-- Alert Statistics View
-- Overview of sync-triggered compliance alerts
CREATE OR REPLACE VIEW sync_alert_statistics AS
SELECT 
    -- Alert counts
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts,
    
    -- Severity distribution
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_alerts,
    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_alerts,
    
    -- Type distribution
    COUNT(CASE WHEN alert_type = 'high_compliance_risk' THEN 1 END) as high_risk_alerts,
    COUNT(CASE WHEN alert_type = 'critical_predictive_risk' THEN 1 END) as predictive_alerts,
    COUNT(CASE WHEN alert_type = 'multiple_violations' THEN 1 END) as violation_alerts,
    
    -- Time-based counts
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as alerts_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as alerts_7d,
    
    -- Resolution metrics
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
    
FROM compliance_alerts 
WHERE triggered_by = 'sync_ai_analysis';

-- Trigger to update employee AI compliance data when analysis is updated
CREATE OR REPLACE FUNCTION update_employee_ai_compliance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE employees 
    SET 
        ai_compliance_score = NEW.ai_risk_score,
        ai_last_analyzed = NEW.analyzed_at,
        updated_at = NOW()
    WHERE id = NEW.employee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic employee updates
DROP TRIGGER IF EXISTS trigger_update_employee_ai_compliance ON compliance_analysis_log;
CREATE TRIGGER trigger_update_employee_ai_compliance
    AFTER INSERT OR UPDATE ON compliance_analysis_log
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_ai_compliance();

-- Comments for documentation
COMMENT ON TABLE compliance_analysis_log IS 'Stores detailed AI compliance analysis results triggered by email sync';
COMMENT ON TABLE compliance_alerts IS 'High-priority alerts generated by sync-triggered AI compliance analysis';
COMMENT ON VIEW employee_compliance_analysis_summary IS 'Quick access to latest AI compliance analysis for each employee';
COMMENT ON VIEW sync_compliance_statistics IS 'Statistical overview of sync-triggered compliance analysis';
COMMENT ON VIEW sync_alert_statistics IS 'Statistical overview of sync-triggered compliance alerts'; 