-- Fix infinite recursion between projects and project_members RLS policies (v2).
--
-- Root cause:
--   projects policy "Managers can read member projects" queries project_members.
--   project_members policy "Project members can read projects" queries projects.
--
-- Previous fix used SECURITY DEFINER helpers that still queried projects, which can
-- re-enter projects RLS in some PostgreSQL/Supabase configurations.
--
-- This migration breaks the cycle by:
--   1. Removing helpers that query projects
--   2. Using profiles hierarchy only in project_members policies (never projects)
--   3. Using project_members + profiles only in the projects member-access policy

drop function if exists public.is_project_manager_for_project(uuid, uuid);
drop function if exists public.is_team_lead_for_project(uuid, uuid);
drop function if exists public.manager_has_member_on_project(uuid, uuid);

drop policy if exists "Project members can read projects" on project_members;
drop policy if exists "Managers and team leads can read managed intern memberships" on project_members;
create policy "Managers and team leads can read managed intern memberships"
on project_members
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles member_profile
    where member_profile.id = project_members.user_id
      and member_profile.manager_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles member_profile
    inner join public.profiles pm_profile on pm_profile.id = member_profile.manager_id
    where member_profile.id = project_members.user_id
      and pm_profile.manager_id = auth.uid()
  )
);

drop policy if exists "Managers can read member projects" on projects;
create policy "Managers can read member projects"
on projects
for select
to authenticated
using (
  exists (
    select 1
    from public.project_members pm
    inner join public.profiles member_profile on member_profile.id = pm.user_id
    where pm.project_id = projects.id
      and member_profile.manager_id = auth.uid()
  )
);
