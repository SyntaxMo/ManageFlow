-- Fix task/join notifications blocked by RLS.
-- Run this in the Supabase SQL editor.
--
-- Why: policies that check profiles.manager_id often fail because profiles RLS
-- hides other users' rows from the EXISTS subquery. A SECURITY DEFINER function
-- bypasses that safely.

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'system'
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notifications;
  v_allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or btrim(coalesce(p_title, '')) = '' then
    raise exception 'Invalid notification payload';
  end if;

  -- Self
  if p_user_id = auth.uid() then
    v_allowed := true;
  end if;

  -- PM → assigned intern (profiles.manager_id)
  if not v_allowed and exists (
    select 1
    from public.profiles target
    where target.id = p_user_id
      and target.manager_id = auth.uid()
  ) then
    v_allowed := true;
  end if;

  -- PM → intern via manager_hierarchy
  if not v_allowed and exists (
    select 1
    from public.manager_hierarchy mh
    where mh.manager_id = auth.uid()
      and mh.user_id = p_user_id
  ) then
    v_allowed := true;
  end if;

  -- Intern → their manager
  if not v_allowed and exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.manager_id = p_user_id
  ) then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'Not allowed to create a notification for this user';
  end if;

  insert into public.notifications (user_id, title, message, type, is_read)
  values (
    p_user_id,
    p_title,
    p_message,
    coalesce(nullif(btrim(p_type), ''), 'system'),
    false
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_user_notification(uuid, text, text, text) from public;
grant execute on function public.create_user_notification(uuid, text, text, text) to authenticated;

-- Keep read/update limited to the recipient
drop policy if exists "Users can view own notifications" on notifications;
create policy "Users can view own notifications"
on notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications"
on notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Prefer the RPC above. Keep a permissive insert policy as fallback for
-- clients that still insert directly (RPC is the recommended path).
drop policy if exists "Users can insert own notifications" on notifications;
drop policy if exists "Authenticated users can create notifications for related users" on notifications;
drop policy if exists "Users can create notifications for related users" on notifications;
drop policy if exists "Authenticated users can insert notifications" on notifications;

create policy "Authenticated users can insert notifications"
on notifications for insert to authenticated
with check (true);
