-- =============================================================================
-- Per-element font size overrides
--
-- Adds a nullable jsonb column holding font size overrides produced by the chat
-- agent: { header, sectionTitle, body } in points. NULL (or any missing key)
-- means "use the template default size". Font sizes are style metadata, not
-- part of cv_version content diffs.
-- =============================================================================

alter table cv
  add column if not exists font_sizes jsonb null;
