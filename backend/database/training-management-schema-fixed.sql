-- Employee Training Management System Database Schema (Fixed)
-- Comprehensive training system with AI content generation and compliance integration

-- Training Categories
CREATE TABLE IF NOT EXISTS training_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applicable_regulations VARCHAR[] DEFAULT '{}',
    icon VARCHAR(100),
    color VARCHAR(20),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Content  
CREATE TABLE IF NOT EXISTS training_content (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES training_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    content_format VARCHAR(50),
    content_body TEXT,
    content_url VARCHAR(500),
    content_metadata JSONB DEFAULT '{}',
    applicable_regulations VARCHAR[] DEFAULT '{}',
    regulation_requirements JSONB DEFAULT '{}',
    compliance_level VARCHAR(50) DEFAULT 'required',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_model VARCHAR(100),
    ai_generation_date TIMESTAMP,
    ai_review_status VARCHAR(50) DEFAULT 'pending',
    version VARCHAR(50) DEFAULT '1.0',
    author_id INTEGER REFERENCES employees(id),
    reviewer_id INTEGER REFERENCES employees(id),
    difficulty_level INTEGER DEFAULT 1,
    estimated_duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'draft',
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(50) DEFAULT 'standard',
    applicable_regulations VARCHAR[] DEFAULT '{}',
    compliance_requirements JSONB DEFAULT '{}',
    is_mandatory BOOLEAN DEFAULT false,
    total_duration_minutes INTEGER DEFAULT 0,
    difficulty_level INTEGER DEFAULT 1,
    prerequisites JSONB DEFAULT '[]',
    auto_assign_rules JSONB DEFAULT '{}',
    target_departments VARCHAR[] DEFAULT '{}',
    target_roles VARCHAR[] DEFAULT '{}',
    target_compliance_profiles INTEGER[] DEFAULT '{}',
    recurrence_type VARCHAR(50) DEFAULT 'once',
    recurrence_interval INTEGER DEFAULT 1,
    grace_period_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Program Content Mapping
CREATE TABLE IF NOT EXISTS training_program_content (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES training_content(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    minimum_score INTEGER,
    requires_certification BOOLEAN DEFAULT false,
    estimated_duration_minutes INTEGER,
    UNIQUE(program_id, content_id),
    UNIQUE(program_id, sequence_order)
);

-- Employee Training Assignments
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES employees(id),
    assignment_reason VARCHAR(100),
    assignment_source VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    grace_period_end TIMESTAMP,
    compliance_requirement VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'assigned',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    exemption_reason TEXT,
    exemption_approved_by INTEGER REFERENCES employees(id),
    progress_percentage INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    completion_attempts INTEGER DEFAULT 0,
    final_score INTEGER,
    passing_score INTEGER,
    completion_time_minutes INTEGER,
    certification_earned BOOLEAN DEFAULT false,
    certificate_id VARCHAR(255),
    UNIQUE(employee_id, program_id)
);

-- Employee Content Progress
CREATE TABLE IF NOT EXISTS training_content_progress (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES training_content(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    score INTEGER,
    max_score INTEGER,
    attempts_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    interaction_data JSONB DEFAULT '{}',
    employee_notes TEXT,
    employee_rating INTEGER,
    employee_feedback TEXT,
    UNIQUE(assignment_id, content_id)
);

-- Training Compliance Requirements
CREATE TABLE IF NOT EXISTS training_compliance_requirements (
    id SERIAL PRIMARY KEY,
    regulation_code VARCHAR(50) NOT NULL,
    requirement_section VARCHAR(100),
    requirement_title VARCHAR(255),
    requirement_description TEXT,
    required_frequency VARCHAR(50),
    grace_period_days INTEGER DEFAULT 30,
    minimum_training_hours DECIMAL(4,2),
    requires_certification BOOLEAN DEFAULT false,
    requires_assessment BOOLEAN DEFAULT true,
    minimum_passing_score INTEGER DEFAULT 80,
    applies_to_departments VARCHAR[] DEFAULT '{}',
    applies_to_roles VARCHAR[] DEFAULT '{}',
    applies_to_data_classifications VARCHAR[] DEFAULT '{}',
    recommended_programs INTEGER[] DEFAULT '{}',
    mandatory_programs INTEGER[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    effective_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Training Certificates
CREATE TABLE IF NOT EXISTS training_certificates (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(255) UNIQUE NOT NULL,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES training_programs(id),
    assignment_id INTEGER REFERENCES training_assignments(id),
    certificate_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) DEFAULT 'SecureWatch',
    certificate_type VARCHAR(50),
    regulation_compliance VARCHAR[] DEFAULT '{}',
    compliance_period_months INTEGER,
    issued_date TIMESTAMP DEFAULT NOW(),
    valid_from TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    earned_score INTEGER,
    required_score INTEGER,
    certificate_file_url VARCHAR(500),
    certificate_metadata JSONB DEFAULT '{}',
    verification_hash VARCHAR(255),
    is_verified BOOLEAN DEFAULT true,
    verification_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    revocation_reason TEXT,
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES employees(id)
);

-- Training Notifications
CREATE TABLE IF NOT EXISTS training_notifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES training_assignments(id),
    program_id INTEGER REFERENCES training_programs(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    delivery_method VARCHAR(50) DEFAULT 'in_app',
    scheduled_for TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    action_taken VARCHAR(100),
    notification_data JSONB DEFAULT '{}'
);

-- AI Training Content Generation Log
CREATE TABLE IF NOT EXISTS ai_training_generation_log (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES training_content(id),
    requested_by INTEGER REFERENCES employees(id),
    generation_type VARCHAR(50),
    ai_model VARCHAR(100),
    prompt_template VARCHAR(255),
    full_prompt TEXT,
    generation_parameters JSONB DEFAULT '{}',
    regulation_focus VARCHAR[] DEFAULT '{}',
    target_audience VARCHAR(100),
    difficulty_level INTEGER,
    estimated_duration INTEGER,
    content_type VARCHAR(50),
    generated_content TEXT,
    generation_success BOOLEAN DEFAULT false,
    error_message TEXT,
    content_quality_score INTEGER,
    regulation_accuracy_score INTEGER,
    readability_score INTEGER,
    engagement_prediction INTEGER,
    human_review_status VARCHAR(50) DEFAULT 'pending',
    reviewer_id INTEGER REFERENCES employees(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    times_used INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0,
    average_user_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_program ON training_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_due_date ON training_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_content_progress_assignment ON training_content_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_employee ON training_content_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_content ON training_content_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_regulation ON training_compliance_requirements(regulation_code);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_frequency ON training_compliance_requirements(required_frequency);
CREATE INDEX IF NOT EXISTS idx_certificates_employee ON training_certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_certificates_program ON training_certificates(program_id);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON training_certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_certificates_regulation ON training_certificates USING GIN (regulation_compliance);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON training_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON training_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON training_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_model ON ai_training_generation_log(ai_model);
CREATE INDEX IF NOT EXISTS idx_ai_generation_type ON ai_training_generation_log(generation_type);
CREATE INDEX IF NOT EXISTS idx_ai_generation_review ON ai_training_generation_log(human_review_status);
CREATE INDEX IF NOT EXISTS idx_training_content_regulations ON training_content USING GIN (applicable_regulations);
CREATE INDEX IF NOT EXISTS idx_training_programs_regulations ON training_programs USING GIN (applicable_regulations);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status_due ON training_assignments (status, due_date);
CREATE INDEX IF NOT EXISTS idx_training_content_ai_generated ON training_content (ai_generated, ai_review_status);

-- Training Analytics Views
CREATE OR REPLACE VIEW employee_training_compliance AS
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.department,
    e.compliance_profile_id,
    COUNT(ta.id) as total_assignments,
    COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments,
    COUNT(CASE WHEN ta.status = 'overdue' THEN 1 END) as overdue_assignments,
    COUNT(CASE WHEN ta.due_date < NOW() AND ta.status != 'completed' THEN 1 END) as past_due_assignments,
    COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END) as mandatory_assignments,
    COUNT(CASE WHEN tp.is_mandatory = true AND ta.status = 'completed' THEN 1 END) as completed_mandatory,
    COUNT(tc.id) as total_certificates,
    COUNT(CASE WHEN tc.expires_at > NOW() OR tc.expires_at IS NULL THEN 1 END) as valid_certificates,
    COUNT(CASE WHEN tc.expires_at <= NOW() THEN 1 END) as expired_certificates,
    CASE 
        WHEN COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END) > 0 
        THEN ROUND(
            (COUNT(CASE WHEN tp.is_mandatory = true AND ta.status = 'completed' THEN 1 END)::DECIMAL / 
             COUNT(CASE WHEN tp.is_mandatory = true THEN 1 END)) * 100, 2
        )
        ELSE 100
    END as compliance_percentage,
    MAX(ta.last_accessed_at) as last_training_activity,
    MAX(tc.issued_date) as last_certificate_earned
FROM employees e
LEFT JOIN training_assignments ta ON e.id = ta.employee_id
LEFT JOIN training_programs tp ON ta.program_id = tp.id
LEFT JOIN training_certificates tc ON e.id = tc.employee_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.department, e.compliance_profile_id;

-- Comments
COMMENT ON TABLE training_categories IS 'Categorize training content by topic and regulation';
COMMENT ON TABLE training_content IS 'Store all training materials including AI-generated content';
COMMENT ON TABLE training_programs IS 'Structured training programs combining multiple content pieces';
COMMENT ON TABLE training_assignments IS 'Track training assignments to employees with compliance context';
COMMENT ON TABLE training_compliance_requirements IS 'Map regulation requirements to training needs';
COMMENT ON TABLE training_certificates IS 'Track earned certificates and compliance credentials';
COMMENT ON TABLE ai_training_generation_log IS 'Log AI-generated training content for analysis'; 