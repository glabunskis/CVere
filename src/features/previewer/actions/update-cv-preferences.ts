'use server';

import { revalidatePath } from 'next/cache';

import { applyCvPreferencesPatch, isEmptyPatch } from '@/features/chat/services/cv-preferences-service';
import { authActionClient } from '@/libs/safe-action';

import { renderAndUploadMasterCv } from '../render';
import { updateCvPreferencesSchema } from '../schemas';

export const updateCvPreferences = authActionClient
  .inputSchema(updateCvPreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (isEmptyPatch(parsedInput)) {
      return { ok: true as const };
    }

    await applyCvPreferencesPatch(ctx.user, parsedInput);
    await renderAndUploadMasterCv(ctx.user);

    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const };
  });
