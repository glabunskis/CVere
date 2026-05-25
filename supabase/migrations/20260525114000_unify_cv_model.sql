-- =============================================================================
-- Unify CV model: profile + tailored_cv -> cv
-- =============================================================================

create table if not exists cv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  is_default boolean not null default false,
  source_cv_id uuid null references cv(id) on delete set null,
  source_vacancy_id uuid null references job_description(id) on delete set null,
  summary text null,
  full_name text null,
  location text null,
  phone text null,
  contact_email text null,
  linkedin_url text null,
  github_url text null,
  website_url text null,
  links jsonb not null default '[]'::jsonb,
  template cv_template not null default 'single-column',
  accent_hex text not null default '#000000',
  education_date_format cv_date_format not null default 'mon_yyyy',
  certification_date_format cv_date_format not null default 'mon_yyyy',
  pdf_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cv_accent_format check (accent_hex ~ '^#[0-9A-Fa-f]{6}$')
);

alter table cv enable row level security;

drop policy if exists "cv owner full access" on cv;
create policy "cv owner full access"
  on cv for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop index if exists cv_one_default_per_user;
create unique index cv_one_default_per_user
  on cv (user_id)
  where is_default;

create index if not exists cv_user_updated_idx
  on cv (user_id, updated_at desc);

drop trigger if exists set_updated_at_cv on cv;
create trigger set_updated_at_cv
  before update on cv
  for each row execute procedure public.set_updated_at();

alter table experience add column if not exists cv_id uuid references cv(id) on delete cascade;
alter table project add column if not exists cv_id uuid references cv(id) on delete cascade;
alter table skill add column if not exists cv_id uuid references cv(id) on delete cascade;
alter table education add column if not exists cv_id uuid references cv(id) on delete cascade;
alter table certification add column if not exists cv_id uuid references cv(id) on delete cascade;
alter table language add column if not exists cv_id uuid references cv(id) on delete cascade;

insert into cv (
  user_id,
  title,
  is_default,
  summary,
  full_name,
  location,
  phone,
  contact_email,
  linkedin_url,
  github_url,
  website_url,
  links,
  template,
  accent_hex,
  education_date_format,
  certification_date_format,
  pdf_path
)
select
  p.user_id,
  'Master',
  true,
  p.summary,
  p.full_name,
  p.location,
  p.phone,
  p.contact_email,
  p.linkedin_url,
  p.github_url,
  p.website_url,
  to_jsonb(array_remove(array[p.linkedin_url, p.github_url, p.website_url], null)),
  coalesce(pref.template, 'single-column'::cv_template),
  coalesce(pref.accent_hex, '#000000'),
  coalesce(pref.education_date_format, 'mon_yyyy'::cv_date_format),
  coalesce(pref.certification_date_format, 'mon_yyyy'::cv_date_format),
  pref.master_pdf_path
from profile p
left join cv_preferences pref on pref.user_id = p.user_id
where not exists (
  select 1
  from cv existing
  where existing.user_id = p.user_id
    and existing.is_default
);

insert into cv (user_id, title, is_default)
select u.id, 'Master', true
from auth.users u
where not exists (
  select 1
  from cv existing
  where existing.user_id = u.id
    and existing.is_default
);

update experience e
set cv_id = c.id
from cv c
where c.user_id = e.user_id
  and c.is_default
  and e.cv_id is null;

update project p
set cv_id = c.id
from cv c
where c.user_id = p.user_id
  and c.is_default
  and p.cv_id is null;

update skill s
set cv_id = c.id
from cv c
where c.user_id = s.user_id
  and c.is_default
  and s.cv_id is null;

update education e
set cv_id = c.id
from cv c
where c.user_id = e.user_id
  and c.is_default
  and e.cv_id is null;

update certification c1
set cv_id = c.id
from cv c
where c.user_id = c1.user_id
  and c.is_default
  and c1.cv_id is null;

update language l
set cv_id = c.id
from cv c
where c.user_id = l.user_id
  and c.is_default
  and l.cv_id is null;

do $$
declare
  t tailored_cv%rowtype;
  default_cv cv%rowtype;
  default_profile_id uuid;
  pref cv_preferences%rowtype;
  new_cv_id uuid;
  snapshot jsonb;
  section_data jsonb;
begin
  for t in select * from tailored_cv loop
    select *
    into default_cv
    from cv
    where user_id = t.user_id and is_default
    limit 1;

    select *
    into pref
    from cv_preferences
    where user_id = t.user_id
    limit 1;

    select p.id
    into default_profile_id
    from profile p
    where p.user_id = t.user_id
    limit 1;

    if default_profile_id is null then
      insert into profile (user_id)
      values (t.user_id)
      on conflict (user_id) do update set user_id = excluded.user_id
      returning id into default_profile_id;
    end if;

    snapshot := coalesce(t.source_profile_snapshot, '{}'::jsonb);

    insert into cv (
      user_id,
      title,
      is_default,
      source_cv_id,
      source_vacancy_id,
      summary,
      full_name,
      location,
      phone,
      contact_email,
      linkedin_url,
      github_url,
      website_url,
      links,
      template,
      accent_hex,
      education_date_format,
      certification_date_format,
      pdf_path
    )
    values (
      t.user_id,
      t.title,
      false,
      default_cv.id,
      t.job_description_id,
      coalesce(t.summary, nullif(snapshot #>> '{profile,summary}', '')),
      nullif(snapshot #>> '{identity,fullName}', ''),
      nullif(snapshot #>> '{identity,contact,location}', ''),
      nullif(snapshot #>> '{identity,contact,phone}', ''),
      nullif(snapshot #>> '{identity,contact,email}', ''),
      nullif(snapshot #>> '{identity,contact,linkedinUrl}', ''),
      nullif(snapshot #>> '{identity,contact,githubUrl}', ''),
      nullif(snapshot #>> '{identity,contact,websiteUrl}', ''),
      to_jsonb(array_remove(array[
        nullif(snapshot #>> '{identity,contact,linkedinUrl}', ''),
        nullif(snapshot #>> '{identity,contact,githubUrl}', ''),
        nullif(snapshot #>> '{identity,contact,websiteUrl}', '')
      ], null)),
      coalesce(t.template, pref.template, default_cv.template, 'single-column'::cv_template),
      coalesce(t.accent_hex, pref.accent_hex, default_cv.accent_hex, '#000000'),
      coalesce(pref.education_date_format, default_cv.education_date_format, 'mon_yyyy'::cv_date_format),
      coalesce(pref.certification_date_format, default_cv.certification_date_format, 'mon_yyyy'::cv_date_format),
      t.pdf_path
    )
    returning id into new_cv_id;

    section_data := coalesce(t.sections, '{}'::jsonb);

    insert into experience (
      user_id,
      profile_id,
      cv_id,
      position,
      company,
      role,
      location,
      start_date,
      end_date,
      is_current,
      summary,
      bullets,
      stack
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      exp.ordinality - 1,
      coalesce(nullif(exp.value->>'company', ''), '[MISSING] company'),
      coalesce(nullif(exp.value->>'role', ''), '[MISSING] role'),
      nullif(exp.value->>'location', ''),
      nullif(exp.value->>'startDate', '')::date,
      nullif(exp.value->>'endDate', '')::date,
      coalesce((exp.value->>'isCurrent')::boolean, false),
      coalesce(override.value->>'summary', nullif(exp.value->>'summary', '')),
      coalesce(override.value->'bullets', exp.value->'bullets', '[]'::jsonb),
      coalesce(exp.value->'stack', '[]'::jsonb)
    from jsonb_array_elements(coalesce(snapshot #> '{profile,experience}', '[]'::jsonb)) with ordinality as exp(value, ordinality)
    left join lateral (
      select ov.value
      from jsonb_array_elements(coalesce(section_data->'experience', '[]'::jsonb)) as ov(value)
      where ov.value->>'id' = exp.value->>'id'
      limit 1
    ) override on true;

    insert into project (
      user_id,
      profile_id,
      cv_id,
      position,
      name,
      description,
      link,
      bullets,
      stack
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      proj.ordinality - 1,
      coalesce(nullif(proj.value->>'name', ''), '[MISSING] project'),
      nullif(proj.value->>'description', ''),
      nullif(proj.value->>'link', ''),
      coalesce(override.value->'bullets', proj.value->'bullets', '[]'::jsonb),
      coalesce(proj.value->'stack', '[]'::jsonb)
    from jsonb_array_elements(coalesce(snapshot #> '{profile,projects}', '[]'::jsonb)) with ordinality as proj(value, ordinality)
    left join lateral (
      select ov.value
      from jsonb_array_elements(coalesce(section_data->'projects', '[]'::jsonb)) as ov(value)
      where ov.value->>'id' = proj.value->>'id'
      limit 1
    ) override on true;

    insert into skill (
      user_id,
      profile_id,
      cv_id,
      position,
      name,
      category,
      level
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      s.ordinality - 1,
      coalesce(nullif(s.value->>'name', ''), '[MISSING] skill'),
      nullif(s.value->>'category', ''),
      nullif(s.value->>'level', '')::skill_level
    from jsonb_array_elements(coalesce(snapshot #> '{profile,skills}', '[]'::jsonb)) with ordinality as s(value, ordinality);

    insert into education (
      user_id,
      profile_id,
      cv_id,
      position,
      institution,
      degree,
      field,
      start_date,
      end_date,
      summary
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      e.ordinality - 1,
      coalesce(nullif(e.value->>'institution', ''), '[MISSING] institution'),
      nullif(e.value->>'degree', ''),
      nullif(e.value->>'field', ''),
      nullif(e.value->>'startDate', '')::date,
      nullif(e.value->>'endDate', '')::date,
      nullif(e.value->>'summary', '')
    from jsonb_array_elements(coalesce(snapshot #> '{profile,education}', '[]'::jsonb)) with ordinality as e(value, ordinality);

    insert into certification (
      user_id,
      profile_id,
      cv_id,
      position,
      name,
      issuer,
      issued_at,
      expires_at,
      link
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      c.ordinality - 1,
      coalesce(nullif(c.value->>'name', ''), '[MISSING] certification'),
      nullif(c.value->>'issuer', ''),
      nullif(c.value->>'issuedAt', '')::date,
      nullif(c.value->>'expiresAt', '')::date,
      nullif(c.value->>'link', '')
    from jsonb_array_elements(coalesce(snapshot #> '{profile,certifications}', '[]'::jsonb)) with ordinality as c(value, ordinality);

    insert into language (
      user_id,
      profile_id,
      cv_id,
      position,
      name,
      proficiency
    )
    select
      t.user_id,
      default_profile_id,
      new_cv_id,
      l.ordinality - 1,
      coalesce(nullif(l.value->>'name', ''), '[MISSING] language'),
      nullif(l.value->>'proficiency', '')::language_proficiency
    from jsonb_array_elements(coalesce(snapshot #> '{profile,languages}', '[]'::jsonb)) with ordinality as l(value, ordinality);
  end loop;
end $$;

alter table experience alter column cv_id set not null;
alter table project alter column cv_id set not null;
alter table skill alter column cv_id set not null;
alter table education alter column cv_id set not null;
alter table certification alter column cv_id set not null;
alter table language alter column cv_id set not null;

drop index if exists experience_user_profile_position_idx;
drop index if exists project_user_profile_position_idx;
drop index if exists skill_user_profile_position_idx;
drop index if exists education_user_profile_position_idx;
drop index if exists certification_user_profile_position_idx;
drop index if exists language_user_profile_position_idx;

create index if not exists experience_user_cv_position_idx
  on experience (user_id, cv_id, position);
create index if not exists project_user_cv_position_idx
  on project (user_id, cv_id, position);
create index if not exists skill_user_cv_position_idx
  on skill (user_id, cv_id, position);
create index if not exists education_user_cv_position_idx
  on education (user_id, cv_id, position);
create index if not exists certification_user_cv_position_idx
  on certification (user_id, cv_id, position);
create index if not exists language_user_cv_position_idx
  on language (user_id, cv_id, position);

alter table experience drop column if exists profile_id;
alter table project drop column if exists profile_id;
alter table skill drop column if exists profile_id;
alter table education drop column if exists profile_id;
alter table certification drop column if exists profile_id;
alter table language drop column if exists profile_id;

drop table if exists profile cascade;
drop table if exists tailored_cv cascade;

alter table cv_preferences drop column if exists pinned_tailored_cv_id;
alter table cv_preferences drop column if exists template;
alter table cv_preferences drop column if exists accent_hex;
alter table cv_preferences drop column if exists education_date_format;
alter table cv_preferences drop column if exists certification_date_format;
alter table cv_preferences drop column if exists master_pdf_path;
alter table cv_preferences drop column if exists last_previewed_kind;
alter table cv_preferences drop column if exists last_previewed_ref_id;
alter table cv_preferences add column if not exists selected_cv_id uuid references cv(id) on delete set null;

update cv_preferences pref
set selected_cv_id = c.id
from cv c
where c.user_id = pref.user_id
  and c.is_default
  and pref.selected_cv_id is null;

insert into cv_preferences (user_id, selected_cv_id)
select u.id, c.id
from auth.users u
left join cv c
  on c.user_id = u.id
 and c.is_default
where not exists (
  select 1
  from cv_preferences pref
  where pref.user_id = u.id
);

create or replace function public.handle_new_user_profile()
returns trigger as $$
declare
  default_cv_id uuid;
begin
  insert into public.cv (user_id, title, is_default)
  values (new.id, 'Master', true)
  on conflict do nothing
  returning id into default_cv_id;

  if default_cv_id is null then
    select id
    into default_cv_id
    from public.cv
    where user_id = new.id and is_default
    limit 1;
  end if;

  insert into public.cv_preferences (user_id, selected_cv_id)
  values (new.id, default_cv_id)
  on conflict (user_id) do update set selected_cv_id = excluded.selected_cv_id;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.prevent_default_cv_delete()
returns trigger as $$
begin
  if old.is_default then
    raise exception 'Default CV cannot be deleted.';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists prevent_default_cv_delete on cv;
create trigger prevent_default_cv_delete
  before delete on cv
  for each row execute procedure public.prevent_default_cv_delete();
