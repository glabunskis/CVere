-- =============================================================================
-- CV versioning: per-CV undo/redo via reversible structured diffs
-- =============================================================================

create table if not exists cv_version (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references cv(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  seq bigint not null,
  diff jsonb not null,
  source text not null check (source in ('chat', 'manual')),
  label text null,
  created_at timestamptz not null default now(),
  constraint cv_version_cv_seq_unique unique (cv_id, seq)
);

alter table cv_version enable row level security;

drop policy if exists "cv_version owner full access" on cv_version;
create policy "cv_version owner full access"
  on cv_version for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists cv_version_cv_seq_idx
  on cv_version (cv_id, seq desc);

-- Current history position. 0 = no edits recorded yet.
alter table cv add column if not exists history_seq bigint not null default 0;
