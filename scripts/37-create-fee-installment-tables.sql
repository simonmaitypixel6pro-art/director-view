-- Create fee installment plans table
CREATE TABLE IF NOT EXISTS fee_installment_plans (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  fee_type VARCHAR(50) NOT NULL, -- 'semester', 'exam', or 'both'
  total_amount NUMERIC NOT NULL,
  plan_type VARCHAR(50) NOT NULL, -- '2_installments', '3_installments', 'custom'
  status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'completed', 'cancelled'
  approved_by_admin_id INTEGER REFERENCES admins(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, semester, fee_type)
);

-- Create fee installments table
CREATE TABLE IF NOT EXISTS fee_installments (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES fee_installment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_at TIMESTAMP,
  payment_transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_fee_installment_plans_student ON fee_installment_plans(student_id);
CREATE INDEX idx_fee_installment_plans_semester ON fee_installment_plans(semester);
CREATE INDEX idx_fee_installment_plans_status ON fee_installment_plans(status);
CREATE INDEX idx_fee_installments_plan ON fee_installments(plan_id);
CREATE INDEX idx_fee_installments_status ON fee_installments(status);
