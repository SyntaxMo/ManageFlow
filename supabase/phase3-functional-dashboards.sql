-- Phase 3: Daily report template fields and performance indexes
-- Run this in Supabase SQL Editor before testing daily report submission.

alter table daily_reports
add column if not exists template_id uuid references templates(id) on delete set null;

alter table daily_reports
add column if not exists form_data jsonb not null default '{}'::jsonb;

alter table daily_reports
add column if not exists work_mode text;

alter table daily_reports
add column if not exists working_time_start time;

alter table daily_reports
add column if not exists working_time_end time;

alter table daily_reports
add column if not exists total_hours numeric(5,2);

alter table daily_reports
add column if not exists submission_links text;

alter table daily_reports
add column if not exists notes text;

alter table daily_reports
add column if not exists member_confirmed boolean not null default false;

alter table daily_reports
add column if not exists signature text;

create index if not exists idx_daily_reports_user_date
on daily_reports(user_id, report_date);

create index if not exists idx_daily_reports_review_status
on daily_reports(review_status);

create index if not exists idx_daily_reports_template_id
on daily_reports(template_id);

create index if not exists idx_check_ins_user_date
on check_ins(user_id, check_in_date);

create index if not exists idx_meeting_requests_requested_by
on meeting_requests(requested_by);

create index if not exists idx_meeting_requests_requested_with
on meeting_requests(requested_with);

create index if not exists idx_project_members_user_id
on project_members(user_id);

create index if not exists idx_tasks_assigned_to
on tasks(assigned_to);

-- ---------------------------------------------------------------------------
-- Phase 3 RLS policies (required for dashboards to read team data)
-- ---------------------------------------------------------------------------

alter table universities enable row level security;
alter table intern_training_details enable row level security;
alter table daily_reports enable row level security;
alter table meeting_requests enable row level security;
alter table tasks enable row level security;
alter table templates enable row level security;

drop policy if exists "Authenticated users can read universities" on universities;
create policy "Authenticated users can read universities"
on universities for select to authenticated using (true);

drop policy if exists "Users can read own training details" on intern_training_details;
create policy "Users can read own training details"
on intern_training_details for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own training details" on intern_training_details;
create policy "Users can insert own training details"
on intern_training_details for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can manage training details" on intern_training_details;
create policy "Admins can manage training details"
on intern_training_details for all to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

drop policy if exists "Managers can read managed profiles" on profiles;
create policy "Managers can read managed profiles"
on profiles for select to authenticated
using (
  manager_id = auth.uid()
  or exists (
    select 1 from profiles pm
    where pm.id = profiles.manager_id
    and pm.manager_id = auth.uid()
  )
);

drop policy if exists "Users can read own daily reports" on daily_reports;
create policy "Users can read own daily reports"
on daily_reports for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own daily reports" on daily_reports;
create policy "Users can insert own daily reports"
on daily_reports for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Managers can read team daily reports" on daily_reports;
create policy "Managers can read team daily reports"
on daily_reports for select to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = daily_reports.user_id
    and (
      p.manager_id = auth.uid()
      or exists (
        select 1 from profiles pm
        where pm.id = p.manager_id
        and pm.manager_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Managers can update team daily reports" on daily_reports;
create policy "Managers can update team daily reports"
on daily_reports for update to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = daily_reports.user_id
    and p.manager_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.id = daily_reports.user_id
    and p.manager_id = auth.uid()
  )
);

drop policy if exists "Admins can manage all daily reports" on daily_reports;
create policy "Admins can manage all daily reports"
on daily_reports for all to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

drop policy if exists "Users can read own meeting requests" on meeting_requests;
create policy "Users can read own meeting requests"
on meeting_requests for select to authenticated
using (requested_by = auth.uid() or requested_with = auth.uid());

drop policy if exists "Users can create meeting requests" on meeting_requests;
create policy "Users can create meeting requests"
on meeting_requests for insert to authenticated
with check (requested_by = auth.uid());

drop policy if exists "Managers can update meeting requests" on meeting_requests;
create policy "Managers can update meeting requests"
on meeting_requests for update to authenticated
using (requested_with = auth.uid() or requested_by = auth.uid())
with check (requested_with = auth.uid() or requested_by = auth.uid());

drop policy if exists "Admins can manage all meeting requests" on meeting_requests;
create policy "Admins can manage all meeting requests"
on meeting_requests for all to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

drop policy if exists "Users can read own tasks" on tasks;
create policy "Users can read own tasks"
on tasks for select to authenticated
using (assigned_to = auth.uid());

drop policy if exists "Managers can read team tasks" on tasks;
create policy "Managers can read team tasks"
on tasks for select to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = tasks.assigned_to
    and (
      p.manager_id = auth.uid()
      or exists (
        select 1 from profiles pm
        where pm.id = p.manager_id
        and pm.manager_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Admins can manage all tasks" on tasks;
create policy "Admins can manage all tasks"
on tasks for all to authenticated
using (public.get_current_user_role() = 'admin')
with check (public.get_current_user_role() = 'admin');

drop policy if exists "Authenticated users can read templates" on templates;
create policy "Authenticated users can read templates"
on templates for select to authenticated using (true);

drop policy if exists "Managers can read team check ins" on check_ins;
create policy "Managers can read team check ins"
on check_ins for select to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = check_ins.user_id
    and (
      p.manager_id = auth.uid()
      or exists (
        select 1 from profiles pm
        where pm.id = p.manager_id
        and pm.manager_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Managers can read team schedule blocks" on work_schedule_blocks;
create policy "Managers can read team schedule blocks"
on work_schedule_blocks for select to authenticated
using (
  exists (
    select 1 from work_schedules ws
    join profiles p on p.id = ws.user_id
    where ws.id = work_schedule_blocks.schedule_id
    and (
      p.manager_id = auth.uid()
      or exists (
        select 1 from profiles pm
        where pm.id = p.manager_id
        and pm.manager_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Managers can read team schedules" on work_schedules;
create policy "Managers can read team schedules"
on work_schedules for select to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = work_schedules.user_id
    and (
      p.manager_id = auth.uid()
      or exists (
        select 1 from profiles pm
        where pm.id = p.manager_id
        and pm.manager_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Team leads can read supervised projects" on projects;
create policy "Team leads can read supervised projects"
on projects for select to authenticated
using (team_lead_id = auth.uid());

drop policy if exists "Project members can read projects" on project_members;
create policy "Project members can read projects"
on project_members for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from projects pr
    where pr.id = project_members.project_id
    and (pr.team_lead_id = auth.uid() or pr.manager_id = auth.uid())
  )
);

drop policy if exists "Managers can read member projects" on projects;
create policy "Managers can read member projects"
on projects for select to authenticated
using (
  exists (
    select 1 from project_members pm
    join profiles p on p.id = pm.user_id
    where pm.project_id = projects.id
    and p.manager_id = auth.uid()
  )
);
