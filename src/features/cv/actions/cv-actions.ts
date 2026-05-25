'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createCv,
  deleteCv,
  renameCv,
  setSelectedCv,
} from '@/features/cv/services/cv-service';
import { authActionClient } from '@/libs/safe-action';

const setSelectedCvSchema = z.object({
  cvId: z.uuid(),
});

const renameCvSchema = z.object({
  cvId: z.uuid(),
  title: z.string().trim().min(1).max(120),
});

const deleteCvSchema = z.object({
  cvId: z.uuid(),
});

const createCvSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceCvId: z.uuid().nullable().optional(),
  sourceVacancyId: z.uuid().nullable().optional(),
});

export const setSelectedCvAction = authActionClient
  .inputSchema(setSelectedCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    await setSelectedCv(ctx.user.id, parsedInput.cvId);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const, cvId: parsedInput.cvId };
  });

export const renameCvAction = authActionClient
  .inputSchema(renameCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const row = await renameCv(ctx.user.id, parsedInput.cvId, parsedInput.title);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const, cv: row };
  });

export const deleteCvAction = authActionClient
  .inputSchema(deleteCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    await deleteCv(ctx.user.id, parsedInput.cvId);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const };
  });

export const createCvAction = authActionClient
  .inputSchema(createCvSchema)
  .action(async ({ parsedInput, ctx }) => {
    const row = await createCv({
      userId: ctx.user.id,
      title: parsedInput.title,
      sourceCvId: parsedInput.sourceCvId ?? undefined,
      sourceVacancyId: parsedInput.sourceVacancyId ?? undefined,
    });
    await setSelectedCv(ctx.user.id, row.id);
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    return { ok: true as const, cv: row };
  });
