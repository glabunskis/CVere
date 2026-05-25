'use server';

import { revalidatePath } from 'next/cache';

import {
  dismissAchievementById,
  integrateAchievementById,
} from '@/features/achievements/services/achievement-service';
import { renderAndUploadCv } from '@/features/previewer/render';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  addAchievementSchema,
  dismissAchievementSchema,
  integrateAchievementSchema,
} from '../schemas';

export const addAchievement = authActionClient
  .inputSchema(addAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from('achievement_log_entry').insert({
      user_id: ctx.user.id,
      raw_text: parsedInput.rawText,
      normalized_text: null,
      target_section: null,
      status: 'pending',
    });
    if (error) throw new Error(error.message);

    revalidatePath('/achievements');
    revalidatePath('/dashboard');
    return { ok: true as const };
  });

export const dismissAchievement = authActionClient
  .inputSchema(dismissAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    await dismissAchievementById({ user: ctx.user, achievementId: parsedInput.id });
    revalidatePath('/achievements');
    revalidatePath('/dashboard');
    return { ok: true as const };
  });

export const integrateAchievement = authActionClient
  .inputSchema(integrateAchievementSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await integrateAchievementById({
      user: ctx.user,
      achievementId: parsedInput.id,
      targetSectionOverride: parsedInput.targetSection,
    });
    await renderAndUploadCv({ user: ctx.user, cvId: result.cvId });

    revalidatePath('/achievements');
    revalidatePath('/profile');
    revalidatePath('/dashboard');
    return { ok: true as const, alreadyIntegrated: result.alreadyIntegrated };
  });
