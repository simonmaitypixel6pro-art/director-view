-- Step 1: Drop the existing CHECK constraint on admins table
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;

-- Step 2: Add new CHECK constraint that includes 'director' role
ALTER TABLE admins 
ADD CONSTRAINT admins_role_check 
CHECK (role IN ('super_admin', 'course_admin', 'director', 'personnel'));

-- Step 3: Insert the director user
INSERT INTO admins (username, password, role) 
VALUES ('director', 'director123', 'director')
ON CONFLICT (username) DO UPDATE SET role = 'director', password = 'director123';

-- Step 4: Verify the director was created
SELECT id, username, password, role, created_at FROM admins WHERE username = 'director';

-- Step 5: Show all admins with their roles
SELECT id, username, role FROM admins ORDER BY id;
