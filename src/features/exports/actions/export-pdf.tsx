'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { buildProfileContact } from '@/features/previewer/render';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { profileSnapshotSchema } from '@/features/tailored/schemas';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { CoverLetter } from '@/pdf/CoverLetter';
import { Cv } from '@/pdf/Cv';
import { DEFAULT_ACCENT } from '@/pdf/theme';
import { renderToBuffer } from '@react-pdf/renderer';

import { exportPdfSchema } from '../schemas';

const STORAGE_BUCKET = 'pdf';

type Sections = {
  summary?: string | null;
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
  emphasis?: string[];
};

export const exportPdf = authActionClient.inputSchema(exportPdfSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();

  const profile = await getOrCreateProfile();
  const contact = profile ? buildProfileContact(profile, ctx.user.email ?? null) : undefined;

  const userMetadata = (ctx.user.user_metadata ?? {}) as { full_name?: string };
  const identity =
    profile?.full_name ?? userMetadata.full_name ?? ctx.user.email ?? '[MISSING] name';

  const prefs = await getOrCreateCvPreferences();
  const template = prefs?.template ?? 'single-column';
  const accent = prefs?.accent_hex || DEFAULT_ACCENT;
  const dateFormats = {
    education: prefs?.education_date_format ?? 'mm_yyyy',
    certification: prefs?.certification_date_format ?? 'mm_yyyy',
  } as const;

  let buffer: Buffer;
  let path: string;
  let updateTable: 'tailored_cv' | 'cover_letter';
  let rowId: string;

  if (parsedInput.kind === 'tailored_cv') {
    const { data: row, error } = await supabase
      .from('tailored_cv')
      .select('*')
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? 'Tailored CV not found');

    const snapshot = profileSnapshotSchema.safeParse(row.profile_snapshot);
    if (!snapshot.success) throw new Error('Invalid profile snapshot on tailored CV');

    const sections = (typeof row.sections === 'object' && row.sections !== null
      ? (row.sections as Sections)
      : {}) as Sections;

    buffer = await renderToBuffer(
      <Cv
        template={template}
        snapshot={snapshot.data}
        sections={sections}
        identityName={identity}
        contact={contact}
        accent={accent}
        dateFormats={dateFormats}
      />,
    );
    path = `${ctx.user.id}/${row.slug}.pdf`;
    updateTable = 'tailored_cv';
    rowId = row.id;
  } else {
    const { data: row, error } = await supabase
      .from('cover_letter')
      .select('*')
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? 'Cover letter not found');

    buffer = await renderToBuffer(
      <CoverLetter body={row.body} identityName={identity} contact={contact} accent={accent} />,
    );
    path = `${ctx.user.id}/${row.slug}.pdf`;
    updateTable = 'cover_letter';
    rowId = row.id;
  }

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from(updateTable)
    .update({ pdf_path: path })
    .eq('id', rowId)
    .eq('user_id', ctx.user.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(parsedInput.kind === 'tailored_cv' ? `/tailored/${rowId}` : `/letters/${rowId}`);
  return { ok: true as const, path };
});

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
