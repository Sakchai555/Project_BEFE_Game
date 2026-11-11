-- Run after a user has registered and confirmed their email.
-- Replace the example email with the account that should become the first admin.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where email = 'replace-with-admin-email@example.com';

-- The user must sign out and sign in again so Supabase issues a token with the new app_metadata claim.
