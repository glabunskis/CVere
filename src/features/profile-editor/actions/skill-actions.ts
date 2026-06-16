'use server';

import { revalidatePath } from 'next/cache';

import {
  addSkill,
  editSkill,
  getSelectedCv,
  renameSkillCategory as renameSkillCategoryService,
  renderAndUploadCv,
  reorderSkills as reorderSkillsService,
  setSkillCategories as setSkillCategoriesService,
} from '@/entities/cv';
import { loadCvSnapshot, recordCvVersion } from '@/features/cv-history';
import { authActionClient } from '@/shared/lib/safe-action';
import type { User } from '@supabase/supabase-js';

import {
  quickAddSkillSchema,
  renameSkillCategorySchema,
  renameSkillSchema,
  reorderSkillsSchema,
  setSkillCategoriesSchema,
} from '../schemas';

/**
 * Records one manual CV version for the edit, re-renders the PDF, and
 * revalidates the editor/preview routes. Mirrors `updateProfileSection`.
 */
async function commit({
  user,
  cvId,
  before,
}: {
  user: User;
  cvId: string;
  before: Awaited<ReturnType<typeof loadCvSnapshot>>;
}): Promise<void> {
  const after = await loadCvSnapshot(user, cvId);
  await recordCvVersion({ user, cvId, before, after, source: 'manual' });
  await renderAndUploadCv({ user, cvId });
  revalidatePath('/dashboard');
  revalidatePath('/profile');
}

export const quickAddSkill = authActionClient
  .inputSchema(quickAddSkillSchema)
  .action(async ({ parsedInput, ctx }) => {
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    await addSkill({ user: ctx.user, cvId: cv.id, payload: { name: parsedInput.name } });
    await commit({ user: ctx.user, cvId: cv.id, before });
    return { ok: true as const };
  });

export const renameSkill = authActionClient
  .inputSchema(renameSkillSchema)
  .action(async ({ parsedInput, ctx }) => {
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    await editSkill({
      user: ctx.user,
      cvId: cv.id,
      skillId: parsedInput.id,
      patch: { name: parsedInput.name },
    });
    await commit({ user: ctx.user, cvId: cv.id, before });
    return { ok: true as const };
  });

export const reorderSkills = authActionClient
  .inputSchema(reorderSkillsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    await reorderSkillsService({ user: ctx.user, cvId: cv.id, items: parsedInput.items });
    await commit({ user: ctx.user, cvId: cv.id, before });
    return { ok: true as const };
  });

export const setSkillCategories = authActionClient
  .inputSchema(setSkillCategoriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    const categories = await setSkillCategoriesService({
      user: ctx.user,
      cvId: cv.id,
      categories: parsedInput.categories,
    });
    await commit({ user: ctx.user, cvId: cv.id, before });
    return { ok: true as const, categories };
  });

export const renameSkillCategory = authActionClient
  .inputSchema(renameSkillCategorySchema)
  .action(async ({ parsedInput, ctx }) => {
    const cv = await getSelectedCv(ctx.user.id);
    const before = await loadCvSnapshot(ctx.user, cv.id);
    const categories = await renameSkillCategoryService({
      user: ctx.user,
      cvId: cv.id,
      from: parsedInput.from,
      to: parsedInput.to,
    });
    await commit({ user: ctx.user, cvId: cv.id, before });
    return { ok: true as const, categories };
  });
