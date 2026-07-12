-- Fix infinite recursion between projects <-> project_members RLS.
--
-- Cause:
--   project_members INSERT/DELETE policies queried projects directly.
--   projects "Managers can read member projects" queried project_members.
--   Postgres then recursed evaluating those policies.
--
-- Fix:
--   1. Use SECURITY DEFINER helpers (bypass RLS) for ownership checks
--   2. Drop the recursive projects SELECT policy (manager_id policy already covers PM-owned projects)
--   3. Recreate assign/remove policies without querying projects under RLS

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

revoke all on function public.pm_owns_project(uuid) from public;
grant execute on function public.pm_owns_project(uuid) to authenticated;

-- This policy is redundant with "Users can read projects they own or manage"
-- (manager_id = auth.uid()) and is the projects-side half of the recursion.
drop policy if exists "Managers can read member projects" on projects;

-- Keep an explicit own-projects policy (safe, no cross-table RLS).
drop policy if exists "Managers can read own managed projects" on projects;
create policy "Managers can read own managed projects"
on projects for select to authenticated
using (manager_id = auth.uid());

drop policy if exists "Managers can assign interns to projects" on project_members;
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

drop policy if exists "Managers can remove interns from projects" on project_members;
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
