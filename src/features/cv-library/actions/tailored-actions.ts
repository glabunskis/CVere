'use server';

import { z } from 'zod';

import { deleteTailoredCv, renameTailoredCv } from '@/features/chat/services/tailored-content-service';
import { authActionClient } from '@/libs/safe-action';

const renameTailoredCvSchema = z.object({
  tailoredCvId: z.uuid(),
  title: z.string().trim().min(1).max(120),
});

const deleteTailoredCvSchema = z.object({
  tailoredCvId: z.uuid(),
});

export const renameTailoredCvAction = authActionClient
  .inputSchema(renameTailoredCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const row = await renameTailoredCv({
      user: ctx.user,
      tailoredCvId: parsedInput.tailoredCvId,
      title: parsedInput.title,
    });
    return {
      ok: true as const,
      tailoredCv: {
        id: row.id,
        title: row.title,
        jobDescriptionId: row.job_description_id,
        updatedAt: row.updated_at,
      },
    };
  });

export const deleteTailoredCvAction = authActionClient
  .inputSchema(deleteTailoredCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    await deleteTailoredCv({ user: ctx.user, tailoredCvId: parsedInput.tailoredCvId });
    return { ok: true as const };
  });
