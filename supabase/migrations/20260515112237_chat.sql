-- =============================================================================
-- Chat history (singleton chat per user)
--
-- One row per UIMessage (AI SDK v6). The `parts` column holds the
-- v6 UIMessage parts array verbatim, so reload restores tool-call states.
-- Append-only: no `update` policy, no `updated_at`.
--
-- v1 stores a single conversation per user; multi-session migration would
-- add a `chat_session` table + nullable `session_id` column on chat_message.
-- =============================================================================

-- `id` is `text` (not `uuid`) because the AI SDK v6 client generates
-- 16-char base-58 message ids on the client and the server treats them as
-- opaque. Default kept so server-only inserts still get a value.
create table chat_message (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

-- Composite index for the only access pattern: load this user's history
-- ordered by time. Covers (user_id, created_at) lookups without a sort.
create index chat_message_user_created_idx on chat_message(user_id, created_at);

alter table chat_message enable row level security;

-- (select auth.uid()) caches the result per query (Supabase RLS perf guidance).
create policy "chat_message owner select"
  on chat_message for select
  using ((select auth.uid()) = user_id);

create policy "chat_message owner insert"
  on chat_message for insert
  with check ((select auth.uid()) = user_id);

create policy "chat_message owner delete"
  on chat_message for delete
  using ((select auth.uid()) = user_id);
