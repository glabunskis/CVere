import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from '@/shared/api/supabase/types';
import type { User } from '@supabase/supabase-js';

import { type FontSizes, fontSizesSchema } from './pdf/font-spec';
import { layoutSpecSchema } from './pdf/layout-spec';

import 'server-only';

export type CvRow = Tables<'cv'>;
type ExperienceRow = Tables<'experience'>;
type ProjectRow = Tables<'project'>;
type SkillRow = Tables<'skill'>;
type EducationRow = Tables<'education'>;
type CertificationRow = Tables<'certification'>;
type LanguageRow = Tables<'language'>;

type CvTableColumns = {
  experience: Pick<
    TablesInsert<'experience'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'company'
    | 'role'
    | 'location'
    | 'start_date'
    | 'end_date'
    | 'is_current'
    | 'summary'
    | 'bullets'
    | 'stack'
  >;
  project: Pick<
    TablesInsert<'project'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'name'
    | 'description'
    | 'link'
    | 'bullets'
    | 'stack'
  >;
  skill: Pick<TablesInsert<'skill'>, 'user_id' | 'cv_id' | 'position' | 'name' | 'category' | 'level'>;
  education: Pick<
    TablesInsert<'education'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'institution'
    | 'degree'
    | 'field'
    | 'start_date'
    | 'end_date'
    | 'summary'
  >;
  certification: Pick<
    TablesInsert<'certification'>,
    | 'user_id'
    | 'cv_id'
    | 'position'
    | 'name'
    | 'issuer'
    | 'issued_at'
    | 'expires_at'
    | 'link'
  >;
  language: Pick<TablesInsert<'language'>, 'user_id' | 'cv_id' | 'position' | 'name' | 'proficiency'>;
};

const MAX_BULLETS = 50;
const MAX_BULLET_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 2000;
const MAX_SECTION_ROWS = 50;

export class ProfileContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileContentError';
  }
}

type OrderedTable =
  | 'experience'
  | 'project'
  | 'skill'
  | 'education'
  | 'certification'
  | 'language';

type SkillLevel = NonNullable<TablesInsert<'skill'>['level']>;
type LanguageProficiency = NonNullable<TablesInsert<'language'>['proficiency']>;

type ProfileIdentityPatch = {
  fullName?: string | null;
  location?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
};

type ExperiencePatch = {
  company?: string;
  role?: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  summary?: string | null;
  stack?: string[];
};

type ProjectPatch = {
  name?: string;
  description?: string | null;
  link?: string | null;
  stack?: string[];
};

type SkillPatch = {
  name?: string;
  category?: string | null;
  level?: SkillLevel | null;
};

type EducationPatch = {
  institution?: string;
  degree?: string | null;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  summary?: string | null;
};

type CertificationPatch = {
  name?: string;
  issuer?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  link?: string | null;
};

type LanguagePatch = {
  name?: string;
  proficiency?: LanguageProficiency | null;
};

function toBulletArray(raw: Json | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === 'string');
}

function validateBulletText(text: string): void {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new ProfileContentError('Bullet text cannot be empty.');
  if (text.length > MAX_BULLET_LENGTH) {
    throw new ProfileContentError(`Bullet text must be at most ${MAX_BULLET_LENGTH} characters.`);
  }
}

function spliceInsert(bullets: string[], text: string, index?: number): string[] {
  if (bullets.length >= MAX_BULLETS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  const next = [...bullets];
  if (index === undefined || index >= next.length) {
    next.push(text);
  } else {
    const safeIndex = Math.max(0, index);
    next.splice(safeIndex, 0, text);
  }
  return next;
}

function spliceReplace(bullets: string[], index: number, text: string): string[] {
  if (index < 0 || index >= bullets.length) {
    throw new ProfileContentError(
      `Bullet index ${index} is out of range (have ${bullets.length}).`,
    );
  }
  const next = [...bullets];
  next[index] = text;
  return next;
}

function spliceRemove(bullets: string[], index: number): string[] {
  if (index < 0 || index >= bullets.length) {
    throw new ProfileContentError(
      `Bullet index ${index} is out of range (have ${bullets.length}).`,
    );
  }
  const next = [...bullets];
  next.splice(index, 1);
  return next;
}

function spliceMove(items: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= items.length) {
    throw new ProfileContentError(
      `Bullet index ${fromIndex} is out of range (have ${items.length}).`,
    );
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  const safeTo = Math.max(0, Math.min(toIndex, next.length));
  next.splice(safeTo, 0, moved);
  return next;
}

function normaliseNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function getOwnedCv(userId: string, cvId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('id', cvId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`CV ${cvId} not found.`);
  return data;
}

async function getDefaultCv(userId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('cv')
    .insert({ user_id: userId, title: 'Master', is_default: true })
    .select('*')
    .single();
  if (createError || !created) {
    throw new Error(createError?.message ?? 'Default CV not found.');
  }
  return created;
}

async function cloneSectionRows({
  userId,
  sourceCvId,
  targetCvId,
}: {
  userId: string;
  sourceCvId: string;
  targetCvId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: experienceRows, error: experienceError } = await supabase
    .from('experience')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (experienceError) throw new Error(experienceError.message);
  if (experienceRows && experienceRows.length > 0) {
    const insertable = experienceRows.map<CvTableColumns['experience']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      company: row.company,
      role: row.role,
      location: row.location,
      start_date: row.start_date,
      end_date: row.end_date,
      is_current: row.is_current,
      summary: row.summary,
      bullets: row.bullets,
      stack: row.stack,
    }));
    const { error } = await supabase.from('experience').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: projectRows, error: projectError } = await supabase
    .from('project')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (projectError) throw new Error(projectError.message);
  if (projectRows && projectRows.length > 0) {
    const insertable = projectRows.map<CvTableColumns['project']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      description: row.description,
      link: row.link,
      bullets: row.bullets,
      stack: row.stack,
    }));
    const { error } = await supabase.from('project').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: skillRows, error: skillError } = await supabase
    .from('skill')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (skillError) throw new Error(skillError.message);
  if (skillRows && skillRows.length > 0) {
    const insertable = skillRows.map<CvTableColumns['skill']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      category: row.category,
      level: row.level,
    }));
    const { error } = await supabase.from('skill').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: educationRows, error: educationError } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (educationError) throw new Error(educationError.message);
  if (educationRows && educationRows.length > 0) {
    const insertable = educationRows.map<CvTableColumns['education']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      institution: row.institution,
      degree: row.degree,
      field: row.field,
      start_date: row.start_date,
      end_date: row.end_date,
      summary: row.summary,
    }));
    const { error } = await supabase.from('education').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: certificationRows, error: certificationError } = await supabase
    .from('certification')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (certificationError) throw new Error(certificationError.message);
  if (certificationRows && certificationRows.length > 0) {
    const insertable = certificationRows.map<CvTableColumns['certification']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      issuer: row.issuer,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      link: row.link,
    }));
    const { error } = await supabase.from('certification').insert(insertable);
    if (error) throw new Error(error.message);
  }

  const { data: languageRows, error: languageError } = await supabase
    .from('language')
    .select('*')
    .eq('user_id', userId)
    .eq('cv_id', sourceCvId)
    .order('position', { ascending: true });
  if (languageError) throw new Error(languageError.message);
  if (languageRows && languageRows.length > 0) {
    const insertable = languageRows.map<CvTableColumns['language']>((row) => ({
      user_id: userId,
      cv_id: targetCvId,
      position: row.position,
      name: row.name,
      proficiency: row.proficiency,
    }));
    const { error } = await supabase.from('language').insert(insertable);
    if (error) throw new Error(error.message);
  }
}

async function assertOwnedCv(user: User, cvId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('id')
    .eq('id', cvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`CV ${cvId} not found.`);
}

async function assertCapAndNextPosition({
  user,
  cvId,
  table,
}: {
  user: User;
  cvId: string;
  table: OrderedTable;
}): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (countError) throw new ProfileContentError(countError.message);
  if ((count ?? 0) >= MAX_SECTION_ROWS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_SECTION_ROWS} ${table} entries.`);
  }
  const { data, error } = await supabase
    .from(table)
    .select('position')
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .order('position', { ascending: false })
    .limit(1);
  if (error) throw new ProfileContentError(error.message);
  if (!data || data.length === 0) return 0;
  return data[0].position + 1;
}

async function loadById({
  user,
  cvId,
  table,
  id,
}: {
  user: User;
  cvId: string;
  table: OrderedTable;
  id: string;
}): Promise<{ id: string; user_id: string; position: number }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, user_id, position')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`${table} ${id} not found.`);
  return data;
}

async function reorderRows({
  user,
  cvId,
  table,
  targetId,
  toIndex,
}: {
  user: User;
  cvId: string;
  table: OrderedTable;
  targetId: string;
  toIndex: number;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, position')
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .order('position', { ascending: true });
  if (error) throw new ProfileContentError(error.message);
  const rows = data ?? [];
  const fromIndex = rows.findIndex((row) => row.id === targetId);
  if (fromIndex < 0) {
    throw new ProfileContentError(`${table} ${targetId} not found.`);
  }
  const reordered = [...rows];
  const [moved] = reordered.splice(fromIndex, 1);
  const safeTo = Math.max(0, Math.min(toIndex, reordered.length));
  reordered.splice(safeTo, 0, moved);

  const updates = reordered
    .map((row, index) => ({ id: row.id, oldPosition: row.position, newPosition: index }))
    .filter((update) => update.oldPosition !== update.newPosition);
  if (updates.length === 0) return;

  await Promise.all(
    updates.map(({ id, newPosition }) =>
      supabase
        .from(table)
        .update({ position: newPosition })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('cv_id', cvId),
    ),
  );
}

async function loadExperience({
  user,
  cvId,
  experienceId,
}: {
  user: User;
  cvId: string;
  experienceId: string;
}): Promise<ExperienceRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('experience')
    .select('*')
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`Experience ${experienceId} not found.`);
  return data;
}

async function persistExperienceBullets({
  user,
  cvId,
  experienceId,
  bullets,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  bullets: string[];
}): Promise<ExperienceRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('experience')
    .update({ bullets })
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update experience bullets.');
  }
  return data;
}

async function loadProject({
  user,
  cvId,
  projectId,
}: {
  user: User;
  cvId: string;
  projectId: string;
}): Promise<ProjectRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`Project ${projectId} not found.`);
  return data;
}

async function persistProjectBullets({
  user,
  cvId,
  projectId,
  bullets,
}: {
  user: User;
  cvId: string;
  projectId: string;
  bullets: string[];
}): Promise<ProjectRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project')
    .update({ bullets })
    .eq('id', projectId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update project bullets.');
  }
  return data;
}

export async function listCvRows(userId: string): Promise<CvRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCv(cvId: string, userId: string): Promise<CvRow> {
  return getOwnedCv(userId, cvId);
}

export async function getSelectedCv(userId: string): Promise<CvRow> {
  const supabase = await createSupabaseServerClient();
  const { data: prefs, error: prefError } = await supabase
    .from('cv_preferences')
    .select('selected_cv_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefError) throw new Error(prefError.message);

  if (prefs?.selected_cv_id) {
    const candidate = await getOwnedCv(userId, prefs.selected_cv_id).catch(() => null);
    if (candidate) return candidate;
  }

  const fallback = await getDefaultCv(userId);
  await supabase
    .from('cv_preferences')
    .upsert({ user_id: userId, selected_cv_id: fallback.id }, { onConflict: 'user_id' });
  return fallback;
}

export async function setSelectedCv(userId: string, cvId: string): Promise<void> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv_preferences')
    .upsert({ user_id: userId, selected_cv_id: cvId }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function createCv({
  userId,
  title,
  sourceCvId,
  sourceVacancyId,
}: {
  userId: string;
  title: string;
  sourceCvId?: string | null;
  sourceVacancyId?: string | null;
}): Promise<CvRow> {
  const source =
    sourceCvId != null
      ? await getOwnedCv(userId, sourceCvId)
      : await getSelectedCv(userId).catch(() => getDefaultCv(userId));

  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'cv'> = {
    user_id: userId,
    title: title.trim(),
    is_default: false,
    source_cv_id: source?.id ?? null,
    source_vacancy_id: sourceVacancyId ?? null,
    summary: source?.summary ?? null,
    full_name: source?.full_name ?? null,
    location: source?.location ?? null,
    phone: source?.phone ?? null,
    contact_email: source?.contact_email ?? null,
    linkedin_url: source?.linkedin_url ?? null,
    github_url: source?.github_url ?? null,
    website_url: source?.website_url ?? null,
    links: source?.links ?? [],
    template: source?.template ?? 'single-column',
    accent_hex: source?.accent_hex ?? '#000000',
    education_date_format: source?.education_date_format ?? 'mon_yyyy',
    certification_date_format: source?.certification_date_format ?? 'mon_yyyy',
    pdf_path: null,
  };
  const { data, error } = await supabase.from('cv').insert(insertable).select('*').single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create CV');

  if (source) {
    try {
      await cloneSectionRows({ userId, sourceCvId: source.id, targetCvId: data.id });
    } catch (cloneError) {
      const { error: rollbackError } = await supabase
        .from('cv')
        .delete()
        .eq('id', data.id)
        .eq('user_id', userId);
      if (rollbackError) {
        throw new Error(
          `Failed to clone CV sections (${String(cloneError)}); rollback failed: ${rollbackError.message}`,
        );
      }
      throw cloneError;
    }
  }

  return data;
}

export async function renameCv(userId: string, cvId: string, title: string): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ title: title.trim() })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to rename CV');
  return data;
}

export async function deleteCv(userId: string, cvId: string): Promise<void> {
  const cv = await getOwnedCv(userId, cvId);
  if (cv.is_default) {
    throw new Error('Default CV cannot be deleted.');
  }

  const supabase = await createSupabaseServerClient();
  if (cv.pdf_path) {
    await supabase.storage.from('pdf').remove([cv.pdf_path]);
  }

  const { error } = await supabase.from('cv').delete().eq('id', cvId).eq('user_id', userId);
  if (error) throw new Error(error.message);

  const { data: prefs } = await supabase
    .from('cv_preferences')
    .select('selected_cv_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefs?.selected_cv_id === null) {
    const fallback = await getDefaultCv(userId);
    await setSelectedCv(userId, fallback.id);
  }
}

export async function rewriteSummary({
  userId,
  cvId,
  summary,
}: {
  userId: string;
  cvId: string;
  summary: string | null;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ summary })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update summary');
  return data;
}

export async function updateIdentity({
  userId,
  cvId,
  patch,
}: {
  userId: string;
  cvId: string;
  patch: Pick<TablesUpdate<'cv'>, 'full_name' | 'location'>;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update CV identity');
  return data;
}

export async function updateContact({
  userId,
  cvId,
  patch,
}: {
  userId: string;
  cvId: string;
  patch: Pick<
    TablesUpdate<'cv'>,
    'phone' | 'contact_email' | 'linkedin_url' | 'github_url' | 'website_url'
  >;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update CV contact');
  return data;
}

export async function setTemplate({
  userId,
  cvId,
  template,
}: {
  userId: string;
  cvId: string;
  template: Database['public']['Enums']['cv_template'];
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ template, layout_json: null })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update template');
  return data;
}

export async function setLayout({
  userId,
  cvId,
  layoutJson,
}: {
  userId: string;
  cvId: string;
  layoutJson: unknown;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  // Mirror the layout's column count onto cv.template so the Library template
  // preset reflects and persists the AI layout choice. layout_json still wins
  // at render; template is the coarse single/two-column indicator the UI reads.
  const parsed = layoutSpecSchema.safeParse(layoutJson);
  const update: TablesUpdate<'cv'> = { layout_json: layoutJson as Json };
  if (parsed.success) {
    update.template = parsed.data.columns === 'two' ? 'two-column' : 'single-column';
  }
  const { data, error } = await supabase
    .from('cv')
    .update(update)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update layout');
  return data;
}

export async function clearLayout({
  userId,
  cvId,
}: {
  userId: string;
  cvId: string;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ layout_json: null })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to clear layout');
  return data;
}

export async function setFontSizes({
  userId,
  cvId,
  fontSizes,
}: {
  userId: string;
  cvId: string;
  fontSizes: FontSizes;
}): Promise<CvRow> {
  // Merge with any existing overrides so the caller can adjust one element
  // (e.g. just the header) without resetting the others.
  const existing = await getOwnedCv(userId, cvId);
  const current = fontSizesSchema.safeParse(existing.font_sizes ?? {});
  const merged: FontSizes = { ...(current.success ? current.data : {}), ...fontSizes };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ font_sizes: merged as Json })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update font sizes');
  return data;
}

export async function clearFontSizes({
  userId,
  cvId,
}: {
  userId: string;
  cvId: string;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ font_sizes: null })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to clear font sizes');
  return data;
}

export async function setAccentHex({
  userId,
  cvId,
  accentHex,
}: {
  userId: string;
  cvId: string;
  accentHex: string;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ accent_hex: accentHex })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update accent');
  return data;
}

export async function setDateFormat({
  userId,
  cvId,
  section,
  format,
}: {
  userId: string;
  cvId: string;
  section: 'education' | 'certification';
  format: Database['public']['Enums']['cv_date_format'];
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const patch: TablesUpdate<'cv'> =
    section === 'education'
      ? { education_date_format: format }
      : { certification_date_format: format };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(patch)
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update date format');
  return data;
}

export async function updateSummary({
  user,
  cvId,
  summary,
}: {
  user: User;
  cvId: string;
  summary: string | null;
}): Promise<CvRow> {
  await assertOwnedCv(user, cvId);
  if (summary !== null && summary.length > MAX_SUMMARY_LENGTH) {
    throw new ProfileContentError(`Summary must be at most ${MAX_SUMMARY_LENGTH} characters.`);
  }
  return rewriteSummary({ userId: user.id, cvId, summary });
}

export async function updateProfileIdentity({
  user,
  cvId,
  patch,
}: {
  user: User;
  cvId: string;
  patch: ProfileIdentityPatch;
}): Promise<CvRow> {
  await assertOwnedCv(user, cvId);
  const update: TablesUpdate<'cv'> = {};
  if (patch.fullName !== undefined) update.full_name = normaliseNullableString(patch.fullName);
  if (patch.location !== undefined) update.location = normaliseNullableString(patch.location);
  if (patch.phone !== undefined) update.phone = normaliseNullableString(patch.phone);
  if (patch.contactEmail !== undefined) {
    update.contact_email = normaliseNullableString(patch.contactEmail);
  }
  if (patch.linkedinUrl !== undefined) {
    update.linkedin_url = normaliseNullableString(patch.linkedinUrl);
  }
  if (patch.githubUrl !== undefined) {
    update.github_url = normaliseNullableString(patch.githubUrl);
  }
  if (patch.websiteUrl !== undefined) {
    update.website_url = normaliseNullableString(patch.websiteUrl);
  }
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No identity fields provided.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update(update)
    .eq('id', cvId)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update identity fields.');
  }
  return data;
}

export async function editExperienceBullet({
  user,
  cvId,
  experienceId,
  index,
  text,
  expectedText,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  index: number;
  text: string;
  expectedText?: string;
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  validateBulletText(text);
  const row = await loadExperience({ user, cvId, experienceId });
  const arr = toBulletArray(row.bullets);
  if (expectedText !== undefined && arr[index] !== expectedText) {
    throw new ProfileContentError(
      `Bullet mismatch: expected "${expectedText}" but found "${arr[index] ?? 'nothing'}" at index ${index}.`,
    );
  }
  const bullets = spliceReplace(arr, index, text);
  return persistExperienceBullets({ user, cvId, experienceId, bullets });
}

export async function addExperienceBullet({
  user,
  cvId,
  experienceId,
  text,
  index,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  text: string;
  index?: number;
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  validateBulletText(text);
  const row = await loadExperience({ user, cvId, experienceId });
  const bullets = spliceInsert(toBulletArray(row.bullets), text, index);
  return persistExperienceBullets({ user, cvId, experienceId, bullets });
}

export async function removeExperienceBullet({
  user,
  cvId,
  experienceId,
  index,
  expectedText,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  index: number;
  expectedText?: string;
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  const row = await loadExperience({ user, cvId, experienceId });
  const arr = toBulletArray(row.bullets);
  if (expectedText !== undefined && arr[index] !== expectedText) {
    throw new ProfileContentError(
      `Bullet mismatch: expected "${expectedText}" but found "${arr[index] ?? 'nothing'}" at index ${index}.`,
    );
  }
  const bullets = spliceRemove(arr, index);
  return persistExperienceBullets({ user, cvId, experienceId, bullets });
}

export async function editProjectBullet({
  user,
  cvId,
  projectId,
  index,
  text,
  expectedText,
}: {
  user: User;
  cvId: string;
  projectId: string;
  index: number;
  text: string;
  expectedText?: string;
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  validateBulletText(text);
  const row = await loadProject({ user, cvId, projectId });
  const arr = toBulletArray(row.bullets);
  if (expectedText !== undefined && arr[index] !== expectedText) {
    throw new ProfileContentError(
      `Bullet mismatch: expected "${expectedText}" but found "${arr[index] ?? 'nothing'}" at index ${index}.`,
    );
  }
  const bullets = spliceReplace(arr, index, text);
  return persistProjectBullets({ user, cvId, projectId, bullets });
}

export async function addProjectBullet({
  user,
  cvId,
  projectId,
  text,
  index,
}: {
  user: User;
  cvId: string;
  projectId: string;
  text: string;
  index?: number;
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  validateBulletText(text);
  const row = await loadProject({ user, cvId, projectId });
  const bullets = spliceInsert(toBulletArray(row.bullets), text, index);
  return persistProjectBullets({ user, cvId, projectId, bullets });
}

export async function removeProjectBullet({
  user,
  cvId,
  projectId,
  index,
  expectedText,
}: {
  user: User;
  cvId: string;
  projectId: string;
  index: number;
  expectedText?: string;
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  const row = await loadProject({ user, cvId, projectId });
  const arr = toBulletArray(row.bullets);
  if (expectedText !== undefined && arr[index] !== expectedText) {
    throw new ProfileContentError(
      `Bullet mismatch: expected "${expectedText}" but found "${arr[index] ?? 'nothing'}" at index ${index}.`,
    );
  }
  const bullets = spliceRemove(arr, index);
  return persistProjectBullets({ user, cvId, projectId, bullets });
}

export async function moveExperienceBullet({
  user,
  cvId,
  experienceId,
  fromIndex,
  toIndex,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  fromIndex: number;
  toIndex: number;
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  const row = await loadExperience({ user, cvId, experienceId });
  const bullets = spliceMove(toBulletArray(row.bullets), fromIndex, toIndex);
  return persistExperienceBullets({ user, cvId, experienceId, bullets });
}

export async function moveProjectBullet({
  user,
  cvId,
  projectId,
  fromIndex,
  toIndex,
}: {
  user: User;
  cvId: string;
  projectId: string;
  fromIndex: number;
  toIndex: number;
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  const row = await loadProject({ user, cvId, projectId });
  const bullets = spliceMove(toBulletArray(row.bullets), fromIndex, toIndex);
  return persistProjectBullets({ user, cvId, projectId, bullets });
}

export async function addExperience({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: {
    company: string;
    role: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    summary?: string | null;
    bullets?: string[];
    stack?: string[];
  };
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'experience' });
  const bullets = (payload.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);
  if (bullets.length > MAX_BULLETS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  for (const bullet of bullets) validateBulletText(bullet);

  const insertable: TablesInsert<'experience'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    company: payload.company.trim(),
    role: payload.role.trim(),
    location: normaliseNullableString(payload.location ?? null),
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    is_current: payload.isCurrent ?? false,
    summary: normaliseNullableString(payload.summary ?? null),
    bullets,
    stack: payload.stack ?? [],
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('experience').insert(insertable).select('*').single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add experience entry.');
  }
  return data;
}

export async function editExperience({
  user,
  cvId,
  experienceId,
  patch,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  patch: ExperiencePatch;
}): Promise<ExperienceRow> {
  await assertOwnedCv(user, cvId);
  await loadExperience({ user, cvId, experienceId });
  const update: TablesUpdate<'experience'> = {};
  if (patch.company !== undefined) {
    const trimmed = patch.company.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Company cannot be empty.');
    update.company = trimmed;
  }
  if (patch.role !== undefined) {
    const trimmed = patch.role.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Role cannot be empty.');
    update.role = trimmed;
  }
  if (patch.location !== undefined) update.location = normaliseNullableString(patch.location);
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.isCurrent !== undefined) update.is_current = patch.isCurrent;
  if (patch.summary !== undefined) update.summary = normaliseNullableString(patch.summary);
  if (patch.stack !== undefined) update.stack = patch.stack;
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('experience')
    .update(update)
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update experience entry.');
  }
  return data;
}

export async function removeExperience({
  user,
  cvId,
  experienceId,
}: {
  user: User;
  cvId: string;
  experienceId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadExperience({ user, cvId, experienceId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('experience')
    .delete()
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveExperience({
  user,
  cvId,
  experienceId,
  toIndex,
}: {
  user: User;
  cvId: string;
  experienceId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'experience', targetId: experienceId, toIndex });
}

export async function addProject({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: {
    name: string;
    description?: string | null;
    link?: string | null;
    bullets?: string[];
    stack?: string[];
  };
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'project' });
  const bullets = (payload.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);
  if (bullets.length > MAX_BULLETS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  for (const bullet of bullets) validateBulletText(bullet);

  const insertable: TablesInsert<'project'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    name: payload.name.trim(),
    description: normaliseNullableString(payload.description ?? null),
    link: normaliseNullableString(payload.link ?? null),
    bullets,
    stack: payload.stack ?? [],
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('project').insert(insertable).select('*').single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add project entry.');
  }
  return data;
}

export async function editProject({
  user,
  cvId,
  projectId,
  patch,
}: {
  user: User;
  cvId: string;
  projectId: string;
  patch: ProjectPatch;
}): Promise<ProjectRow> {
  await assertOwnedCv(user, cvId);
  await loadProject({ user, cvId, projectId });
  const update: TablesUpdate<'project'> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Name cannot be empty.');
    update.name = trimmed;
  }
  if (patch.description !== undefined) {
    update.description = normaliseNullableString(patch.description);
  }
  if (patch.link !== undefined) update.link = normaliseNullableString(patch.link);
  if (patch.stack !== undefined) update.stack = patch.stack;
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project')
    .update(update)
    .eq('id', projectId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update project entry.');
  }
  return data;
}

export async function removeProject({
  user,
  cvId,
  projectId,
}: {
  user: User;
  cvId: string;
  projectId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadProject({ user, cvId, projectId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('project')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveProject({
  user,
  cvId,
  projectId,
  toIndex,
}: {
  user: User;
  cvId: string;
  projectId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'project', targetId: projectId, toIndex });
}

export async function addSkill({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: { name: string; category?: string | null; level?: SkillLevel | null };
}): Promise<SkillRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'skill' });
  const insertable: TablesInsert<'skill'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    name: payload.name.trim(),
    category: normaliseNullableString(payload.category ?? null),
    level: payload.level ?? null,
  };
  if (insertable.name.length === 0) {
    throw new ProfileContentError('Skill name cannot be empty.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('skill').insert(insertable).select('*').single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add skill.');
  }
  return data;
}

export async function editSkill({
  user,
  cvId,
  skillId,
  patch,
}: {
  user: User;
  cvId: string;
  skillId: string;
  patch: SkillPatch;
}): Promise<SkillRow> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'skill', id: skillId });
  const update: TablesUpdate<'skill'> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Skill name cannot be empty.');
    update.name = trimmed;
  }
  if (patch.category !== undefined) {
    update.category = normaliseNullableString(patch.category);
  }
  if (patch.level !== undefined) update.level = patch.level;
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('skill')
    .update(update)
    .eq('id', skillId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update skill.');
  }
  return data;
}

export async function removeSkill({
  user,
  cvId,
  skillId,
}: {
  user: User;
  cvId: string;
  skillId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'skill', id: skillId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('skill')
    .delete()
    .eq('id', skillId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveSkill({
  user,
  cvId,
  skillId,
  toIndex,
}: {
  user: User;
  cvId: string;
  skillId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'skill', targetId: skillId, toIndex });
}

export async function addEducation({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: {
    institution: string;
    degree?: string | null;
    field?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    summary?: string | null;
  };
}): Promise<EducationRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'education' });
  const insertable: TablesInsert<'education'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    institution: payload.institution.trim(),
    degree: normaliseNullableString(payload.degree ?? null),
    field: normaliseNullableString(payload.field ?? null),
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    summary: normaliseNullableString(payload.summary ?? null),
  };
  if (insertable.institution.length === 0) {
    throw new ProfileContentError('Institution cannot be empty.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('education').insert(insertable).select('*').single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add education entry.');
  }
  return data;
}

export async function editEducation({
  user,
  cvId,
  educationId,
  patch,
}: {
  user: User;
  cvId: string;
  educationId: string;
  patch: EducationPatch;
}): Promise<EducationRow> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'education', id: educationId });
  const update: TablesUpdate<'education'> = {};
  if (patch.institution !== undefined) {
    const trimmed = patch.institution.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Institution cannot be empty.');
    update.institution = trimmed;
  }
  if (patch.degree !== undefined) update.degree = normaliseNullableString(patch.degree);
  if (patch.field !== undefined) update.field = normaliseNullableString(patch.field);
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.summary !== undefined) update.summary = normaliseNullableString(patch.summary);
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('education')
    .update(update)
    .eq('id', educationId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update education entry.');
  }
  return data;
}

export async function removeEducation({
  user,
  cvId,
  educationId,
}: {
  user: User;
  cvId: string;
  educationId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'education', id: educationId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('education')
    .delete()
    .eq('id', educationId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveEducation({
  user,
  cvId,
  educationId,
  toIndex,
}: {
  user: User;
  cvId: string;
  educationId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'education', targetId: educationId, toIndex });
}

export async function addCertification({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: {
    name: string;
    issuer?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    link?: string | null;
  };
}): Promise<CertificationRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'certification' });
  const insertable: TablesInsert<'certification'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    name: payload.name.trim(),
    issuer: normaliseNullableString(payload.issuer ?? null),
    issued_at: payload.issuedAt ?? null,
    expires_at: payload.expiresAt ?? null,
    link: normaliseNullableString(payload.link ?? null),
  };
  if (insertable.name.length === 0) {
    throw new ProfileContentError('Certification name cannot be empty.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('certification')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add certification.');
  }
  return data;
}

export async function editCertification({
  user,
  cvId,
  certificationId,
  patch,
}: {
  user: User;
  cvId: string;
  certificationId: string;
  patch: CertificationPatch;
}): Promise<CertificationRow> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'certification', id: certificationId });
  const update: TablesUpdate<'certification'> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Certification name cannot be empty.');
    update.name = trimmed;
  }
  if (patch.issuer !== undefined) update.issuer = normaliseNullableString(patch.issuer);
  if (patch.issuedAt !== undefined) update.issued_at = patch.issuedAt;
  if (patch.expiresAt !== undefined) update.expires_at = patch.expiresAt;
  if (patch.link !== undefined) update.link = normaliseNullableString(patch.link);
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('certification')
    .update(update)
    .eq('id', certificationId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update certification.');
  }
  return data;
}

export async function removeCertification({
  user,
  cvId,
  certificationId,
}: {
  user: User;
  cvId: string;
  certificationId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'certification', id: certificationId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('certification')
    .delete()
    .eq('id', certificationId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveCertification({
  user,
  cvId,
  certificationId,
  toIndex,
}: {
  user: User;
  cvId: string;
  certificationId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'certification', targetId: certificationId, toIndex });
}

export async function addLanguage({
  user,
  cvId,
  payload,
}: {
  user: User;
  cvId: string;
  payload: { name: string; proficiency?: LanguageProficiency | null };
}): Promise<LanguageRow> {
  await assertOwnedCv(user, cvId);
  const nextPosition = await assertCapAndNextPosition({ user, cvId, table: 'language' });
  const insertable: TablesInsert<'language'> = {
    user_id: user.id,
    cv_id: cvId,
    position: nextPosition,
    name: payload.name.trim(),
    proficiency: payload.proficiency ?? null,
  };
  if (insertable.name.length === 0) {
    throw new ProfileContentError('Language name cannot be empty.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('language').insert(insertable).select('*').single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add language.');
  }
  return data;
}

export async function editLanguage({
  user,
  cvId,
  languageId,
  patch,
}: {
  user: User;
  cvId: string;
  languageId: string;
  patch: LanguagePatch;
}): Promise<LanguageRow> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'language', id: languageId });
  const update: TablesUpdate<'language'> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (trimmed.length === 0) throw new ProfileContentError('Language name cannot be empty.');
    update.name = trimmed;
  }
  if (patch.proficiency !== undefined) update.proficiency = patch.proficiency;
  if (Object.keys(update).length === 0) {
    throw new ProfileContentError('No fields provided to edit.');
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('language')
    .update(update)
    .eq('id', languageId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update language.');
  }
  return data;
}

export async function removeLanguage({
  user,
  cvId,
  languageId,
}: {
  user: User;
  cvId: string;
  languageId: string;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await loadById({ user, cvId, table: 'language', id: languageId });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('language')
    .delete()
    .eq('id', languageId)
    .eq('user_id', user.id)
    .eq('cv_id', cvId);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveLanguage({
  user,
  cvId,
  languageId,
  toIndex,
}: {
  user: User;
  cvId: string;
  languageId: string;
  toIndex: number;
}): Promise<void> {
  await assertOwnedCv(user, cvId);
  await reorderRows({ user, cvId, table: 'language', targetId: languageId, toIndex });
}

export async function markPdfPath({
  userId,
  cvId,
  path,
}: {
  userId: string;
  cvId: string;
  path: string | null;
}): Promise<void> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv')
    .update({ pdf_path: path })
    .eq('id', cvId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
