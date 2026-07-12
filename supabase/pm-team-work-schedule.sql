-- PM Team Work Schedule
-- Run manually in the Supabase SQL Editor before using work modes and employee night shifts.

-- Work mode per schedule block (onsite | remote | hybrid)
alter table work_schedule_blocks
add column if not exists work_mode text;

alter table work_schedule_blocks
drop constraint if exists work_schedule_blocks_work_mode_check;

alter table work_schedule_blocks
add constraint work_schedule_blocks_work_mode_check
check (
  work_mode is null
  or work_mode in ('onsite', 'remote', 'hybrid')
);

-- Employee flag captured during intern registration
alter table intern_training_details
add column if not exists is_employee boolean not null default false;

-- Allow PMs to read training details for assigned interns (employee night-shift validation)
drop policy if exists "PMs can read assigned intern training details" on intern_training_details;
create policy "PMs can read assigned intern training details"
on intern_training_details for select to authenticated
using (
  exists (
    select 1
    from profiles p
    where p.id = intern_training_details.user_id
      and p.manager_id = auth.uid()
      and p.role = 'intern'
  )
  or exists (
    select 1
    from manager_hierarchy mh
    where mh.user_id = intern_training_details.user_id
      and mh.manager_id = auth.uid()
  )
);
