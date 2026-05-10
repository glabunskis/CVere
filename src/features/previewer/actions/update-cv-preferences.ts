'use server';

import { revalidatePath } from 'next/cache';

import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { renderAndUploadMasterCv } from '../render';
import { updateCvPreferencesSchema } from '../schemas';

export const updateCvPreferences = authActionClient
  .inputSchema(updateCvPreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (
      parsedInput.template === undefined &&
      parsedInput.accentHex === undefined &&
      parsedInput.pinnedTailoredCvId === undefined
    ) {
      return { ok: true as const };
    }

    const supabase = await createSupabaseServerClient();

    const update: {
      template?: 'single-column' | 'two-column';
      accent_hex?: string;
      pinned_tailored_cv_id?: string | null;
    } = {};
    if (parsedInput.template !== undefined) update.template = parsedInput.template;
    if (parsedInput.accentHex !== undefined) update.accent_hex = parsedInput.accentHex;
    if (parsedInput.pinnedTailoredCvId !== undefined) update.pinned_tailored_cv_id = parsedInput.pinnedTailoredCvId;

    const { error } = await supabase
      .from('cv_preferences')
      .upsert({ user_id: ctx.user.id, ...update }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);

    // Re-render only when the visible CV changed (template or accent), not for pin-only.
    const visualChange = parsedInput.template !== undefined || parsedInput.accentHex !== undefined;
    if (visualChange) {
      await renderAndUploadMasterCv(ctx.user);
    }

    revalidatePath('/dashboard');
    return { ok: true as const };
  });
