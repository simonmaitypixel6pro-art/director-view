-- Add Director user to admins table
INSERT INTO public.admins (username, password, role, created_at)
VALUES ('director', 'director123', 'director', NOW())
ON CONFLICT (username) DO UPDATE
SET role = 'director', password = 'director123'
WHERE admins.username = 'director';

-- Verify the insert
SELECT id, username, role FROM public.admins WHERE username = 'director';
