-- =============================================================================
-- Phase 3 lock-down: enforce session-scoped messages
-- =============================================================================

alter table chat_message
  alter column session_id set not null;

drop index if exists chat_message_user_created_idx;
