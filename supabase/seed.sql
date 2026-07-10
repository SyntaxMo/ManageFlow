insert into departments (name, description)
values
('Game Development', 'Main department for game production teams')
on conflict (name) do nothing;

insert into teams (name, description, department_id)
select team_name, team_description, departments.id
from (
  values
  ('Characters Team', 'Handles character design, models, and character assets'),
  ('Core Development Team', 'Handles gameplay systems, mechanics, and technical implementation'),
  ('Environment Team', 'Handles levels, maps, scenes, and environment assets'),
  ('QA / Playtesting Team', 'Handles testing, bug reports, and playtesting feedback'),
  ('Music and Audio Team', 'Handles music, sound effects, and audio direction'),
  ('UI / UX Team', 'Handles user interface, user experience, and wireframes'),
  ('Marketing Team', 'Handles marketing materials, social posts, and campaigns'),
  ('Localization Team', 'Handles translation and localization work'),
  ('Narrative and Storytelling Team', 'Handles story, dialogue, and narrative design'),
  ('Minigames Team', 'Handles minigame planning, development, and testing')
) as default_teams(team_name, team_description),
departments
where departments.name = 'Game Development'
on conflict (name) do nothing;
