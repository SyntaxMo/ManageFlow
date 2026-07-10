create type user_role as enum (
  'admin',
  'senior_manager',
  'team_lead',
  'project_manager',
  'employee',
  'intern'
);

create type user_status as enum (
  'active',
  'inactive',
  'pending'
);

create type schedule_status as enum (
  'pending',
  'approved',
  'rejected',
  'active',
  'inactive'
);

create type check_in_status as enum (
  'scheduled',
  'checked_in',
  'completed',
  'late',
  'absent',
  'missed_checkout'
);

create type project_status as enum (
  'planning',
  'active',
  'in_progress',
  'under_review',
  'completed',
  'delayed',
  'archived'
);

create type priority_level as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type timeline_item_type as enum (
  'milestone',
  'task_deadline',
  'meeting',
  'review',
  'playtest',
  'report',
  'status_update'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  role user_role not null default 'intern',
  team_id uuid,
  department_id uuid,
  manager_id uuid references profiles(id) on delete set null,
  job_title text,
  status user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  department_id uuid references departments(id) on delete set null,
  lead_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
add constraint profiles_team_id_fkey
foreign key (team_id) references teams(id) on delete set null;

alter table profiles
add constraint profiles_department_id_fkey
foreign key (department_id) references departments(id) on delete set null;

create table manager_hierarchy (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  relationship_type text not null,
  created_at timestamptz not null default now(),
  unique(manager_id, user_id)
);

create table work_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  total_weekly_hours numeric(5,2) not null default 0,
  status schedule_status not null default 'pending',
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_weekly_hours >= 0),
  unique(user_id)
);

create table work_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references work_schedules(id) on delete cascade,
  day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  calculated_hours numeric(5,2) not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (calculated_hours > 0)
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  schedule_id uuid references work_schedules(id) on delete set null,
  check_in_date date not null default current_date,
  scheduled_start_time time,
  scheduled_end_time time,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  status check_in_status not null default 'scheduled',
  total_worked_hours numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, check_in_date)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references profiles(id) on delete set null,
  team_lead_id uuid references profiles(id) on delete set null,
  manager_id uuid references profiles(id) on delete set null,
  status project_status not null default 'planning',
  priority priority_level not null default 'medium',
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  start_date date,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role_in_project text,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table project_timeline_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  type timeline_item_type not null,
  date date not null,
  created_by uuid references profiles(id) on delete set null,
  related_task_id uuid,
  related_meeting_id uuid,
  related_report_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on profiles
for each row
execute function update_updated_at_column();

create trigger update_departments_updated_at
before update on departments
for each row
execute function update_updated_at_column();

create trigger update_teams_updated_at
before update on teams
for each row
execute function update_updated_at_column();

create trigger update_work_schedules_updated_at
before update on work_schedules
for each row
execute function update_updated_at_column();

create trigger update_check_ins_updated_at
before update on check_ins
for each row
execute function update_updated_at_column();

create trigger update_projects_updated_at
before update on projects
for each row
execute function update_updated_at_column();

create trigger update_project_timeline_items_updated_at
before update on project_timeline_items
for each row
execute function update_updated_at_column();

alter table profiles enable row level security;
alter table departments enable row level security;
alter table teams enable row level security;
alter table manager_hierarchy enable row level security;
alter table work_schedules enable row level security;
alter table work_schedule_blocks enable row level security;
alter table check_ins enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_timeline_items enable row level security;
alter table activity_logs enable row level security;

create or replace function public.get_current_user_role()
returns user_role
language sql
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create policy "Users can read own profile"
on profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read all profiles"
on profiles
for select
to authenticated
using (public.get_current_user_role() = 'admin');

create policy "Admins can update all profiles"
on profiles
for update
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Authenticated users can read departments"
on departments
for select
to authenticated
using (true);

create policy "Authenticated users can read teams"
on teams
for select
to authenticated
using (true);

create policy "Admins can manage departments"
on departments
for all
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Admins can manage teams"
on teams
for all
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Users can read hierarchy related to them"
on manager_hierarchy
for select
to authenticated
using (manager_id = auth.uid() or user_id = auth.uid());

create policy "Admins can manage hierarchy"
on manager_hierarchy
for all
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Users can read own schedule"
on work_schedules
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own schedule"
on work_schedules
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own pending schedule"
on work_schedules
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage all schedules"
on work_schedules
for all
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Users can read own schedule blocks"
on work_schedule_blocks
for select
to authenticated
using (
  exists (
    select 1 from work_schedules
    where work_schedules.id = work_schedule_blocks.schedule_id
    and work_schedules.user_id = auth.uid()
  )
);

create policy "Users can insert own schedule blocks"
on work_schedule_blocks
for insert
to authenticated
with check (
  exists (
    select 1 from work_schedules
    where work_schedules.id = work_schedule_blocks.schedule_id
    and work_schedules.user_id = auth.uid()
  )
);

create policy "Users can read own check ins"
on check_ins
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own check ins"
on check_ins
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own check ins"
on check_ins
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can manage all check ins"
on check_ins
for all
to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

create policy "Users can read projects they own or manage"
on projects
for select
to authenticated
using (
  owner_id = auth.uid()
  or team_lead_id = auth.uid()
  or manager_id = auth.uid()
);

create policy "Admins can read all projects"
on projects
for select
to authenticated
using (public.get_current_user_role() = 'admin');

create policy "Users can read own project memberships"
on project_members
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can read project timeline if directly linked"
on project_timeline_items
for select
to authenticated
using (
  exists (
    select 1 from projects
    where projects.id = project_timeline_items.project_id
    and (
      projects.owner_id = auth.uid()
      or projects.team_lead_id = auth.uid()
      or projects.manager_id = auth.uid()
    )
  )
  or exists (
    select 1 from project_members
    where project_members.project_id = project_timeline_items.project_id
    and project_members.user_id = auth.uid()
  )
);

create policy "Users can read own activity logs"
on activity_logs
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can read all activity logs"
on activity_logs
for select
to authenticated
using (public.get_current_user_role() = 'admin');

create policy "Authenticated users can create activity logs"
on activity_logs
for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);
