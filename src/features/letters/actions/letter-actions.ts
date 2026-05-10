'use server';

import { revalidatePath } from 'next/cache';

import { parseExtracted } from '@/features/jobs/extracted';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { buildProfileSnapshot, slugify } from '@/features/tailored/snapshot';
import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  deleteCoverLetterSchema,
  generateCoverLetterSchema,
  updateCoverLetterSchema,
} from '../schemas';

export const generateCoverLetter = authActionClient
  .inputSchema(generateCoverLetterSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    const { data: job, error: jobError } = await supabase
      .from('job_description')
      .select('*')
      .eq('id', parsedInput.jobDescriptionId)
      .eq('user_id', ctx.user.id)
      .single();
    if (jobError || !job) throw new Error(jobError?.message ?? 'Job not found');

    const extracted = parseExtracted(job.extracted);
    if (!extracted) throw new Error('Job description has no extracted data. Re-extract first.');

    const profile = await getOrCreateProfile();
    if (!profile) throw new Error('Profile not available');
    const children = await getProfileChildren(profile.id);
    const snapshot = buildProfileSnapshot(profile.summary, children);

    const ai = getAiProvider();
    const letter = await ai.generateCoverLetter({ profile: snapshot, jd: extracted });

    const baseSlug = slugify(`${job.company ?? 'company'}_${job.role ?? 'role'}_letter`, 'cover_letter');
    const slug = `${baseSlug}_${Date.now()}`;

    const { data, error } = await supabase
      .from('cover_letter')
      .insert({
        user_id: ctx.user.id,
        job_description_id: job.id,
        body: letter.body,
        slug,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    revalidatePath('/letters');
    revalidatePath(`/vacancies/${job.id}`);
    return { ok: true as const, id: data.id };
  });

export const updateCoverLetter = authActionClient
  .inputSchema(updateCoverLetterSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('cover_letter')
      .update({ body: parsedInput.body })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath(`/letters/${parsedInput.id}`);
    return { ok: true as const };
  });

export const deleteCoverLetter = authActionClient
  .inputSchema(deleteCoverLetterSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('cover_letter')
      .delete()
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/letters');
    return { ok: true as const };
  });
