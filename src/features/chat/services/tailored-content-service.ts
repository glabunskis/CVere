import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { logger } from '@/libs/logger';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Json, Tables, TablesUpdate } from '@/libs/supabase/types';
import type { User } from '@supabase/supabase-js';

import {
  applySectionsToSnapshot,
  buildTailoredSnapshot,
  readTailoredSnapshot,
  type TailoredSections,
  tailoredSectionsSchema,
  type TailoredSnapshot,
} from '../tailored-snapshot';

import 'server-only';

const MAX_BULLETS = 50;
const MAX_BULLET_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 2000;

type TailoredCvRow = Tables<'tailored_cv'>;

type TailoredStylePatch = {
  template?: 'single-column' | 'two-column' | null;
  accentHex?: string | null;
};

class TailoredContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TailoredContentError';
  }
}

function normaliseTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    throw new TailoredContentError('Title cannot be empty.');
  }
  return trimmed.slice(0, 120);
}

function parseSections(raw: Json | null | undefined): TailoredSections {
  const parsed = tailoredSectionsSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new TailoredContentError('Tailored CV sections are invalid.');
  }
  return parsed.data;
}

function validateSummary(summary: string | null): void {
  if (summary === null) return;
  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    throw new TailoredContentError('Summary cannot be empty.');
  }
  if (trimmed.length > MAX_SUMMARY_LENGTH) {
    throw new TailoredContentError(`Summary must be at most ${MAX_SUMMARY_LENGTH} characters.`);
  }
}

function validateBulletText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new TailoredContentError('Bullet text cannot be empty.');
  }
  if (trimmed.length > MAX_BULLET_LENGTH) {
    throw new TailoredContentError(`Bullet text must be at most ${MAX_BULLET_LENGTH} characters.`);
  }
  return trimmed;
}

function spliceInsert(bullets: string[], text: string, index?: number): string[] {
  if (bullets.length >= MAX_BULLETS) {
    throw new TailoredContentError(`Cannot exceed ${MAX_BULLETS} bullets.`);
  }
  const next = [...bullets];
  if (index === undefined || index >= next.length) {
    next.push(text);
    return next;
  }
  next.splice(Math.max(0, index), 0, text);
  return next;
}

function spliceReplace(bullets: string[], index: number, text: string): string[] {
  if (index < 0 || index >= bullets.length) {
    throw new TailoredContentError(
      `Bullet index ${index} is out of range (have ${bullets.length}).`,
    );
  }
  const next = [...bullets];
  next[index] = text;
  return next;
}

function spliceRemove(bullets: string[], index: number): string[] {
  if (index < 0 || index >= bullets.length) {
    throw new TailoredContentError(
      `Bullet index ${index} is out of range (have ${bullets.length}).`,
    );
  }
  const next = [...bullets];
  next.splice(index, 1);
  return next;
}

async function loadTailoredCv(user: User, tailoredCvId: string): Promise<TailoredCvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .select('*')
    .eq('id', tailoredCvId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    throw new TailoredContentError(error.message);
  }
  if (!data) {
    throw new TailoredContentError(`Tailored CV ${tailoredCvId} not found.`);
  }
  return data;
}

async function persistTailoredUpdate(
  user: User,
  tailoredCvId: string,
  update: TablesUpdate<'tailored_cv'>,
): Promise<TailoredCvRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .update(update)
    .eq('id', tailoredCvId)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error || !data) {
    throw new TailoredContentError(error?.message ?? 'Failed to update tailored CV.');
  }
  return data;
}

function getExperienceBullets(snapshot: TailoredSnapshot, sections: TailoredSections, experienceId: string) {
  const base = snapshot.profile.experience.find((item) => item.id === experienceId);
  if (!base) {
    throw new TailoredContentError(`Experience ${experienceId} not found in tailored snapshot.`);
  }
  const override = sections.experience?.find((item) => item.id === experienceId);
  return { base, override, bullets: [...(override?.bullets ?? base.bullets)] };
}

function getProjectBullets(snapshot: TailoredSnapshot, sections: TailoredSections, projectId: string) {
  const base = snapshot.profile.projects.find((item) => item.id === projectId);
  if (!base) {
    throw new TailoredContentError(`Project ${projectId} not found in tailored snapshot.`);
  }
  const override = sections.projects?.find((item) => item.id === projectId);
  return { base, override, bullets: [...(override?.bullets ?? base.bullets)] };
}

function upsertExperienceOverride(
  sections: TailoredSections,
  experienceId: string,
  bullets: string[],
): TailoredSections {
  const experience = [...(sections.experience ?? [])];
  const index = experience.findIndex((item) => item.id === experienceId);
  if (index >= 0) {
    experience[index] = { ...experience[index], bullets };
  } else {
    experience.push({ id: experienceId, bullets });
  }
  return {
    ...sections,
    experience,
    projects: sections.projects ? [...sections.projects] : undefined,
  };
}

function upsertProjectOverride(
  sections: TailoredSections,
  projectId: string,
  bullets: string[],
): TailoredSections {
  const projects = [...(sections.projects ?? [])];
  const index = projects.findIndex((item) => item.id === projectId);
  if (index >= 0) {
    projects[index] = { ...projects[index], bullets };
  } else {
    projects.push({ id: projectId, bullets });
  }
  return {
    ...sections,
    projects,
    experience: sections.experience ? [...sections.experience] : undefined,
  };
}

export async function listTailoredCvs(user: User): Promise<TailoredCvRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) {
    throw new TailoredContentError(error.message);
  }
  return data ?? [];
}

export async function createTailoredCv({
  user,
  title,
  jobDescriptionId,
}: {
  user: User;
  title: string;
  jobDescriptionId?: string;
}): Promise<TailoredCvRow> {
  const profile = await getOrCreateProfile();
  if (!profile) {
    throw new TailoredContentError('Profile not available.');
  }

  if (jobDescriptionId) {
    const supabase = await createSupabaseServerClient();
    const { data: vacancy, error: vacancyError } = await supabase
      .from('job_description')
      .select('id')
      .eq('id', jobDescriptionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (vacancyError) {
      throw new TailoredContentError(vacancyError.message);
    }
    if (!vacancy) {
      throw new TailoredContentError(`Vacancy ${jobDescriptionId} not found.`);
    }
  }

  const children = await getProfileChildren(profile.id);
  const userMetadata = (user.user_metadata ?? {}) as { full_name?: string };
  const identityName = profile.full_name ?? userMetadata.full_name ?? user.email ?? '[MISSING] name';

  const snapshot = buildTailoredSnapshot({
    profile,
    children,
    identityName,
    fallbackEmail: user.email ?? null,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .insert({
      user_id: user.id,
      job_description_id: jobDescriptionId ?? null,
      title: normaliseTitle(title),
      source_profile_snapshot: snapshot as unknown as Json,
      summary: null,
      sections: {},
      accent_hex: null,
      template: null,
      pdf_path: null,
    })
    .select('*')
    .single();
  if (error || !data) {
    throw new TailoredContentError(error?.message ?? 'Failed to create tailored CV.');
  }
  return data;
}

export async function readTailoredCv({
  user,
  tailoredCvId,
}: {
  user: User;
  tailoredCvId: string;
}): Promise<{
  row: TailoredCvRow;
  snapshot: TailoredSnapshot;
  sections: TailoredSections;
  mergedProfile: ReturnType<typeof applySectionsToSnapshot>;
}> {
  const row = await loadTailoredCv(user, tailoredCvId);
  const snapshot = readTailoredSnapshot(row.source_profile_snapshot);
  const sections = parseSections(row.sections);
  const mergedProfile = applySectionsToSnapshot({
    snapshot,
    sections,
    summary: row.summary,
  });
  return { row, snapshot, sections, mergedProfile };
}

export async function updateTailoredSummary({
  user,
  tailoredCvId,
  summary,
}: {
  user: User;
  tailoredCvId: string;
  summary: string | null;
}): Promise<TailoredCvRow> {
  validateSummary(summary);
  return persistTailoredUpdate(user, tailoredCvId, { summary });
}

export async function editTailoredExperienceBullet({
  user,
  tailoredCvId,
  experienceId,
  index,
  text,
}: {
  user: User;
  tailoredCvId: string;
  experienceId: string;
  index: number;
  text: string;
}): Promise<TailoredCvRow> {
  const trimmed = validateBulletText(text);
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getExperienceBullets(snapshot, sections, experienceId);
  const nextBullets = spliceReplace(current.bullets, index, trimmed);
  const nextSections = upsertExperienceOverride(sections, experienceId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function addTailoredExperienceBullet({
  user,
  tailoredCvId,
  experienceId,
  text,
  index,
}: {
  user: User;
  tailoredCvId: string;
  experienceId: string;
  text: string;
  index?: number;
}): Promise<TailoredCvRow> {
  const trimmed = validateBulletText(text);
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getExperienceBullets(snapshot, sections, experienceId);
  const nextBullets = spliceInsert(current.bullets, trimmed, index);
  const nextSections = upsertExperienceOverride(sections, experienceId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function removeTailoredExperienceBullet({
  user,
  tailoredCvId,
  experienceId,
  index,
}: {
  user: User;
  tailoredCvId: string;
  experienceId: string;
  index: number;
}): Promise<TailoredCvRow> {
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getExperienceBullets(snapshot, sections, experienceId);
  const nextBullets = spliceRemove(current.bullets, index);
  const nextSections = upsertExperienceOverride(sections, experienceId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function editTailoredProjectBullet({
  user,
  tailoredCvId,
  projectId,
  index,
  text,
}: {
  user: User;
  tailoredCvId: string;
  projectId: string;
  index: number;
  text: string;
}): Promise<TailoredCvRow> {
  const trimmed = validateBulletText(text);
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getProjectBullets(snapshot, sections, projectId);
  const nextBullets = spliceReplace(current.bullets, index, trimmed);
  const nextSections = upsertProjectOverride(sections, projectId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function addTailoredProjectBullet({
  user,
  tailoredCvId,
  projectId,
  text,
  index,
}: {
  user: User;
  tailoredCvId: string;
  projectId: string;
  text: string;
  index?: number;
}): Promise<TailoredCvRow> {
  const trimmed = validateBulletText(text);
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getProjectBullets(snapshot, sections, projectId);
  const nextBullets = spliceInsert(current.bullets, trimmed, index);
  const nextSections = upsertProjectOverride(sections, projectId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function removeTailoredProjectBullet({
  user,
  tailoredCvId,
  projectId,
  index,
}: {
  user: User;
  tailoredCvId: string;
  projectId: string;
  index: number;
}): Promise<TailoredCvRow> {
  const { row, snapshot, sections } = await readTailoredCv({ user, tailoredCvId });
  const current = getProjectBullets(snapshot, sections, projectId);
  const nextBullets = spliceRemove(current.bullets, index);
  const nextSections = upsertProjectOverride(sections, projectId, nextBullets);
  return persistTailoredUpdate(user, row.id, { sections: nextSections as unknown as Json });
}

export async function applyTailoredStylePatch({
  user,
  tailoredCvId,
  patch,
}: {
  user: User;
  tailoredCvId: string;
  patch: TailoredStylePatch;
}): Promise<TailoredCvRow> {
  const update: TablesUpdate<'tailored_cv'> = {};
  if (patch.template !== undefined) {
    update.template = patch.template;
  }
  if (patch.accentHex !== undefined) {
    update.accent_hex = patch.accentHex;
  }
  return persistTailoredUpdate(user, tailoredCvId, update);
}

export async function renameTailoredCv({
  user,
  tailoredCvId,
  title,
}: {
  user: User;
  tailoredCvId: string;
  title: string;
}): Promise<TailoredCvRow> {
  return persistTailoredUpdate(user, tailoredCvId, { title: normaliseTitle(title) });
}

export async function deleteTailoredCv({
  user,
  tailoredCvId,
}: {
  user: User;
  tailoredCvId: string;
}): Promise<void> {
  const row = await loadTailoredCv(user, tailoredCvId);
  const supabase = await createSupabaseServerClient();

  if (row.pdf_path) {
    const { error: storageError } = await supabase.storage.from('pdf').remove([row.pdf_path]);
    if (storageError) {
      logger.warn(
        { err: storageError, userId: user.id, tailoredCvId, path: row.pdf_path },
        'tailored-content failed to delete pdf blob',
      );
    }
  }

  const { error: deleteError } = await supabase
    .from('tailored_cv')
    .delete()
    .eq('id', tailoredCvId)
    .eq('user_id', user.id);
  if (deleteError) {
    throw new TailoredContentError(deleteError.message);
  }

  const { error: preferencesError } = await supabase
    .from('cv_preferences')
    .update({ last_previewed_kind: 'master', last_previewed_ref_id: null })
    .eq('user_id', user.id)
    .eq('last_previewed_kind', 'tailored_cv')
    .eq('last_previewed_ref_id', tailoredCvId);
  if (preferencesError) {
    throw new TailoredContentError(preferencesError.message);
  }
}
