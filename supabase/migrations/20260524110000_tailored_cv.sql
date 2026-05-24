-- =============================================================================
-- Phase 4: tailored CV artefact
-- =============================================================================

create table tailored_cv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_description_id uuid null references job_description(id) on delete set null,
  title text not null,
  source_profile_snapshot jsonb not null,
  summary text,
  sections jsonb not null default '{}'::jsonb,
  accent_hex text null check (accent_hex ~ '^#[0-9A-Fa-f]{6}$'),
  template cv_template null,
  pdf_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tailored_cv_user_updated_idx
  on tailored_cv(user_id, updated_at desc);

alter table tailored_cv enable row level security;

create policy "tailored_cv owner full access"
  on tailored_cv for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger set_updated_at_tailored_cv
  before update on tailored_cv
  for each row execute procedure public.set_updated_at();

alter table cv_preferences
  add column if not exists last_previewed_kind text;

alter table cv_preferences
  add column if not exists last_previewed_ref_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cv_preferences_last_previewed_kind_check'
  ) then
    alter table cv_preferences
      add constraint cv_preferences_last_previewed_kind_check
      check (last_previewed_kind in ('master', 'tailored_cv'));
  end if;
end $$;

update cv_preferences
set last_previewed_kind = 'master'
where last_previewed_kind is null;
