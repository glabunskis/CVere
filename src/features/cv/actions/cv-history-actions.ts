'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getCvHistoryState, redoCv, undoCv } from '@/features/cv/services/cv-version-service';
import { authActionClient } from '@/libs/safe-action';

const cvHistorySchema = z.object({
  cvId: z.uuid(),
});

export const undoCvAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await undoCv(ctx.user, parsedInput.cvId);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const, ...state };
  });

export const redoCvAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await redoCv(ctx.user, parsedInput.cvId);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const, ...state };
  });

export const getCvHistoryStateAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await getCvHistoryState(ctx.user, parsedInput.cvId);
    return { ok: true as const, ...state };
  });
