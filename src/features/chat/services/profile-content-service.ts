import { getOrCreateProfile, type ProfileRow } from '@/features/profile/controllers/get-profile';
import type {
  ExperienceRow,
  ProjectRow,
} from '@/features/profile/controllers/get-profile-children';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Json } from '@/libs/supabase/types';
import type { User } from '@supabase/supabase-js';

import 'server-only';

const MAX_BULLETS = 50;
const MAX_BULLET_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 2000;

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

export { ProfileContentError };
