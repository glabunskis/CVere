'use server';

import { z } from 'zod';

import { authActionClient } from '@/libs/safe-action';

import { renderAndUploadCv } from '../render';

const renderCvSchema = z.object({ cvId: z.uuid() });

export const renderCv = authActionClient
  .inputSchema(renderCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const path = await renderAndUploadCv({ user: ctx.user, cvId: parsedInput.cvId });
    return { ok: true as const, path };
  });
