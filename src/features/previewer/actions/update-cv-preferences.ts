'use server';

import { revalidatePath } from 'next/cache';

import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import type { CvDateFormat } from '@/utils/format-date';

import { renderAndUploadMasterCv } from '../render';
import { updateCvPreferencesSchema } from '../schemas';

export const updateCvPreferences = authActionClient
  .inputSchema(updateCvPreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (
      parsedInput.template === undefined &&
      parsedInput.accentHex === undefined &&
      parsedInput.pinnedTailoredCvId === undefined &&
      parsedInput.educationDateFormat === undefined &&
      parsedInput.certificationDateFormat === undefined
    ) {
      return { ok: true as const };
    }

    const supabase = await createSupabaseServerClient();

    const update: {
      template?: 'single-column' | 'two-column';
      accent_hex?: string;
      pinned_tailored_cv_id?: string | null;
      education_date_format?: CvDateFormat;
      certification_date_format?: CvDateFormat;
    } = {};
    if (parsedInput.template !== undefined) update.template = parsedInput.template;
    if (parsedInput.accentHex !== undefined) update.accent_hex = parsedInput.accentHex;
    if (parsedInput.pinnedTailoredCvId !== undefined) update.pinned_tailored_cv_id = parsedInput.pinnedTailoredCvId;
    if (parsedInput.educationDateFormat !== undefined) update.education_date_format = parsedInput.educationDateFormat;
    if (parsedInput.certificationDateFormat !== undefined) {
      update.certification_date_format = parsedInput.certificationDateFormat;
    }

    const { error } = await supabase
      .from('cv_preferences')
      .upsert({ user_id: ctx.user.id, ...update }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);

    // Re-render only when the visible CV changed, not for pin-only.
    const visualChange =
      parsedInput.template !== undefined ||
      parsedInput.accentHex !== undefined ||
      parsedInput.educationDateFormat !== undefined ||
      parsedInput.certificationDateFormat !== undefined;
    if (visualChange) {
      await renderAndUploadMasterCv(ctx.user);
    }

    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const };
  });
