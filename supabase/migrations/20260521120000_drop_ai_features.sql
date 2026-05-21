-- =============================================================================
-- Drop AI-derived features
--
-- Removes the four strictly-AI features (tailored CVs, cover letters, advice,
-- interview) end-to-end and the AI-derived columns on retained tables. The
-- chat-driven master CV editor stays. Achievements and vacancies remain as
-- manual CRUD.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Drop FK columns on retained tables before the referenced tables disappear
-- -----------------------------------------------------------------------------

alter table cv_preferences drop column if exists pinned_tailored_cv_id;

-- AI-derived JSON on job_description; raw_text stays.
alter table job_description drop column if exists extracted;

-- -----------------------------------------------------------------------------
-- Drop updated_at triggers for AI-only tables
-- -----------------------------------------------------------------------------

drop trigger if exists set_updated_at_interview_advice on interview_advice;
drop trigger if exists set_updated_at_interview_answer on interview_answer;
drop trigger if exists set_updated_at_advice_note on advice_note;
drop trigger if exists set_updated_at_cover_letter on cover_letter;
drop trigger if exists set_updated_at_tailored_cv on tailored_cv;

-- -----------------------------------------------------------------------------
-- Drop AI-only tables (cascade clears policies, indexes, FKs)
-- -----------------------------------------------------------------------------

drop table if exists interview_advice cascade;
drop table if exists interview_answer cascade;
drop table if exists advice_note cascade;
drop table if exists cover_letter cascade;
drop table if exists tailored_cv cascade;

-- -----------------------------------------------------------------------------
-- Drop enums used only by the AI-only tables
-- -----------------------------------------------------------------------------

drop type if exists cv_status;
drop type if exists advice_status;
drop type if exists advice_severity;
drop type if exists advice_target;
