-- Manual Supabase SQL for internship timeline seed data and task management policies.
-- Run this in the Supabase SQL editor. Do not commit secrets here.

-- Optional task columns (skip if they already exist)
alter table tasks add column if not exists priority priority_level default 'medium';
alter table tasks add column if not exists created_by uuid references profiles(id) on delete set null;

-- Project managers can create tasks for interns assigned to them
drop policy if exists "PMs can create tasks for assigned interns" on tasks;
create policy "PMs can create tasks for assigned interns"
on tasks for insert to authenticated
with check (
  public.get_current_user_role() = 'project_manager'
  and created_by = auth.uid()
  and exists (
    select 1
    from profiles intern
    where intern.id = tasks.assigned_to
      and intern.manager_id = auth.uid()
  )
  and exists (
    select 1
    from projects p
    where p.id = tasks.project_id
      and p.manager_id = auth.uid()
  )
);

-- Project managers can update tasks they created for their interns
drop policy if exists "PMs can update tasks they created" on tasks;
create policy "PMs can update tasks they created"
on tasks for update to authenticated
using (
  public.get_current_user_role() = 'project_manager'
  and created_by = auth.uid()
  and exists (
    select 1
    from profiles intern
    where intern.id = tasks.assigned_to
      and intern.manager_id = auth.uid()
  )
)
with check (
  public.get_current_user_role() = 'project_manager'
  and created_by = auth.uid()
);

-- Project managers can delete tasks they created
drop policy if exists "PMs can delete tasks they created" on tasks;
create policy "PMs can delete tasks they created"
on tasks for delete to authenticated
using (
  public.get_current_user_role() = 'project_manager'
  and created_by = auth.uid()
);

-- Interns can update status on their own tasks
drop policy if exists "Interns can update own task status" on tasks;
create policy "Interns can update own task status"
on tasks for update to authenticated
using (
  assigned_to = auth.uid()
  and public.get_current_user_role() = 'intern'
)
with check (
  assigned_to = auth.uid()
  and public.get_current_user_role() = 'intern'
);

-- Seed internship timeline weeks for a project.
-- Replace the placeholders below before running.

-- Example:
-- \set project_id '00000000-0000-0000-0000-000000000001'
-- \set start_date '2026-07-01'

insert into project_timeline_items (project_id, title, description, type, date)
select
  '00000000-0000-0000-0000-000000000001'::uuid as project_id,
  seed.title,
  seed.description,
  'milestone',
  ('2026-07-01'::date + (seed.week_number * interval '7 days'))::date as date
from (
  values
    (0, 'Initiation', '{"weekNumber":0,"phase":"Initiation","mainTasks":"Team formation, understand game vision, define responsibilities, review project scope, brainstorm mini-games and interactions, create GDDs, install Unreal and watch tutorials.","dependencies":"None","expectedDeliverables":"GDDs, inspiration pictures, asset list research, and signed contracts."}'),
    (1, 'Development', '{"weekNumber":1,"phase":"Development","mainTasks":null,"dependencies":"None","expectedDeliverables":"Final asset list, if needed."}'),
    (2, 'Development', '{"weekNumber":2,"phase":"Development","mainTasks":null,"dependencies":"None","expectedDeliverables":"Dialogue document for voice actors, when the game includes dialogue."}'),
    (3, 'Development', '{"weekNumber":3,"phase":"Development","mainTasks":null,"dependencies":"Core Development","expectedDeliverables":""}'),
    (4, 'UI Integration & Polish', '{"weekNumber":4,"phase":"UI Integration & Polish","mainTasks":"Integrate HUD elements, progress indicators, success and failure screens, and improve usability and accessibility.","dependencies":"UI/UX Team","expectedDeliverables":""}'),
    (5, 'Asset Integration', '{"weekNumber":5,"phase":"Asset Integration","mainTasks":"Replace placeholders with final assets, integrate animations, interactable objects, collectibles, NPC interactions, and environment assets.","dependencies":"Environment Team and Characters Team","expectedDeliverables":""}'),
    (6, 'Sound Integration', '{"weekNumber":6,"phase":"Sound Integration","mainTasks":"Create or add sound effects and music.","dependencies":"Sound & Music Team","expectedDeliverables":""}'),
    (7, 'Polish and Integration', '{"weekNumber":7,"phase":"Polish and Integration","mainTasks":"Balance gameplay difficulty, improve responsiveness, optimize interactions, fix bugs, improve player guidance, and conduct playtesting sessions.","dependencies":"Core Development","expectedDeliverables":""}'),
    (8, 'Polish and Integration', '{"weekNumber":8,"phase":"Polish and Integration","mainTasks":"Final bug fixing, optimization, and integration.","dependencies":"Core Development","expectedDeliverables":""}')
) as seed(week_number, title, description)
where not exists (
  select 1
  from project_timeline_items existing
  where existing.project_id = '00000000-0000-0000-0000-000000000001'::uuid
    and existing.type = 'milestone'
    and existing.description like ('%"weekNumber":' || seed.week_number || '%')
);
