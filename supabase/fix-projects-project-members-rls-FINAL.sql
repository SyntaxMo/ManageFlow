-- NUCLEAR FIX: projects <-> project_members infinite recursion
-- Run this entire script in Supabase SQL Editor (one shot).
-- Matches live schema: projects + project_members as provided.

-- ---------------------------------------------------------------------------
-- 1) Helpers that BYPASS RLS (SECURITY DEFINER). Safe for policy expressions.
-- ---------------------------------------------------------------------------

create or replace function public.pm_owns_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and manager_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.manages_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- True when the current user manages at least one intern on this project.
  select exists (
    select 1
    from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = p_project_id
      and p.manager_id = auth.uid()
  );
$$;

revoke all on function public.pm_owns_project(uuid) from public;
revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.manages_project_member(uuid) from public;
grant execute on function public.pm_owns_project(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.manages_project_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Drop EVERY known recursive / overlapping policy on these two tables
-- ---------------------------------------------------------------------------

-- projects
drop policy if exists "Users can read projects they own or manage" on projects;
drop policy if exists "Admins can read all projects" on projects;
drop policy if exists "Team leads can read supervised projects" on projects;
drop policy if exists "Managers can read member projects" on projects;
drop policy if exists "Managers can read own managed projects" on projects;
drop policy if exists "Project members can read assigned projects" on projects;
drop policy if exists "Members can read their projects" on projects;

-- project_members
drop policy if exists "Users can read own project memberships" on project_members;
drop policy if exists "Project members can read projects" on project_members;
drop policy if exists "Managers and team leads can read managed intern memberships" on project_members;
drop policy if exists "Managers can assign interns to projects" on project_members;
drop policy if exists "Managers can remove interns from projects" on project_members;
drop policy if exists "Admins can manage project members" on project_members;

-- ---------------------------------------------------------------------------
-- 3) Recreate SAFE policies (no projects <-> project_members RLS cross-query)
-- ---------------------------------------------------------------------------

-- PROJECTS SELECT
create policy "Users can read projects they own or manage"
on projects for select to authenticated
using (
  owner_id = auth.uid()
  or team_lead_id = auth.uid()
  or manager_id = auth.uid()
  or public.get_current_user_role() = 'admin'
);

create policy "Members can read their projects"
on projects for select to authenticated
using (public.is_project_member(id));

create policy "Managers can read projects of managed interns"
on projects for select to authenticated
using (public.manages_project_member(id));

-- PROJECT_MEMBERS SELECT
create policy "Users can read own project memberships"
on project_members for select to authenticated
using (user_id = auth.uid());

create policy "Managers and team leads can read managed intern memberships"
on project_members for select to authenticated
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
    join public.profiles pm_profile on pm_profile.id = member_profile.manager_id
    where member_profile.id = project_members.user_id
      and pm_profile.manager_id = auth.uid()
  )
);

-- PROJECT_MEMBERS INSERT / DELETE (PM assign/remove)
create policy "Managers can assign interns to projects"
on project_members for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = project_members.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
  and public.pm_owns_project(project_members.project_id)
);

create policy "Managers can remove interns from projects"
on project_members for delete to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = project_members.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
  and public.pm_owns_project(project_members.project_id)
);

-- Verify after running:
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where tablename in ('projects', 'project_members')
-- order by tablename, policyname;
--
-- None of the policy expressions should contain a bare subquery on the
-- OTHER table (projects policy should not SELECT FROM project_members,
-- and project_members policy should not SELECT FROM projects).
-- Helper functions pm_owns_project / is_project_member / manages_project_member are OK.