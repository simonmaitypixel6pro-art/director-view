-- Add google_id column to students table for Google OAuth integration
ALTER TABLE students ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_google_id ON students(google_id);
CREATE INDEX IF NOT EXISTS idx_students_auth_provider ON students(auth_provider);
