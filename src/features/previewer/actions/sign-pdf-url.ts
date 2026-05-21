'use server';

import { z } from 'zod';

import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const STORAGE_BUCKET = 'pdf';

const signedDownloadSchema = z.object({ path: z.string().min(1) });

export const createSignedDownload = authActionClient
  .inputSchema(signedDownloadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const ownerPrefix = `${ctx.user.id}/`;
    if (!parsedInput.path.startsWith(ownerPrefix)) {
      throw new Error('Forbidden path');
    }
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(parsedInput.path, 60);
    if (error || !data) throw new Error(error?.message ?? 'Failed to sign URL');
    return { ok: true as const, url: data.signedUrl };
  });
