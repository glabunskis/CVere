-- =============================================================================
-- Experience date format preference
--
-- Adds a per-CV date format for the experience section, matching the existing
-- education and certification date formats. Dates remain stored as ISO
-- YYYY-MM-DD; only the rendered display changes.
-- =============================================================================

alter table cv
  add column experience_date_format cv_date_format not null default 'mon_yyyy';
