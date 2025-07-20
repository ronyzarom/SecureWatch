-- Fix missing tables for authentication to work

-- Create training_assignments table (needed by auth middleware)
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES employees(id),
    assigned_date TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'overdue'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    score INTEGER,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_program ON training_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);

-- Insert some sample categories if they don't exist
INSERT INTO training_categories (name, description, applicable_regulations, icon, color, priority) 
VALUES 
('Security Awareness', 'General security training and awareness', ARRAY['gdpr', 'hipaa'], 'shield', 'blue', 5),
('Compliance Training', 'Regulatory compliance and legal requirements', ARRAY['sox', 'pci_dss'], 'book', 'green', 4),
('Data Protection', 'Data privacy and protection training', ARRAY['gdpr', 'ccpa'], 'lock', 'purple', 3)
ON CONFLICT DO NOTHING;
