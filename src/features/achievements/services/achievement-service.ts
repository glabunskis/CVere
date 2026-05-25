import type { z } from 'zod';

import type { AchievementRow } from '@/features/achievements/controllers/list-achievements';
import type { achievementSectionSchema } from '@/features/achievements/schemas';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { User } from '@supabase/supabase-js';

import 'server-only';

export type AchievementSection = z.infer<typeof achievementSectionSchema>;

export class AchievementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AchievementError';
  }
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
  achievementId,
  targetSectionOverride,
}: {
  user: User;
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
  const profile = await getOrCreateProfile();
  if (!profile) throw new AchievementError('Profile not available.');

  if (entry.status === 'integrated') {
    return { alreadyIntegrated: true, targetSection, entryText: entry.raw_text, cvId: profile.id };
  }

  const text = (entry.normalized_text ?? entry.raw_text).trim();

  if (targetSection === 'summary') {
    const next = [profile.summary?.trim(), text].filter(Boolean).join('\n\n');
    const { error } = await supabase
      .from('cv')
      .update({ summary: next })
      .eq('id', profile.id)
      .eq('user_id', user.id);
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'experience') {
    const { error } = await supabase.from('experience').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
      company: '[MISSING] company',
      role: '[MISSING] role',
      bullets: [text],
      stack: [],
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'project') {
    const { error } = await supabase.from('project').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
      name: text.slice(0, 60),
      description: text,
      bullets: [],
      stack: [],
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'skill') {
    const { error } = await supabase.from('skill').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
      name: text.slice(0, 80),
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'education') {
    const { error } = await supabase.from('education').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
      institution: '[MISSING] institution',
      summary: text,
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'certification') {
    const { error } = await supabase.from('certification').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
      name: text.slice(0, 200),
    });
    if (error) throw new AchievementError(error.message);
  } else if (targetSection === 'language') {
    const { error } = await supabase.from('language').insert({
      user_id: user.id,
      cv_id: profile.id,
      position: 0,
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

  return { alreadyIntegrated: false, targetSection, entryText: text, cvId: profile.id };
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
