-- =============================================================================
-- Phase 3 follow-up: enforce session ownership on chat message inserts
-- =============================================================================

drop policy if exists "chat_message owner insert" on chat_message;

create policy "chat_message owner insert"
  on chat_message for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from chat_session
      where chat_session.id = chat_message.session_id
        and chat_session.user_id = (select auth.uid())
    )
  );
