-- Allow project managers to assign/remove their interns on projects they manage.
-- IMPORTANT: never query projects from project_members policies under RLS —
-- that causes infinite recursion with projects policies that read project_members.
-- Use public.pm_owns_project() (SECURITY DEFINER) instead.

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

drop policy if exists "Managers can read member projects" on projects;

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
    from profiles p
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
    from profiles p
    where p.id = project_members.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
  and public.pm_owns_project(project_members.project_id)
);
