-- =============================================================================
-- Profile full name
--
-- Adds an optional `full_name` column to `profile` so users can set the name
-- shown in the CV header explicitly, instead of relying on auth metadata
-- (which can be empty and falls back to the account email). Treated as free
-- text; length-limited at the application layer (Zod) to stay permissive.
-- =============================================================================

alter table profile
  add column full_name text;
