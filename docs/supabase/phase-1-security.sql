-- MangeFlow Phase 1 security starter.
-- Run in Supabase SQL editor after creating the project.

create type public.app_role as enum (
  'admin',
  'senior_manager',
  'team_lead',
  'project_manager',
  'employee',
  'intern'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  role public.app_role not null default 'intern',
  team_id uuid,
  department_id uuid,
  manager_id uuid references public.profiles(id),
  job_title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own_non_role_fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "activity_logs_insert_authenticated"
on public.activity_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "activity_logs_read_admin_senior"
on public.activity_logs for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'senior_manager')
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'intern'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
