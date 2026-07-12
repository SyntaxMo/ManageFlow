-- Allow project managers to create and update weekly work schedules
-- for interns assigned to them (manager_id = auth.uid()).

drop policy if exists "Managers can insert team schedules" on work_schedules;
create policy "Managers can insert team schedules"
on work_schedules for insert to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.id = work_schedules.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
);

drop policy if exists "Managers can update team schedules" on work_schedules;
create policy "Managers can update team schedules"
on work_schedules for update to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = work_schedules.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.id = work_schedules.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
);

drop policy if exists "Managers can insert team schedule blocks" on work_schedule_blocks;
create policy "Managers can insert team schedule blocks"
on work_schedule_blocks for insert to authenticated
with check (
  exists (
    select 1
    from work_schedules ws
    join profiles p on p.id = ws.user_id
    where ws.id = work_schedule_blocks.schedule_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
);

drop policy if exists "Managers can delete team schedule blocks" on work_schedule_blocks;
create policy "Managers can delete team schedule blocks"
on work_schedule_blocks for delete to authenticated
using (
  exists (
    select 1
    from work_schedules ws
    join profiles p on p.id = ws.user_id
    where ws.id = work_schedule_blocks.schedule_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
      and p.status = 'active'
  )
);
