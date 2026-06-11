'use server';

import { z } from 'zod';

import { renderAndUploadCv } from '@/entities/cv';
import { authActionClient } from '@/shared/lib/safe-action';

const renderCvSchema = z.object({ cvId: z.uuid() });

export const renderCv = authActionClient
  .inputSchema(renderCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const path = await renderAndUploadCv({ user: ctx.user, cvId: parsedInput.cvId });
    return { ok: true as const, path };
  });
