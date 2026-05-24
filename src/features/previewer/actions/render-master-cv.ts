'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { PreviewTarget } from '@/features/previewer/preview-target';
import { authActionClient } from '@/libs/safe-action';

import { renderAndUploadCv, renderAndUploadMasterCv } from '../render';

const renderCvSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('master') }),
  z.object({ kind: z.literal('tailored_cv'), refId: z.uuid() }),
]);

export const renderCv = authActionClient
  .inputSchema(renderCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const target = parsedInput as PreviewTarget;
    const path = await renderAndUploadCv({ user: ctx.user, target });
    revalidatePath('/dashboard');
    return { ok: true as const, path };
  });

export const renderMasterCv = authActionClient.action(async ({ ctx }) => {
  const path = await renderAndUploadMasterCv(ctx.user);
  revalidatePath('/dashboard');
  return { ok: true as const, path };
});
