-- Daily report file uploads (manual execution in Supabase SQL Editor)
-- Required for intern DOCX/PDF upload flow and PM download integration.

-- ---------------------------------------------------------------------------
-- files table
-- ---------------------------------------------------------------------------

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  report_id uuid references daily_reports(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_category text not null,
  file_size bigint not null check (file_size > 0),
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_files_report_id on files(report_id);
create index if not exists idx_files_uploaded_by on files(uploaded_by);
create index if not exists idx_files_file_category on files(file_category);

create unique index if not exists idx_files_daily_report_per_report
on files(report_id, file_category)
where report_id is not null and file_category = 'daily_report';

-- Prevent duplicate reports for the same intern and date
create unique index if not exists idx_daily_reports_user_report_date
on daily_reports(user_id, report_date);

-- ---------------------------------------------------------------------------
-- daily_reports: allow interns to update their own reports (replace flow)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can update own daily reports" on daily_reports;
create policy "Users can update own daily reports"
on daily_reports for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- files RLS
-- ---------------------------------------------------------------------------

alter table files enable row level security;

drop policy if exists "Users can read own files" on files;
create policy "Users can read own files"
on files for select to authenticated
using (uploaded_by = auth.uid());

drop policy if exists "Managers can read team files" on files;
create policy "Managers can read team files"
on files for select to authenticated
using (
  exists (
    select 1
    from profiles p
    where p.id = files.uploaded_by
    and p.manager_id = auth.uid()
  )
);

drop policy if exists "Users can insert own files" on files;
create policy "Users can insert own files"
on files for insert to authenticated
with check (uploaded_by = auth.uid());

drop policy if exists "Users can update own files" on files;
create policy "Users can update own files"
on files for update to authenticated
using (uploaded_by = auth.uid())
with check (uploaded_by = auth.uid());

drop policy if exists "Admins can manage all files" on files;
create policy "Admins can manage all files"
on files for all to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- ---------------------------------------------------------------------------
-- Private storage bucket: reports
-- Path pattern: daily-reports/{internId}/{YYYY-MM-DD}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Interns can upload own daily reports" on storage.objects;
create policy "Interns can upload own daily reports"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can read own report files" on storage.objects;
create policy "Users can read own report files"
on storage.objects for select to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Managers can read intern report files" on storage.objects;
create policy "Managers can read intern report files"
on storage.objects for select to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and exists (
    select 1
    from profiles p
    where p.id::text = (storage.foldername(name))[2]
    and p.manager_id = auth.uid()
  )
);

drop policy if exists "Users can update own report files" on storage.objects;
create policy "Users can update own report files"
on storage.objects for update to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can delete own report files" on storage.objects;
create policy "Users can delete own report files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = 'daily-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);
