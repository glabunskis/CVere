-- =============================================================================
-- Profile contact fields
--
-- Adds optional contact columns rendered in the CV header. Mirrors the
-- LaTeX example header (location, email, phone, LinkedIn, GitHub, website).
-- Email and phone are stored as free text; URLs are validated only at the
-- application layer (Zod) to keep the schema permissive for paste-ins.
-- =============================================================================

alter table profile
  add column location text,
  add column phone text,
  add column contact_email text,
  add column linkedin_url text,
  add column github_url text,
  add column website_url text;
