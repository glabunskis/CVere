-- =============================================================================
-- Phase 3: generic chat sessions
-- =============================================================================

create table chat_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table chat_session enable row level security;

create policy "chat_session owner full access"
  on chat_session for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table cv_preferences
  add column last_active_session_id uuid null references chat_session(id) on delete set null;

alter table chat_message
  add column session_id uuid null references chat_session(id) on delete cascade;

-- Backfill one "General" session per user with existing chat history and
-- attach every existing chat_message row to that session.
with users_with_messages as (
  select distinct user_id
  from chat_message
),
created_sessions as (
  insert into chat_session (user_id, title, last_message_at)
  select
    uwm.user_id,
    'General',
    coalesce(max(cm.created_at), now()) as last_message_at
  from users_with_messages uwm
  left join chat_message cm on cm.user_id = uwm.user_id
  group by uwm.user_id
  returning id, user_id
)
update chat_message cm
set session_id = cs.id
from created_sessions cs
where cm.user_id = cs.user_id
  and cm.session_id is null;

with users_with_messages as (
  select distinct user_id
  from chat_message
),
created_sessions as (
  select cs.id, cs.user_id
  from chat_session cs
  join users_with_messages uwm on uwm.user_id = cs.user_id
  where cs.title = 'General'
)
update cv_preferences cp
set last_active_session_id = cs.id
from created_sessions cs
where cp.user_id = cs.user_id
  and cp.last_active_session_id is null;

create or replace function public.bump_chat_session_last_message_at()
returns trigger as $$
begin
  update chat_session
  set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at)
  where id = new.session_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger bump_chat_session_last_message_at
  after insert on chat_message
  for each row execute procedure public.bump_chat_session_last_message_at();

create trigger set_updated_at_chat_session
  before update on chat_session
  for each row execute procedure public.set_updated_at();

create index chat_message_session_created_idx
  on chat_message(session_id, created_at);
