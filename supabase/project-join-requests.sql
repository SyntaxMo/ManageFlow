-- Project join requests + PM project management policies
-- Run this entire script in the Supabase SQL Editor (one shot).
-- Reuses existing projects / project_members / profiles / teams tables.

-- ---------------------------------------------------------------------------
-- 1) Optional team linkage on projects
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists projects_team_id_idx
  on public.projects (team_id);

create index if not exists projects_manager_id_idx
  on public.projects (manager_id);

-- Case-insensitive unique project name per PM (trim whitespace).
-- Skipped automatically if duplicate names already exist for the same PM.
do $$
begin
  if not exists (
    select 1
    from public.projects
    where manager_id is not null
    group by manager_id, lower(btrim(name))
    having count(*) > 1
  ) then
    create unique index if not exists projects_manager_name_unique_idx
      on public.projects (manager_id, lower(btrim(name)))
      where manager_id is not null;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Join request status enum + table
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'project_join_request_status'
      and n.nspname = 'public'
  ) then
    create type public.project_join_request_status as enum (
      'pending',
      'accepted',
      'declined'
    );
  end if;
end
$$;

create table if not exists public.project_join_requests (
  id uuid primary key default gen_random_uuid(),
  intern_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  pm_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status public.project_join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists project_join_requests_pm_status_idx
  on public.project_join_requests (pm_id, status);

create index if not exists project_join_requests_intern_status_idx
  on public.project_join_requests (intern_id, status);

create index if not exists project_join_requests_project_id_idx
  on public.project_join_requests (project_id);

-- One active (pending) request per intern + project
create unique index if not exists project_join_requests_pending_unique_idx
  on public.project_join_requests (intern_id, project_id)
  where status = 'pending';

drop trigger if exists update_project_join_requests_updated_at on public.project_join_requests;
create trigger update_project_join_requests_updated_at
before update on public.project_join_requests
for each row
execute function public.update_updated_at_column();

alter table public.project_join_requests enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Helper: active/joinable project statuses
-- ---------------------------------------------------------------------------

create or replace function public.is_joinable_project_status(p_status public.project_status)
returns boolean
language sql
immutable
as $$
  select p_status in ('planning', 'active', 'in_progress', 'under_review');
$$;

-- ---------------------------------------------------------------------------
-- 4) PM project create / update policies
-- ---------------------------------------------------------------------------

drop policy if exists "Project managers can create own projects" on public.projects;
create policy "Project managers can create own projects"
on public.projects for insert to authenticated
with check (
  public.get_current_user_role() = 'project_manager'
  and manager_id = auth.uid()
);

drop policy if exists "Project managers can update own projects" on public.projects;
create policy "Project managers can update own projects"
on public.projects for update to authenticated
using (
  public.get_current_user_role() = 'project_manager'
  and manager_id = auth.uid()
)
with check (
  public.get_current_user_role() = 'project_manager'
  and manager_id = auth.uid()
);

-- Interns can browse joinable projects owned by active PMs
drop policy if exists "Interns can browse joinable projects" on public.projects;
create policy "Interns can browse joinable projects"
on public.projects for select to authenticated
using (
  public.get_current_user_role() = 'intern'
  and public.is_joinable_project_status(status)
  and manager_id is not null
  and exists (
    select 1
    from public.profiles pm
    where pm.id = projects.manager_id
      and pm.role = 'project_manager'
      and pm.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- 5) Interns can read active project managers (for join selection)
-- ---------------------------------------------------------------------------

drop policy if exists "Interns can read active project managers" on public.profiles;
create policy "Interns can read active project managers"
on public.profiles for select to authenticated
using (
  public.get_current_user_role() = 'intern'
  and role = 'project_manager'
  and status = 'active'
);

-- PMs can read intern profiles who requested their projects
drop policy if exists "PMs can read project join request interns" on public.profiles;
create policy "PMs can read project join request interns"
on public.profiles for select to authenticated
using (
  public.get_current_user_role() = 'project_manager'
  and exists (
    select 1
    from public.project_join_requests r
    where r.intern_id = profiles.id
      and r.pm_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 6) project_join_requests RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Interns can read own project join requests" on public.project_join_requests;
create policy "Interns can read own project join requests"
on public.project_join_requests for select to authenticated
using (
  intern_id = auth.uid()
  or pm_id = auth.uid()
  or public.get_current_user_role() = 'admin'
);

drop policy if exists "Interns can create own project join requests" on public.project_join_requests;
create policy "Interns can create own project join requests"
on public.project_join_requests for insert to authenticated
with check (
  intern_id = auth.uid()
  and public.get_current_user_role() = 'intern'
  and status = 'pending'
  and exists (
    select 1
    from public.projects p
    join public.profiles pm on pm.id = p.manager_id
    where p.id = project_join_requests.project_id
      and p.manager_id = project_join_requests.pm_id
      and public.is_joinable_project_status(p.status)
      and pm.role = 'project_manager'
      and pm.status = 'active'
      and (p.team_id is null or p.team_id = project_join_requests.team_id)
      and (pm.team_id is null or pm.team_id = project_join_requests.team_id)
  )
  and not exists (
    select 1
    from public.project_members m
    where m.project_id = project_join_requests.project_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "PMs can update own project join requests" on public.project_join_requests;
create policy "PMs can update own project join requests"
on public.project_join_requests for update to authenticated
using (
  pm_id = auth.uid()
  and public.get_current_user_role() = 'project_manager'
)
with check (
  pm_id = auth.uid()
  and public.get_current_user_role() = 'project_manager'
);

-- ---------------------------------------------------------------------------
-- 7) Accept / decline via SECURITY DEFINER (sets manager + membership atomically)
-- ---------------------------------------------------------------------------

create or replace function public.respond_to_project_join_request(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.project_join_requests%rowtype;
  v_project public.projects%rowtype;
  v_decision public.project_join_request_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined';
  end if;

  v_decision := p_decision::public.project_join_request_status;

  select *
  into v_request
  from public.project_join_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Join request not found';
  end if;

  if v_request.pm_id <> auth.uid() then
    raise exception 'You are not authorized to decide this request';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This request has already been decided';
  end if;

  select *
  into v_project
  from public.projects
  where id = v_request.project_id;

  if not found then
    raise exception 'Project not found';
  end if;

  if v_project.manager_id <> auth.uid() then
    raise exception 'You can only decide requests for your own projects';
  end if;

  if v_decision = 'declined' then
    update public.project_join_requests
    set status = 'declined',
        decided_at = now()
    where id = v_request.id;
    return;
  end if;

  -- Accept: associate intern with PM + team, then add membership
  update public.profiles
  set manager_id = v_request.pm_id,
      team_id = coalesce(v_request.team_id, profiles.team_id),
      updated_at = now()
  where id = v_request.intern_id
    and role = 'intern';

  if not found then
    raise exception 'Intern profile not found';
  end if;

  insert into public.project_members (project_id, user_id, role_in_project)
  values (v_request.project_id, v_request.intern_id, 'intern')
  on conflict (project_id, user_id) do nothing;

  -- Keep hierarchy in sync when the pair is not already present
  insert into public.manager_hierarchy (manager_id, user_id, relationship_type)
  select v_request.pm_id, v_request.intern_id, 'direct'
  where not exists (
    select 1
    from public.manager_hierarchy mh
    where mh.manager_id = v_request.pm_id
      and mh.user_id = v_request.intern_id
  );

  update public.project_join_requests
  set status = 'accepted',
      decided_at = now()
  where id = v_request.id;

  -- Auto-decline other pending requests for this intern on other projects
  update public.project_join_requests
  set status = 'declined',
      decided_at = now()
  where intern_id = v_request.intern_id
    and id <> v_request.id
    and status = 'pending';
end;
$$;

revoke all on function public.respond_to_project_join_request(uuid, text) from public;
grant execute on function public.respond_to_project_join_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Allow membership insert when accepting via RPC (already security definer)
--    Also allow PM insert when intern manager_id was just set in same txn.
--    Existing "Managers can assign interns to projects" remains for manual ops.
-- ---------------------------------------------------------------------------

-- Verify:
-- select tablename, policyname, cmd
-- from pg_policies
-- where tablename in ('projects', 'project_members', 'project_join_requests')
-- order by tablename, policyname;
