-- =============================================================================
-- Per-section date format preferences
--
-- Lets users pick how dates are displayed in education and certification
-- sections without changing how dates are stored (still ISO YYYY-MM-DD).
-- =============================================================================

create type cv_date_format as enum (
  'year',         -- 2024
  'mm_yyyy',      -- 03/2024
  'mon_yyyy',     -- Mar 2024
  'mon_d_yyyy'    -- Mar 15, 2024
);

alter table cv_preferences
  add column education_date_format cv_date_format not null default 'mm_yyyy',
  add column certification_date_format cv_date_format not null default 'mm_yyyy';
