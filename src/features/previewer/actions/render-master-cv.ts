'use server';

import { revalidatePath } from 'next/cache';

import { authActionClient } from '@/libs/safe-action';

import { renderAndUploadMasterCv } from '../render';

export const renderMasterCv = authActionClient.action(async ({ ctx }) => {
  const path = await renderAndUploadMasterCv(ctx.user);
  revalidatePath('/dashboard');
  return { ok: true as const, path };
});
