-- =============================================================================
-- Skill categories + drop skill level
--
-- Adds an ordered, persisted list of skill category names to each CV
-- (`cv.skill_categories`). Grouping/order in the PDF and editor follows this
-- list; skills whose `category` is null or not in the list render under
-- "Uncategorised".
--
-- Removes the skill mastery `level` column (and the now-unused `skill_level`
-- enum) entirely — levels are no longer modelled anywhere.
-- =============================================================================

alter table cv
  add column if not exists skill_categories jsonb not null default '[]'::jsonb;

alter table skill
  drop column if exists level;

drop type if exists skill_level;
