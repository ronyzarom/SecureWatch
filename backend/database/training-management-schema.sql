-- Employee Training Management System Database Schema
-- Comprehensive training system with AI content generation and compliance integration

-- Training Categories
-- Organize training content by category and regulation
CREATE TABLE IF NOT EXISTS training_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applicable_regulations VARCHAR[] DEFAULT '{}', -- ['gdpr', 'sox', 'hipaa', 'pci_dss']
    icon VARCHAR(100), -- Icon name for UI
    color VARCHAR(20), -- Color theme for category
    priority INTEGER DEFAULT 0, -- Higher priority = more important
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Content
-- Store all training materials with AI-generated and manual content
CREATE TABLE IF NOT EXISTS training_content (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES training_categories(id) ON DELETE CASCADE,
    
    -- Content Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'video', 'document', 'quiz', 'interactive', 'ai_generated'
    content_format VARCHAR(50), -- 'html', 'markdown', 'pdf', 'mp4', 'json'
    content_body TEXT, -- Main content (HTML, markdown, etc.)
    content_url VARCHAR(500), -- External content URL
    content_metadata JSONB DEFAULT '{}', -- Additional content data
    
    -- Compliance Mapping
    applicable_regulations VARCHAR[] DEFAULT '{}', -- Specific regulations this training addresses
    regulation_requirements JSONB DEFAULT '{}', -- Detailed requirement mapping
    compliance_level VARCHAR(50) DEFAULT 'required', -- 'required', 'recommended', 'optional'
    
    -- AI Generation Info
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT, -- Original prompt used for AI generation
    ai_model VARCHAR(100), -- AI model used (e.g., 'gpt-4o-mini')
    ai_generation_date TIMESTAMP,
    ai_review_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
    
    -- Content Management
    version VARCHAR(50) DEFAULT '1.0',
    author_id INTEGER REFERENCES employees(id),
    reviewer_id INTEGER REFERENCES employees(id),
    difficulty_level INTEGER DEFAULT 1, -- 1-5 scale
    estimated_duration_minutes INTEGER DEFAULT 30,
    
    -- Status and Lifecycle
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'published', 'archived'
    published_at TIMESTAMP,
    expires_at TIMESTAMP, -- Content expiration date
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Programs
-- Structured training programs combining multiple content pieces
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
    
    -- Program Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'onboarding', 'compliance', 'certification'
    
    -- Compliance Integration
    applicable_regulations VARCHAR[] DEFAULT '{}',
    compliance_requirements JSONB DEFAULT '{}',
    is_mandatory BOOLEAN DEFAULT false,
    
    -- Program Structure
    total_duration_minutes INTEGER DEFAULT 0,
    difficulty_level INTEGER DEFAULT 1,
    prerequisites JSONB DEFAULT '[]', -- Array of prerequisite program IDs
    
    -- Assignment Rules
    auto_assign_rules JSONB DEFAULT '{}', -- Automatic assignment criteria
    target_departments VARCHAR[] DEFAULT '{}',
    target_roles VARCHAR[] DEFAULT '{}',
    target_compliance_profiles INTEGER[] DEFAULT '{}',
    
    -- Scheduling
    recurrence_type VARCHAR(50) DEFAULT 'once', -- 'once', 'annual', 'quarterly', 'monthly'
    recurrence_interval INTEGER DEFAULT 1,
    grace_period_days INTEGER DEFAULT 7,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Program Content Mapping
-- Link content to programs with ordering
CREATE TABLE IF NOT EXISTS training_program_content (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES training_content(id) ON DELETE CASCADE,
    
    -- Ordering and Structure
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    
    -- Completion Criteria
    minimum_score INTEGER, -- For quizzes/assessments
    requires_certification BOOLEAN DEFAULT false,
    
    -- Timing
    estimated_duration_minutes INTEGER,
    
    UNIQUE(program_id, content_id),
    UNIQUE(program_id, sequence_order)
);

-- Employee Training Assignments
-- Track what training is assigned to which employees
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_by INTEGER REFERENCES employees(id),
    assignment_reason VARCHAR(100), -- 'auto_compliance', 'manual', 'role_requirement', 'incident_response'
    assignment_source VARCHAR(100), -- 'compliance_profile', 'manager_request', 'system_trigger'
    
    -- Timing
    assigned_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    grace_period_end TIMESTAMP,
    
    -- Compliance Context
    compliance_requirement VARCHAR(100), -- Specific regulation requirement
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'overdue', 'exempt'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    exemption_reason TEXT,
    exemption_approved_by INTEGER REFERENCES employees(id),
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    completion_attempts INTEGER DEFAULT 0,
    
    -- Results
    final_score INTEGER,
    passing_score INTEGER,
    completion_time_minutes INTEGER,
    certification_earned BOOLEAN DEFAULT false,
    certificate_id VARCHAR(255), -- Reference to certificate
    
    UNIQUE(employee_id, program_id),
    INDEX idx_training_assignments_employee (employee_id),
    INDEX idx_training_assignments_program (program_id),
    INDEX idx_training_assignments_due_date (due_date),
    INDEX idx_training_assignments_status (status)
);

-- Employee Content Progress
-- Detailed tracking of individual content piece progress
CREATE TABLE IF NOT EXISTS training_content_progress (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES training_content(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Progress Details
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'failed', 'skipped'
    progress_percentage INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Assessment Results
    score INTEGER,
    max_score INTEGER,
    attempts_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    
    -- Engagement Tracking
    view_count INTEGER DEFAULT 0,
    interaction_data JSONB DEFAULT '{}', -- Mouse clicks, scroll depth, etc.
    
    -- Notes and Feedback
    employee_notes TEXT,
    employee_rating INTEGER, -- 1-5 stars
    employee_feedback TEXT,
    
    UNIQUE(assignment_id, content_id),
    INDEX idx_content_progress_assignment (assignment_id),
    INDEX idx_content_progress_employee (employee_id),
    INDEX idx_content_progress_content (content_id)
);

-- Training Compliance Requirements
-- Map specific regulation requirements to training needs
CREATE TABLE IF NOT EXISTS training_compliance_requirements (
    id SERIAL PRIMARY KEY,
    
    -- Regulation Details
    regulation_code VARCHAR(50) NOT NULL, -- 'gdpr', 'sox', 'hipaa', 'pci_dss'
    requirement_section VARCHAR(100), -- e.g., 'Article 32', 'Section 404'
    requirement_title VARCHAR(255),
    requirement_description TEXT,
    
    -- Training Requirements
    required_frequency VARCHAR(50), -- 'annual', 'quarterly', 'biannual', 'onboarding'
    grace_period_days INTEGER DEFAULT 30,
    minimum_training_hours DECIMAL(4,2),
    requires_certification BOOLEAN DEFAULT false,
    requires_assessment BOOLEAN DEFAULT true,
    minimum_passing_score INTEGER DEFAULT 80,
    
    -- Applicability
    applies_to_departments VARCHAR[] DEFAULT '{}',
    applies_to_roles VARCHAR[] DEFAULT '{}',
    applies_to_data_classifications VARCHAR[] DEFAULT '{}',
    
    -- Associated Training
    recommended_programs INTEGER[] DEFAULT '{}', -- Array of training_programs.id
    mandatory_programs INTEGER[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    effective_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_compliance_requirements_regulation (regulation_code),
    INDEX idx_compliance_requirements_frequency (required_frequency)
);

-- Training Certificates
-- Track earned certificates and compliance credentials
CREATE TABLE IF NOT EXISTS training_certificates (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(255) UNIQUE NOT NULL, -- Unique certificate identifier
    
    -- Certificate Details
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES training_programs(id),
    assignment_id INTEGER REFERENCES training_assignments(id),
    
    -- Certificate Content
    certificate_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) DEFAULT 'SecureWatch',
    certificate_type VARCHAR(50), -- 'completion', 'compliance', 'certification', 'continuing_education'
    
    -- Compliance Mapping
    regulation_compliance VARCHAR[] DEFAULT '{}',
    compliance_period_months INTEGER, -- How long this certificate is valid for compliance
    
    -- Certificate Data
    issued_date TIMESTAMP DEFAULT NOW(),
    valid_from TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    earned_score INTEGER,
    required_score INTEGER,
    
    -- Certificate File
    certificate_file_url VARCHAR(500), -- URL to PDF certificate
    certificate_metadata JSONB DEFAULT '{}',
    
    -- Verification
    verification_hash VARCHAR(255), -- For certificate authenticity
    is_verified BOOLEAN DEFAULT true,
    verification_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked', 'suspended'
    revocation_reason TEXT,
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES employees(id),
    
    INDEX idx_certificates_employee (employee_id),
    INDEX idx_certificates_program (program_id),
    INDEX idx_certificates_expiry (expires_at),
    INDEX idx_certificates_regulation (regulation_compliance)
);

-- Training Notifications
-- Track training-related notifications and reminders
CREATE TABLE IF NOT EXISTS training_notifications (
    id SERIAL PRIMARY KEY,
    
    -- Notification Target
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES training_assignments(id),
    program_id INTEGER REFERENCES training_programs(id),
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- 'assignment', 'reminder', 'deadline', 'completion', 'certificate'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    -- Delivery
    delivery_method VARCHAR(50) DEFAULT 'in_app', -- 'in_app', 'email', 'sms', 'dashboard'
    scheduled_for TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    delivery_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'cancelled'
    
    -- Interaction
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    action_taken VARCHAR(100), -- What action the user took
    
    -- Metadata
    notification_data JSONB DEFAULT '{}',
    
    INDEX idx_notifications_employee (employee_id),
    INDEX idx_notifications_scheduled (scheduled_for),
    INDEX idx_notifications_status (delivery_status)
);

-- AI Training Content Generation Log
-- Track AI-generated training content for analysis and improvement
CREATE TABLE IF NOT EXISTS ai_training_generation_log (
    id SERIAL PRIMARY KEY,
    
    -- Generation Request
    content_id INTEGER REFERENCES training_content(id),
    requested_by INTEGER REFERENCES employees(id),
    generation_type VARCHAR(50), -- 'full_content', 'quiz_questions', 'summary', 'translation'
    
    -- AI Parameters
    ai_model VARCHAR(100),
    prompt_template VARCHAR(255),
    full_prompt TEXT,
    generation_parameters JSONB DEFAULT '{}', -- temperature, max_tokens, etc.
    
    -- Input Context
    regulation_focus VARCHAR[] DEFAULT '{}',
    target_audience VARCHAR(100), -- 'all_employees', 'managers', 'it_staff', 'finance'
    difficulty_level INTEGER,
    estimated_duration INTEGER,
    content_type VARCHAR(50),
    
    -- Generation Results
    generated_content TEXT,
    generation_success BOOLEAN DEFAULT false,
    error_message TEXT,
    
    -- Quality Metrics
    content_quality_score INTEGER, -- 1-100
    regulation_accuracy_score INTEGER, -- 1-100
    readability_score INTEGER, -- 1-100
    engagement_prediction INTEGER, -- 1-100
    
    -- Review and Approval
    human_review_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
    reviewer_id INTEGER REFERENCES employees(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    
    -- Usage Tracking
    times_used INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0,
    average_user_rating DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_ai_generation_model (ai_model),
    INDEX idx_ai_generation_type (generation_type),
    INDEX idx_ai_generation_review (human_review_status)
);

-- Training Analytics Views
-- Pre-built views for common training analytics queries

-- Employee Training Compliance Status
CREATE OR REPLACE VIEW employee_training_compliance AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.department,
    e.compliance_profile_id,
    
    -- Overall Training Status
    COUNT(ta.id) as total_assignments,
    COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments,
    COUNT(CASE WHEN ta.status = 'overdue' THEN 1 END) as overdue_assignments,
    COUNT(CASE WHEN ta.due_date < NOW() AND ta.status != 'completed' THEN 1 END) as past_due_assignments,
    
    -- Compliance Training Status
    COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END) as mandatory_assignments,
    COUNT(CASE WHEN tp.is_mandatory = true AND ta.status = 'completed' THEN 1 END) as completed_mandatory,
    
    -- Certificate Status
    COUNT(tc.id) as total_certificates,
    COUNT(CASE WHEN tc.expires_at > NOW() OR tc.expires_at IS NULL THEN 1 END) as valid_certificates,
    COUNT(CASE WHEN tc.expires_at <= NOW() THEN 1 END) as expired_certificates,
    
    -- Compliance Percentage
    CASE 
        WHEN COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END) > 0 
        THEN ROUND(
            (COUNT(CASE WHEN tp.is_mandatory = true AND ta.status = 'completed' THEN 1 END)::DECIMAL / 
             COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END)) * 100, 2
        )
        ELSE 100
    END as compliance_percentage,
    
    -- Latest Activity
    MAX(ta.last_accessed_at) as last_training_activity,
    MAX(tc.issued_date) as last_certificate_earned
    
FROM employees e
LEFT JOIN training_assignments ta ON e.id = ta.employee_id
LEFT JOIN training_programs tp ON ta.program_id = tp.id
LEFT JOIN training_certificates tc ON e.id = tc.employee_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.department, e.compliance_profile_id;

-- Training Program Analytics
CREATE OR REPLACE VIEW training_program_analytics AS
SELECT 
    tp.id as program_id,
    tp.name as program_name,
    tp.program_type,
    tp.is_mandatory,
    
    -- Assignment Stats
    COUNT(ta.id) as total_assignments,
    COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completions,
    COUNT(CASE WHEN ta.status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN ta.status = 'overdue' THEN 1 END) as overdue,
    
    -- Completion Metrics
    ROUND(
        (COUNT(CASE WHEN ta.status = 'completed' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(ta.id), 0)) * 100, 2
    ) as completion_rate,
    
    AVG(ta.final_score) as average_score,
    AVG(ta.completion_time_minutes) as average_completion_time,
    
    -- Content Analytics
    COUNT(DISTINCT tpc.content_id) as total_content_pieces,
    AVG(tcp.employee_rating) as average_content_rating,
    
    -- Recent Activity
    MAX(ta.completed_at) as last_completion,
    MIN(ta.assigned_at) as first_assignment
    
FROM training_programs tp
LEFT JOIN training_assignments ta ON tp.id = ta.program_id
LEFT JOIN training_program_content tpc ON tp.id = tpc.program_id
LEFT JOIN training_content_progress tcp ON ta.id = tcp.assignment_id
GROUP BY tp.id, tp.name, tp.program_type, tp.is_mandatory;

-- Regulation Compliance Summary
CREATE OR REPLACE VIEW regulation_compliance_summary AS
SELECT 
    regulation_code,
    
    -- Training Requirements
    COUNT(*) as total_requirements,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_requirements,
    
    -- Program Coverage
    COUNT(DISTINCT unnest(mandatory_programs)) as mandatory_programs_count,
    COUNT(DISTINCT unnest(recommended_programs)) as recommended_programs_count,
    
    -- Employee Coverage
    (SELECT COUNT(DISTINCT ta.employee_id) 
     FROM training_assignments ta 
     JOIN training_programs tp ON ta.program_id = tp.id 
     WHERE regulation_code = ANY(tp.applicable_regulations)
     AND ta.status = 'completed') as employees_trained,
    
    (SELECT COUNT(DISTINCT e.id) 
     FROM employees e 
     WHERE e.is_active = true) as total_active_employees,
    
    -- Compliance Percentage
    ROUND(
        ((SELECT COUNT(DISTINCT ta.employee_id) 
          FROM training_assignments ta 
          JOIN training_programs tp ON ta.program_id = tp.id 
          WHERE regulation_code = ANY(tp.applicable_regulations)
          AND ta.status = 'completed')::DECIMAL / 
         (SELECT COUNT(DISTINCT e.id) FROM employees e WHERE e.is_active = true)) * 100, 2
    ) as overall_compliance_percentage
    
FROM training_compliance_requirements
GROUP BY regulation_code;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_training_content_regulations ON training_content USING GIN (applicable_regulations);
CREATE INDEX IF NOT EXISTS idx_training_programs_regulations ON training_programs USING GIN (applicable_regulations);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status_due ON training_assignments (status, due_date);
CREATE INDEX IF NOT EXISTS idx_training_certificates_regulation ON training_certificates USING GIN (regulation_compliance);
CREATE INDEX IF NOT EXISTS idx_training_content_ai_generated ON training_content (ai_generated, ai_review_status);

-- Add helpful comments for documentation
COMMENT ON TABLE training_categories IS 'Categorize training content by topic and regulation';
COMMENT ON TABLE training_content IS 'Store all training materials including AI-generated content';
COMMENT ON TABLE training_programs IS 'Structured training programs combining multiple content pieces';
COMMENT ON TABLE training_assignments IS 'Track training assignments to employees with compliance context';
COMMENT ON TABLE training_compliance_requirements IS 'Map regulation requirements to training needs';
COMMENT ON TABLE training_certificates IS 'Track earned certificates and compliance credentials';
COMMENT ON TABLE ai_training_generation_log IS 'Log AI-generated training content for analysis';
COMMENT ON VIEW employee_training_compliance IS 'Employee-level training compliance status summary';
COMMENT ON VIEW training_program_analytics IS 'Program-level training analytics and metrics';
COMMENT ON VIEW regulation_compliance_summary IS 'Regulation-level compliance coverage summary'; 