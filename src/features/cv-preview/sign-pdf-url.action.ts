'use server';

import { z } from 'zod';

import { ensureCvPdfPath } from '@/entities/cv';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { authActionClient } from '@/shared/lib/safe-action';

const STORAGE_BUCKET = 'pdf';

const signedDownloadSchema = z.object({ path: z.string().min(1) });
const signedPreviewSchema = z.object({ cvId: z.uuid() });

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
    const { data: cvRow, error: cvError } = await supabase
      .from('cv')
      .select('pdf_path, template')
      .eq('id', parsedInput.cvId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (cvError) throw new Error(cvError.message);
    if (!cvRow) throw new Error('CV not found.');
    const path = await ensureCvPdfPath({
      user: ctx.user,
      cvId: parsedInput.cvId,
      existingPath: cvRow.pdf_path ?? null,
    });

    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60);
    if (error || !data) throw new Error(error?.message ?? 'Failed to sign URL');
    return { ok: true as const, url: data.signedUrl, path, template: cvRow.template ?? null };
  });
