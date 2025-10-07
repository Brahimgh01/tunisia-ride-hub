-- Check all users with this email and their status
SELECT id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data
FROM auth.users 
WHERE email = 'brahimghaouar10@gmail.com'
ORDER BY created_at DESC;