-- =============================================================================
-- CV previewer preferences
--
-- Adds cv_preferences (1 row per user) to drive the master CV renderer:
--   - selected style template
--   - accent color
--   - optional pinned tailored_cv that overrides the master CV in the previewer
--   - cached pdf_path of the last rendered master CV
-- =============================================================================

create type cv_template as enum ('single-column', 'two-column');

create table cv_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template cv_template not null default 'single-column',
  accent_hex text not null default '#0066CC',
  pinned_tailored_cv_id uuid references tailored_cv on delete set null,
  master_pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  constraint cv_preferences_accent_format check (accent_hex ~ '^#[0-9A-Fa-f]{6}$')
);

alter table cv_preferences enable row level security;

create policy "cv_preferences owner full access"
  on cv_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_updated_at_cv_preferences
  before update on cv_preferences
  for each row execute procedure public.set_updated_at();

-- Extend the existing signup trigger to also seed cv_preferences.
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profile (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.cv_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Backfill cv_preferences for users that signed up before this migration.
insert into public.cv_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
