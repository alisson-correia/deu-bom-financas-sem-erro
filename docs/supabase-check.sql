-- Read-only: run with authorized metadata access in Supabase SQL Editor.
-- This file has NOT been executed against the database.
WITH expected(name) AS (VALUES
 ('budgets'), ('categories'), ('event_items'), ('event_participants'),
 ('events'), ('profiles'), ('transactions'), ('workspace_invitations'),
 ('workspace_members'), ('workspaces'))
SELECT e.name, c.oid IS NOT NULL AS table_exists,
 c.relrowsecurity AS rls_enabled,
 (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=e.name) AS policy_count
FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(format('public.%I',e.name))
ORDER BY e.name;

SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN
 ('budgets','categories','event_items','event_participants','events','profiles',
 'transactions','workspace_invitations','workspace_members','workspaces')
ORDER BY table_name,ordinal_position;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
 p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='update_workspace_name';

SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename,policyname;
