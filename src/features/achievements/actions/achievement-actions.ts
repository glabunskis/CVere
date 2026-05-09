'use server';

import { revalidatePath } from 'next/cache';

import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  addAchievementSchema,
  dismissAchievementSchema,
  integrateAchievementSchema,
} from '../schemas';

export const addAchievement = authActionClient
  .schema(addAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const ai = getAiProvider();
    const normalized = await ai.normalizeAchievement({ rawText: parsedInput.rawText });

    const { error } = await supabase.from('achievement_log_entry').insert({
      user_id: ctx.user.id,
      raw_text: parsedInput.rawText,
      normalized_text: normalized.normalizedText,
      target_section: normalized.suggestedSection,
      status: 'pending',
    });
    if (error) throw new Error(error.message);

    revalidatePath('/achievements');
    revalidatePath('/dashboard');
    return { ok: true as const };
  });

export const dismissAchievement = authActionClient
  .schema(dismissAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('achievement_log_entry')
      .update({ status: 'dismissed' })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/achievements');
    revalidatePath('/dashboard');
    return { ok: true as const };
  });

export const integrateAchievement = authActionClient
  .schema(integrateAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    const { data: entry, error: fetchError } = await supabase
      .from('achievement_log_entry')
      .select('*')
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id)
      .single();
    if (fetchError || !entry) throw new Error(fetchError?.message ?? 'Achievement not found');
    if (entry.status === 'integrated') {
      return { ok: true as const, alreadyIntegrated: true };
    }

    const targetSection = parsedInput.targetSection ?? entry.target_section;
    if (!targetSection) {
      throw new Error('No target section set on this achievement. Set one to integrate.');
    }

    const profile = await getOrCreateProfile();
    if (!profile) throw new Error('Profile not available');

    const text = (entry.normalized_text ?? entry.raw_text).trim();

    if (targetSection === 'summary') {
      const next = [profile.summary?.trim(), text].filter(Boolean).join('\n\n');
      const { error } = await supabase
        .from('profile')
        .update({ summary: next })
        .eq('id', profile.id)
        .eq('user_id', ctx.user.id);
      if (error) throw new Error(error.message);
    } else if (targetSection === 'experience') {
      const { error } = await supabase.from('experience').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        company: '[MISSING] company',
        role: '[MISSING] role',
        bullets: [text],
        stack: [],
      });
      if (error) throw new Error(error.message);
    } else if (targetSection === 'project') {
      const { error } = await supabase.from('project').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        name: text.slice(0, 60),
        description: text,
        bullets: [],
        stack: [],
      });
      if (error) throw new Error(error.message);
    } else if (targetSection === 'skill') {
      const { error } = await supabase.from('skill').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        name: text.slice(0, 80),
      });
      if (error) throw new Error(error.message);
    } else if (targetSection === 'education') {
      const { error } = await supabase.from('education').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        institution: '[MISSING] institution',
        summary: text,
      });
      if (error) throw new Error(error.message);
    } else if (targetSection === 'certification') {
      const { error } = await supabase.from('certification').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        name: text.slice(0, 200),
      });
      if (error) throw new Error(error.message);
    } else if (targetSection === 'language') {
      const { error } = await supabase.from('language').insert({
        user_id: ctx.user.id,
        profile_id: profile.id,
        position: 0,
        name: text.slice(0, 80),
      });
      if (error) throw new Error(error.message);
    }

    const { error: updateError } = await supabase
      .from('achievement_log_entry')
      .update({ status: 'integrated', integrated_at: new Date().toISOString(), target_section: targetSection })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath('/achievements');
    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return { ok: true as const };
  });
