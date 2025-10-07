-- This query doesn't change the database structure, 
-- but the user needs to go to Supabase dashboard to disable email confirmation
-- Authentication > Settings > Enable email confirmations = OFF

-- For now, let's check if there are any users that need to be confirmed
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'brahimghaouar10@gmail.com'
ORDER BY created_at DESC;