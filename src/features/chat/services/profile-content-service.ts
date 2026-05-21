import { getOrCreateProfile, type ProfileRow } from '@/features/profile/controllers/get-profile';
import type {
  CertificationRow,
  EducationRow,
  ExperienceRow,
  LanguageRow,
  ProjectRow,
  SkillRow,
} from '@/features/profile/controllers/get-profile-children';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Json, TablesInsert, TablesUpdate } from '@/libs/supabase/types';
import type { User } from '@supabase/supabase-js';

import 'server-only';

const MAX_BULLETS = 50;
const MAX_BULLET_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 2000;
/**
 * Per-section cap. Comparable to the existing 50-bullet cap, kept small so
 * the model can't accidentally explode the profile. Reorder/move operations
 * also fan out one UPDATE per row, so this is also a practical cost ceiling.
 */
const MAX_SECTION_ROWS = 50;

class ProfileContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileContentError';
  }
}

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

/**
 * Update the user's profile summary. Persist only — never renders the PDF.
 */
export async function updateSummary({
  user,
  summary,
}: {
  user: User;
  summary: string | null;
}): Promise<ProfileRow> {
  if (summary !== null && summary.length > MAX_SUMMARY_LENGTH) {
    throw new ProfileContentError(`Summary must be at most ${MAX_SUMMARY_LENGTH} characters.`);
  }
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profile')
    .update({ summary })
    .eq('id', profile.id)
    .eq('user_id', user.id)
    .select(
      'id, user_id, summary, full_name, location, phone, contact_email, linkedin_url, github_url, website_url',
    )
    .single();
  if (error || !data) throw new ProfileContentError(error?.message ?? 'Failed to update summary.');
  return data;
}

async function loadExperience(user: User, experienceId: string): Promise<ExperienceRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('experience')
    .select('*')
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`Experience ${experienceId} not found.`);
  return data;
}

async function persistExperienceBullets(
  user: User,
  experienceId: string,
  bullets: string[],
): Promise<ExperienceRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('experience')
    .update({ bullets })
    .eq('id', experienceId)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update experience bullets.');
  }
  return data;
}

export async function editExperienceBullet({
  user,
  experienceId,
  index,
  text,
}: {
  user: User;
  experienceId: string;
  index: number;
  text: string;
}): Promise<ExperienceRow> {
  validateBulletText(text);
  const row = await loadExperience(user, experienceId);
  const bullets = spliceReplace(toBulletArray(row.bullets), index, text);
  return persistExperienceBullets(user, experienceId, bullets);
}

export async function addExperienceBullet({
  user,
  experienceId,
  text,
  index,
}: {
  user: User;
  experienceId: string;
  text: string;
  index?: number;
}): Promise<ExperienceRow> {
  validateBulletText(text);
  const row = await loadExperience(user, experienceId);
  const bullets = spliceInsert(toBulletArray(row.bullets), text, index);
  return persistExperienceBullets(user, experienceId, bullets);
}

export async function removeExperienceBullet({
  user,
  experienceId,
  index,
}: {
  user: User;
  experienceId: string;
  index: number;
}): Promise<ExperienceRow> {
  const row = await loadExperience(user, experienceId);
  const bullets = spliceRemove(toBulletArray(row.bullets), index);
  return persistExperienceBullets(user, experienceId, bullets);
}

async function loadProject(user: User, projectId: string): Promise<ProjectRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`Project ${projectId} not found.`);
  return data;
}

async function persistProjectBullets(
  user: User,
  projectId: string,
  bullets: string[],
): Promise<ProjectRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project')
    .update({ bullets })
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update project bullets.');
  }
  return data;
}

export async function editProjectBullet({
  user,
  projectId,
  index,
  text,
}: {
  user: User;
  projectId: string;
  index: number;
  text: string;
}): Promise<ProjectRow> {
  validateBulletText(text);
  const row = await loadProject(user, projectId);
  const bullets = spliceReplace(toBulletArray(row.bullets), index, text);
  return persistProjectBullets(user, projectId, bullets);
}

export async function addProjectBullet({
  user,
  projectId,
  text,
  index,
}: {
  user: User;
  projectId: string;
  text: string;
  index?: number;
}): Promise<ProjectRow> {
  validateBulletText(text);
  const row = await loadProject(user, projectId);
  const bullets = spliceInsert(toBulletArray(row.bullets), text, index);
  return persistProjectBullets(user, projectId, bullets);
}

export async function removeProjectBullet({
  user,
  projectId,
  index,
}: {
  user: User;
  projectId: string;
  index: number;
}): Promise<ProjectRow> {
  const row = await loadProject(user, projectId);
  const bullets = spliceRemove(toBulletArray(row.bullets), index);
  return persistProjectBullets(user, projectId, bullets);
}

/**
 * Reorder bullets inside an experience entry. `fromIndex` and `toIndex` are
 * 0-based; values past the end clamp to the last position.
 */
export async function moveExperienceBullet({
  user,
  experienceId,
  fromIndex,
  toIndex,
}: {
  user: User;
  experienceId: string;
  fromIndex: number;
  toIndex: number;
}): Promise<ExperienceRow> {
  const row = await loadExperience(user, experienceId);
  const bullets = spliceMove(toBulletArray(row.bullets), fromIndex, toIndex);
  return persistExperienceBullets(user, experienceId, bullets);
}

/**
 * Reorder bullets inside a project entry. `fromIndex` and `toIndex` are
 * 0-based; values past the end clamp to the last position.
 */
export async function moveProjectBullet({
  user,
  projectId,
  fromIndex,
  toIndex,
}: {
  user: User;
  projectId: string;
  fromIndex: number;
  toIndex: number;
}): Promise<ProjectRow> {
  const row = await loadProject(user, projectId);
  const bullets = spliceMove(toBulletArray(row.bullets), fromIndex, toIndex);
  return persistProjectBullets(user, projectId, bullets);
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

// =============================================================================
// Identity / contact fields
// =============================================================================

type ProfileIdentityPatch = {
  fullName?: string | null;
  location?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
};

/**
 * Patch one or more identity fields on the user's profile row. Empty strings
 * are coerced to `null` so the DB stays clean. Validation of email/URL shape
 * happens at the schema layer.
 */
export async function updateProfileIdentity({
  user,
  patch,
}: {
  user: User;
  patch: ProfileIdentityPatch;
}): Promise<ProfileRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');

  const update: TablesUpdate<'profile'> = {};
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
    .from('profile')
    .update(update)
    .eq('id', profile.id)
    .eq('user_id', user.id)
    .select(
      'id, user_id, summary, full_name, location, phone, contact_email, linkedin_url, github_url, website_url',
    )
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update identity fields.');
  }
  return data;
}

function normaliseNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// =============================================================================
// Experience / project entry lifecycle
// =============================================================================

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

/**
 * Add a new experience entry. Position is auto-assigned (max + 1) so the new
 * entry lands at the bottom; call `moveExperience` afterwards to reorder.
 */
export async function addExperience({
  user,
  payload,
}: {
  user: User;
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
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: countError } = await supabase
    .from('experience')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1);
  if (countError) throw new ProfileContentError(countError.message);
  const { count, error: totalError } = await supabase
    .from('experience')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (totalError) throw new ProfileContentError(totalError.message);
  if ((count ?? 0) >= MAX_SECTION_ROWS) {
    throw new ProfileContentError(
      `Cannot exceed ${MAX_SECTION_ROWS} experience entries.`,
    );
  }
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const bullets = (payload.bullets ?? []).map((b) => b.trim()).filter(Boolean);
  if (bullets.length > MAX_BULLETS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  for (const bullet of bullets) validateBulletText(bullet);

  const insertable: TablesInsert<'experience'> = {
    user_id: user.id,
    profile_id: profile.id,
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
  const { data, error } = await supabase
    .from('experience')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add experience entry.');
  }
  return data;
}

export async function editExperience({
  user,
  experienceId,
  patch,
}: {
  user: User;
  experienceId: string;
  patch: ExperiencePatch;
}): Promise<ExperienceRow> {
  await loadExperience(user, experienceId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update experience entry.');
  }
  return data;
}

export async function removeExperience({
  user,
  experienceId,
}: {
  user: User;
  experienceId: string;
}): Promise<void> {
  await loadExperience(user, experienceId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('experience')
    .delete()
    .eq('id', experienceId)
    .eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveExperience({
  user,
  experienceId,
  toIndex,
}: {
  user: User;
  experienceId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({
    user,
    table: 'experience',
    targetId: experienceId,
    toIndex,
  });
}

export async function addProject({
  user,
  payload,
}: {
  user: User;
  payload: {
    name: string;
    description?: string | null;
    link?: string | null;
    bullets?: string[];
    stack?: string[];
  };
}): Promise<ProjectRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: posError } = await supabase
    .from('project')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1);
  if (posError) throw new ProfileContentError(posError.message);
  const { count, error: countError } = await supabase
    .from('project')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (countError) throw new ProfileContentError(countError.message);
  if ((count ?? 0) >= MAX_SECTION_ROWS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_SECTION_ROWS} project entries.`);
  }
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const bullets = (payload.bullets ?? []).map((b) => b.trim()).filter(Boolean);
  if (bullets.length > MAX_BULLETS) {
    throw new ProfileContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  for (const bullet of bullets) validateBulletText(bullet);

  const insertable: TablesInsert<'project'> = {
    user_id: user.id,
    profile_id: profile.id,
    position: nextPosition,
    name: payload.name.trim(),
    description: normaliseNullableString(payload.description ?? null),
    link: normaliseNullableString(payload.link ?? null),
    bullets,
    stack: payload.stack ?? [],
  };
  const { data, error } = await supabase
    .from('project')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add project entry.');
  }
  return data;
}

export async function editProject({
  user,
  projectId,
  patch,
}: {
  user: User;
  projectId: string;
  patch: ProjectPatch;
}): Promise<ProjectRow> {
  await loadProject(user, projectId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update project entry.');
  }
  return data;
}

export async function removeProject({
  user,
  projectId,
}: {
  user: User;
  projectId: string;
}): Promise<void> {
  await loadProject(user, projectId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('project')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveProject({
  user,
  projectId,
  toIndex,
}: {
  user: User;
  projectId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({ user, table: 'project', targetId: projectId, toIndex });
}

// =============================================================================
// Skill / education / certification / language CRUD
// =============================================================================

type SkillLevel = NonNullable<TablesInsert<'skill'>['level']>;
type LanguageProficiency = NonNullable<TablesInsert<'language'>['proficiency']>;

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

export async function addSkill({
  user,
  payload,
}: {
  user: User;
  payload: { name: string; category?: string | null; level?: SkillLevel | null };
}): Promise<SkillRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');
  const nextPosition = await assertCapAndNextPosition(user, 'skill');
  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'skill'> = {
    user_id: user.id,
    profile_id: profile.id,
    position: nextPosition,
    name: payload.name.trim(),
    category: normaliseNullableString(payload.category ?? null),
    level: payload.level ?? null,
  };
  if (insertable.name.length === 0) {
    throw new ProfileContentError('Skill name cannot be empty.');
  }
  const { data, error } = await supabase
    .from('skill')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add skill.');
  }
  return data;
}

export async function editSkill({
  user,
  skillId,
  patch,
}: {
  user: User;
  skillId: string;
  patch: SkillPatch;
}): Promise<SkillRow> {
  await loadById(user, 'skill', skillId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update skill.');
  }
  return data;
}

export async function removeSkill({
  user,
  skillId,
}: {
  user: User;
  skillId: string;
}): Promise<void> {
  await loadById(user, 'skill', skillId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('skill').delete().eq('id', skillId).eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveSkill({
  user,
  skillId,
  toIndex,
}: {
  user: User;
  skillId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({ user, table: 'skill', targetId: skillId, toIndex });
}

export async function addEducation({
  user,
  payload,
}: {
  user: User;
  payload: {
    institution: string;
    degree?: string | null;
    field?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    summary?: string | null;
  };
}): Promise<EducationRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');
  const nextPosition = await assertCapAndNextPosition(user, 'education');
  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'education'> = {
    user_id: user.id,
    profile_id: profile.id,
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
  const { data, error } = await supabase
    .from('education')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add education entry.');
  }
  return data;
}

export async function editEducation({
  user,
  educationId,
  patch,
}: {
  user: User;
  educationId: string;
  patch: EducationPatch;
}): Promise<EducationRow> {
  await loadById(user, 'education', educationId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update education entry.');
  }
  return data;
}

export async function removeEducation({
  user,
  educationId,
}: {
  user: User;
  educationId: string;
}): Promise<void> {
  await loadById(user, 'education', educationId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('education')
    .delete()
    .eq('id', educationId)
    .eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveEducation({
  user,
  educationId,
  toIndex,
}: {
  user: User;
  educationId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({ user, table: 'education', targetId: educationId, toIndex });
}

export async function addCertification({
  user,
  payload,
}: {
  user: User;
  payload: {
    name: string;
    issuer?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    link?: string | null;
  };
}): Promise<CertificationRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');
  const nextPosition = await assertCapAndNextPosition(user, 'certification');
  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'certification'> = {
    user_id: user.id,
    profile_id: profile.id,
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
  certificationId,
  patch,
}: {
  user: User;
  certificationId: string;
  patch: CertificationPatch;
}): Promise<CertificationRow> {
  await loadById(user, 'certification', certificationId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update certification.');
  }
  return data;
}

export async function removeCertification({
  user,
  certificationId,
}: {
  user: User;
  certificationId: string;
}): Promise<void> {
  await loadById(user, 'certification', certificationId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('certification')
    .delete()
    .eq('id', certificationId)
    .eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveCertification({
  user,
  certificationId,
  toIndex,
}: {
  user: User;
  certificationId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({ user, table: 'certification', targetId: certificationId, toIndex });
}

export async function addLanguage({
  user,
  payload,
}: {
  user: User;
  payload: { name: string; proficiency?: LanguageProficiency | null };
}): Promise<LanguageRow> {
  const profile = await getOrCreateProfile();
  if (!profile) throw new ProfileContentError('Profile not available.');
  const nextPosition = await assertCapAndNextPosition(user, 'language');
  const supabase = await createSupabaseServerClient();
  const insertable: TablesInsert<'language'> = {
    user_id: user.id,
    profile_id: profile.id,
    position: nextPosition,
    name: payload.name.trim(),
    proficiency: payload.proficiency ?? null,
  };
  if (insertable.name.length === 0) {
    throw new ProfileContentError('Language name cannot be empty.');
  }
  const { data, error } = await supabase
    .from('language')
    .insert(insertable)
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to add language.');
  }
  return data;
}

export async function editLanguage({
  user,
  languageId,
  patch,
}: {
  user: User;
  languageId: string;
  patch: LanguagePatch;
}): Promise<LanguageRow> {
  await loadById(user, 'language', languageId);
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
    .select('*')
    .single();
  if (error || !data) {
    throw new ProfileContentError(error?.message ?? 'Failed to update language.');
  }
  return data;
}

export async function removeLanguage({
  user,
  languageId,
}: {
  user: User;
  languageId: string;
}): Promise<void> {
  await loadById(user, 'language', languageId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('language')
    .delete()
    .eq('id', languageId)
    .eq('user_id', user.id);
  if (error) throw new ProfileContentError(error.message);
}

export async function moveLanguage({
  user,
  languageId,
  toIndex,
}: {
  user: User;
  languageId: string;
  toIndex: number;
}): Promise<void> {
  await reorderRows({ user, table: 'language', targetId: languageId, toIndex });
}

// =============================================================================
// Shared reorder/cap helpers
// =============================================================================

type OrderedTable =
  | 'experience'
  | 'project'
  | 'skill'
  | 'education'
  | 'certification'
  | 'language';

async function assertCapAndNextPosition(user: User, table: OrderedTable): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (countError) throw new ProfileContentError(countError.message);
  if ((count ?? 0) >= MAX_SECTION_ROWS) {
    throw new ProfileContentError(
      `Cannot exceed ${MAX_SECTION_ROWS} ${table} entries.`,
    );
  }
  const { data, error } = await supabase
    .from(table)
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1);
  if (error) throw new ProfileContentError(error.message);
  if (!data || data.length === 0) return 0;
  return data[0].position + 1;
}

async function loadById(
  user: User,
  table: OrderedTable,
  id: string,
): Promise<{ id: string; user_id: string; position: number }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, user_id, position')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ProfileContentError(error.message);
  if (!data) throw new ProfileContentError(`${table} ${id} not found.`);
  return data;
}

/**
 * Reorder rows of `table` so `targetId` lives at `toIndex`. Re-writes every
 * row's `position` to its new 0-based index to keep ordering dense. With the
 * 50-row cap this is at most 50 single-column UPDATEs per move.
 */
async function reorderRows({
  user,
  table,
  targetId,
  toIndex,
}: {
  user: User;
  table: OrderedTable;
  targetId: string;
  toIndex: number;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, position')
    .eq('user_id', user.id)
    .order('position', { ascending: true });
  if (error) throw new ProfileContentError(error.message);
  const rows = data ?? [];
  const fromIndex = rows.findIndex((r) => r.id === targetId);
  if (fromIndex < 0) {
    throw new ProfileContentError(`${table} ${targetId} not found.`);
  }
  const reordered = [...rows];
  const [moved] = reordered.splice(fromIndex, 1);
  const safeTo = Math.max(0, Math.min(toIndex, reordered.length));
  reordered.splice(safeTo, 0, moved);

  const updates = reordered
    .map((row, index) => ({ id: row.id, oldPosition: row.position, newPosition: index }))
    .filter((u) => u.oldPosition !== u.newPosition);
  if (updates.length === 0) return;

  await Promise.all(
    updates.map(({ id, newPosition }) =>
      supabase
        .from(table)
        .update({ position: newPosition })
        .eq('id', id)
        .eq('user_id', user.id),
    ),
  );
}

export { ProfileContentError };
