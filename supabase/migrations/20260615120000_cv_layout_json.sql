-- =============================================================================
-- AI-generated PDF layout
--
-- Adds a nullable jsonb column holding a structured LayoutSpec produced by the
-- chat agent. NULL means "no AI layout" -> fall back to the cv.template enum.
-- Layout is style metadata, not part of cv_version content diffs.
-- =============================================================================

alter table cv
  add column if not exists layout_json jsonb null;
