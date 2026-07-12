-- DEPRECATED: Do not re-run this file.
-- It re-creates "Managers can read member projects" which queries project_members
-- under RLS and causes infinite recursion with project_members policies that
-- touch projects.
--
-- Use instead: supabase/fix-projects-project-members-rls-FINAL.sql

select 'Use fix-projects-project-members-rls-FINAL.sql instead' as notice;
