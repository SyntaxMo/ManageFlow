-- Set active internship projects to Development Week 2 (today = day 14 of the program).
-- Week 0 = days 0-6, Week 1 = 7-13, Week 2 = 14-20.

update projects
set start_date = (current_date - interval '14 days')::date
where start_date is not null
  and status in ('planning', 'active', 'in_progress', 'under_review');
