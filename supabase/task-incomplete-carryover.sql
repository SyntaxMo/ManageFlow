-- Incomplete task reason + carry-over support for post-report check-in.
-- Run in Supabase SQL editor.

alter table tasks
  add column if not exists incomplete_reason text;

comment on column tasks.incomplete_reason is
  'Reason the intern could not finish the task (set after daily report check-in). Cleared when PM approves carry-over to the next day.';
