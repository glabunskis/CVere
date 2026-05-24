'use server';

import { z } from 'zod';

import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { ensureCvPdfPath } from '../render';

const STORAGE_BUCKET = 'pdf';

const signedDownloadSchema = z.object({ path: z.string().min(1) });
const signedPreviewSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('master') }),
  z.object({ kind: z.literal('tailored_cv'), refId: z.uuid() }),
]);

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

export const createSignedPreviewUrl = authActionClient
  .inputSchema(signedPreviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const prefs = await getOrCreateCvPreferences();

    const path = await ensureCvPdfPath({
      user: ctx.user,
      target:
        parsedInput.kind === 'master'
          ? { kind: 'master' }
          : { kind: 'tailored_cv', refId: parsedInput.refId },
      existingMasterPath: prefs?.master_pdf_path ?? null,
    });

    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60);
    if (error || !data) throw new Error(error?.message ?? 'Failed to sign URL');
    return { ok: true as const, url: data.signedUrl, path };
  });
