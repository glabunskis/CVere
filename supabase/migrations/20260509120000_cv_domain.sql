-- =============================================================================
-- CVere domain schema
--
-- Source-of-truth hierarchy:
--   profile -> achievement_log_entry -> job_description -> tailored_cv / cover_letter -> exports
--
-- Every public table:
--   - has user_id uuid not null references auth.users on delete cascade
--   - enables row level security
--   - has a single policy: auth.uid() = user_id (with check)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type achievement_status as enum ('pending', 'integrated', 'dismissed');

create type cv_status as enum ('draft', 'final');

create type advice_target as enum (
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certs',
  'languages',
  'global'
);

create type advice_severity as enum ('info', 'weak', 'gap');

create type advice_status as enum ('open', 'applied', 'dismissed');

create type achievement_section as enum (
  'summary',
  'experience',
  'project',
  'skill',
  'education',
  'certification',
  'language'
);

create type language_proficiency as enum (
  'beginner',
  'elementary',
  'intermediate',
  'upper_intermediate',
  'advanced',
  'native'
);

create type skill_level as enum ('beginner', 'intermediate', 'advanced', 'expert');

-- -----------------------------------------------------------------------------
-- profile (1 row per user)
-- -----------------------------------------------------------------------------

create table profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table profile enable row level security;

create policy "profile owner full access"
  on profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row on user signup. Reuses the existing trigger pattern.
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profile (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- -----------------------------------------------------------------------------
-- profile children (normalized, ordered)
-- -----------------------------------------------------------------------------

create table experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  company text not null,
  role text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  summary text,
  bullets jsonb not null default '[]'::jsonb,
  stack jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index experience_user_profile_position_idx
  on experience (user_id, profile_id, position);

alter table experience enable row level security;

create policy "experience owner full access"
  on experience for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table project (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  name text not null,
  description text,
  link text,
  bullets jsonb not null default '[]'::jsonb,
  stack jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_user_profile_position_idx
  on project (user_id, profile_id, position);

alter table project enable row level security;

create policy "project owner full access"
  on project for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table skill (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  name text not null,
  category text,
  level skill_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skill_user_profile_position_idx
  on skill (user_id, profile_id, position);

alter table skill enable row level security;

create policy "skill owner full access"
  on skill for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  institution text not null,
  degree text,
  field text,
  start_date date,
  end_date date,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index education_user_profile_position_idx
  on education (user_id, profile_id, position);

alter table education enable row level security;

create policy "education owner full access"
  on education for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table certification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  name text not null,
  issuer text,
  issued_at date,
  expires_at date,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certification_user_profile_position_idx
  on certification (user_id, profile_id, position);

alter table certification enable row level security;

create policy "certification owner full access"
  on certification for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table language (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profile on delete cascade,
  position int not null default 0,
  name text not null,
  proficiency language_proficiency,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index language_user_profile_position_idx
  on language (user_id, profile_id, position);

alter table language enable row level security;

create policy "language owner full access"
  on language for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- achievement_log_entry (append-only inbox)
-- -----------------------------------------------------------------------------

create table achievement_log_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  raw_text text not null,
  normalized_text text,
  target_section achievement_section,
  status achievement_status not null default 'pending',
  integrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievement_integrated_requires_timestamp
    check (status <> 'integrated' or integrated_at is not null)
);

create index achievement_log_entry_user_status_idx
  on achievement_log_entry (user_id, status, created_at desc);

alter table achievement_log_entry enable row level security;

create policy "achievement_log_entry owner full access"
  on achievement_log_entry for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- job_description (vacancy input)
-- -----------------------------------------------------------------------------

create table job_description (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  company text,
  role text,
  raw_text text not null,
  extracted jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_description_user_created_idx
  on job_description (user_id, created_at desc);

alter table job_description enable row level security;

create policy "job_description owner full access"
  on job_description for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- tailored_cv (derived presentation)
-- -----------------------------------------------------------------------------

create table tailored_cv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_description_id uuid not null references job_description on delete cascade,
  profile_snapshot jsonb not null,
  sections jsonb not null default '{}'::jsonb,
  status cv_status not null default 'draft',
  slug text not null,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index tailored_cv_user_created_idx
  on tailored_cv (user_id, created_at desc);

create index tailored_cv_job_description_idx
  on tailored_cv (job_description_id);

alter table tailored_cv enable row level security;

create policy "tailored_cv owner full access"
  on tailored_cv for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- cover_letter (derived presentation)
-- -----------------------------------------------------------------------------

create table cover_letter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_description_id uuid not null references job_description on delete cascade,
  body text not null default '',
  slug text not null,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index cover_letter_user_created_idx
  on cover_letter (user_id, created_at desc);

create index cover_letter_job_description_idx
  on cover_letter (job_description_id);

alter table cover_letter enable row level security;

create policy "cover_letter owner full access"
  on cover_letter for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- advice_note (critique store, never auto-applied)
-- -----------------------------------------------------------------------------

create table advice_note (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tailored_cv_id uuid references tailored_cv on delete cascade,
  cover_letter_id uuid references cover_letter on delete cascade,
  target advice_target not null,
  target_ref_id uuid,
  severity advice_severity not null default 'info',
  body text not null,
  status advice_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advice_note_user_status_idx
  on advice_note (user_id, status, created_at desc);

create index advice_note_tailored_cv_idx
  on advice_note (tailored_cv_id);

create index advice_note_cover_letter_idx
  on advice_note (cover_letter_id);

alter table advice_note enable row level security;

create policy "advice_note owner full access"
  on advice_note for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- interview_answer + interview_advice
-- -----------------------------------------------------------------------------

create table interview_answer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_answer_user_created_idx
  on interview_answer (user_id, created_at desc);

alter table interview_answer enable row level security;

create policy "interview_answer owner full access"
  on interview_answer for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table interview_advice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  interview_answer_id uuid references interview_answer on delete cascade,
  severity advice_severity not null default 'info',
  body text not null,
  status advice_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_advice_user_status_idx
  on interview_advice (user_id, status, created_at desc);

create index interview_advice_answer_idx
  on interview_advice (interview_answer_id);

alter table interview_advice enable row level security;

create policy "interview_advice owner full access"
  on interview_advice for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers (one shared function)
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profile
  before update on profile
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_experience
  before update on experience
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_project
  before update on project
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_skill
  before update on skill
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_education
  before update on education
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_certification
  before update on certification
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_language
  before update on language
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_achievement_log_entry
  before update on achievement_log_entry
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_job_description
  before update on job_description
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_tailored_cv
  before update on tailored_cv
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_cover_letter
  before update on cover_letter
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_advice_note
  before update on advice_note
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_interview_answer
  before update on interview_answer
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_interview_advice
  before update on interview_advice
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Storage bucket: pdf (private, owner-scoped by path prefix pdf/{user_id}/)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('pdf', 'pdf', false)
on conflict (id) do nothing;

create policy "pdf owner read"
  on storage.objects for select
  using (
    bucket_id = 'pdf'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdf owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'pdf'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdf owner update"
  on storage.objects for update
  using (
    bucket_id = 'pdf'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pdf'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdf owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'pdf'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
