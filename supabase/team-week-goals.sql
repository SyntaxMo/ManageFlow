-- Per-team week goals (each team has its own editable current-week goal).
-- Run in Supabase SQL editor.

create table if not exists public.team_week_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  week_number integer not null check (week_number >= 0 and week_number <= 8),
  goal_text text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (team_id, week_number)
);

create index if not exists team_week_goals_team_id_idx
  on public.team_week_goals (team_id);

alter table public.team_week_goals enable row level security;

drop policy if exists "Team members can read team week goals" on public.team_week_goals;
create policy "Team members can read team week goals"
on public.team_week_goals for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.team_id = team_week_goals.team_id
  )
);

drop policy if exists "PMs can upsert their team week goals" on public.team_week_goals;
create policy "PMs can upsert their team week goals"
on public.team_week_goals for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'project_manager'
      and p.team_id = team_week_goals.team_id
  )
);

drop policy if exists "PMs can update their team week goals" on public.team_week_goals;
create policy "PMs can update their team week goals"
on public.team_week_goals for update to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'project_manager'
      and p.team_id = team_week_goals.team_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'project_manager'
      and p.team_id = team_week_goals.team_id
  )
);

drop policy if exists "PMs can delete their team week goals" on public.team_week_goals;
create policy "PMs can delete their team week goals"
on public.team_week_goals for delete to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'project_manager'
      and p.team_id = team_week_goals.team_id
  )
);
