'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient } from '@/shared/lib/safe-action';

import { getCvHistoryState, redoCv, undoCv } from './cv-version-service';

const cvHistorySchema = z.object({
  cvId: z.uuid(),
});

export const undoCvAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await undoCv(ctx.user, parsedInput.cvId);
    revalidatePath('/dashboard');
    return { ok: true as const, ...state };
  });

export const redoCvAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await redoCv(ctx.user, parsedInput.cvId);
    revalidatePath('/dashboard');
    return { ok: true as const, ...state };
  });

export const getCvHistoryStateAction = authActionClient
  .inputSchema(cvHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const state = await getCvHistoryState(ctx.user, parsedInput.cvId);
    return { ok: true as const, ...state };
  });
