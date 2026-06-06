import type { z } from 'zod';

import type { AchievementRow } from '@/features/achievements/controllers/list-achievements';
import type { achievementSectionSchema } from '@/features/achievements/schemas';
import { getCv, getSelectedCv } from '@/features/cv/services/cv-service';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { User } from '@supabase/supabase-js';

import 'server-only';

export type AchievementSection = z.infer<typeof achievementSectionSchema>;
const MAX_SECTION_ROWS = 50;

type OrderedTable = 'experience' | 'project' | 'skill' | 'education' | 'certification' | 'language';

export class AchievementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AchievementError';
  }
}

async function assertCapAndNextPosition({
  supabase,
  userId,
  cvId,
  table,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  cvId: string;
  table: OrderedTable;
}): Promise<number> {
  const { count, error: countError } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('cv_id', cvId);
  if (countError) throw new AchievementError(countError.message);
  if ((count ?? 0) >= MAX_SECTION_ROWS) {
    throw new AchievementError(`Cannot exceed ${MAX_SECTION_ROWS} ${table} entries.`);
  }

  const { data, error } = await supabase
    .from(table)
    .select('position')
    .eq('user_id', userId)
    .eq('cv_id', cvId)
    .order('position', { ascending: false })
    .limit(1);
  if (error) throw new AchievementError(error.message);
  if (!data || data.length === 0) return 0;
  return data[0].position + 1;
}

export type IntegrateResult = {
  alreadyIntegrated: boolean;
  targetSection: AchievementSection;
  entryText: string;
  cvId: string;
};

/**
 * Apply an achievement to the chosen section. Shared by:
 * - the `/achievements` page safe-action (which revalidates affected paths)
 * - the chat `integrateAchievement` tool (route renders PDF at end of turn)
 *
 * Placeholders like "[MISSING] company" survive on `experience`/`education`
 * inserts — they're tracked separately as a polish-track copy fix.
 */
export async function integrateAchievementById({
  user,
  cvId,
  achievementId,
  targetSectionOverride,
}: {
  user: User;
  cvId?: string;
  achievementId: string;
  targetSectionOverride?: AchievementSection;
}): Promise<IntegrateResult> {
  const supabase = await createSupabaseServerClient();

  const { data: entry, error: fetchError } = await supabase
    .from('achievement_log_entry')
    .select('*')
    .eq('id', achievementId)
    .eq('user_id', user.id)
    .single();
  if (fetchError || !entry) {
    throw new AchievementError(fetchError?.message ?? 'Achievement not found.');
  }

  const targetSection: AchievementSection | null =
    targetSectionOverride ?? entry.target_section;
  if (!targetSection) {
    throw new AchievementError(
      'No target section set on this achievement. Pass targetSection explicitly.',
    );
  }
  const cv = cvId ? await getCv(cvId, user.id) : await getSelectedCv(user.id);

  if (entry.status === 'integrated') {
    return { alreadyIntegrated: true, targetSection, entryText: entry.raw_text, cvId: cv.id };
  }

  const text = (entry.normalized_text ?? entry.raw_text).trim();

  if (targetSection === 'summary') {
    const next = [cv.summary?.trim(), text].filter(Boolean).join('\n\n');
    const { error } = await supabase
      .from('cv')
      .update({ summary: next })
      .eq('id', cv.id)
      .eq('user_id', user.id);
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'experience') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'experience',
    });
    const { error } = await supabase.from('experience').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      company: '[MISSING] company',
      role: '[MISSING] role',
      bullets: [text],
      stack: [],
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'project') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'project',
    });
    const { error } = await supabase.from('project').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      name: text.slice(0, 60),
      description: text,
      bullets: [],
      stack: [],
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'skill') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'skill',
    });
    const { error } = await supabase.from('skill').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      name: text.slice(0, 80),
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'education') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'education',
    });
    const { error } = await supabase.from('education').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      institution: '[MISSING] institution',
      summary: text,
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'certification') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'certification',
    });
    const { error } = await supabase.from('certification').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      name: text.slice(0, 200),
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'language') {
    const nextPosition = await assertCapAndNextPosition({
      supabase,
      userId: user.id,
      cvId: cv.id,
      table: 'language',
    });
    const { error } = await supabase.from('language').insert({
      user_id: user.id,
      cv_id: cv.id,
      position: nextPosition,
      name: text.slice(0, 80),
    });
    if (error) throw new AchievementError(error.message);
  }

  const { error: updateError } = await supabase
    .from('achievement_log_entry')
    .update({
      status: 'integrated',
      integrated_at: new Date().toISOString(),
      target_section: targetSection,
    })
    .eq('id', achievementId)
    .eq('user_id', user.id);
  if (updateError) throw new AchievementError(updateError.message);

  return { alreadyIntegrated: false, targetSection, entryText: text, cvId: cv.id };
}

export async function dismissAchievementById({
  user,
  achievementId,
}: {
  user: User;
  achievementId: string;
}): Promise<{ alreadyDismissed: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data: entry, error: fetchError } = await supabase
    .from('achievement_log_entry')
    .select('id, status')
    .eq('id', achievementId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (fetchError) throw new AchievementError(fetchError.message);
  if (!entry) throw new AchievementError('Achievement not found.');
  if (entry.status === 'dismissed') return { alreadyDismissed: true };

  const { error } = await supabase
    .from('achievement_log_entry')
    .update({ status: 'dismissed' })
    .eq('id', achievementId)
    .eq('user_id', user.id);
  if (error) throw new AchievementError(error.message);
  return { alreadyDismissed: false };
}

export async function listPendingAchievementRows({
  user,
}: {
  user: User;
}): Promise<AchievementRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('achievement_log_entry')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new AchievementError(error.message);
  return data ?? [];
}
