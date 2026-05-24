'use server';

import { z } from 'zod';

import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const previewTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('master') }),
  z.object({ kind: z.literal('tailored_cv'), refId: z.uuid() }),
]);

export const setLastPreviewed = authActionClient
  .inputSchema(previewTargetSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    if (parsedInput.kind === 'tailored_cv') {
      const { data: tailored, error: tailoredError } = await supabase
        .from('tailored_cv')
        .select('id')
        .eq('id', parsedInput.refId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (tailoredError) {
        throw new Error(tailoredError.message);
      }
      if (!tailored) {
        throw new Error('Tailored CV not found.');
      }
    }

    const { error } = await supabase.from('cv_preferences').upsert(
      {
        user_id: ctx.user.id,
        last_previewed_kind: parsedInput.kind,
        last_previewed_ref_id: parsedInput.kind === 'tailored_cv' ? parsedInput.refId : null,
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      throw new Error(error.message);
    }

    return { ok: true as const };
  });
