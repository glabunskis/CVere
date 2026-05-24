'use server';

import { z } from 'zod';

import type { PreviewTarget } from '@/features/previewer/preview-target';
import { authActionClient } from '@/libs/safe-action';

import { renderAndUploadCv } from '../render';

const renderCvSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('master') }),
  z.object({ kind: z.literal('tailored_cv'), refId: z.uuid() }),
]);

export const renderCv = authActionClient
  .inputSchema(renderCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const target = parsedInput as PreviewTarget;
    const path = await renderAndUploadCv({ user: ctx.user, target });
    return { ok: true as const, path };
  });
