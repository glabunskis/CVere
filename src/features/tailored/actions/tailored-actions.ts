'use server';

import { revalidatePath } from 'next/cache';

import { parseExtracted } from '@/features/jobs/extracted';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  deleteTailoredSchema,
  setTailoredStatusSchema,
  tailorCvSchema,
  updateTailoredSectionsSchema,
} from '../schemas';
import { buildProfileSnapshot, slugify } from '../snapshot';

export const tailorCv = authActionClient.inputSchema(tailorCvSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobError } = await supabase
    .from('job_description')
    .select('*')
    .eq('id', parsedInput.jobDescriptionId)
    .eq('user_id', ctx.user.id)
    .single();
  if (jobError || !job) throw new Error(jobError?.message ?? 'Job not found');

  const extracted = parseExtracted(job.extracted);
  if (!extracted) {
    throw new Error('Job description has no extracted data. Re-extract first.');
  }

  const profile = await getOrCreateProfile();
  if (!profile) throw new Error('Profile not available');
  const children = await getProfileChildren(profile.id);
  const snapshot = buildProfileSnapshot(profile.summary, children);

  const ai = getAiProvider();
  const tailored = await ai.tailorCv({ profile: snapshot, jd: extracted });

  const baseSlug = slugify(`${job.company ?? 'company'}_${job.role ?? 'role'}_cv`, 'tailored_cv');
  const slug = `${baseSlug}_${Date.now()}`;

  const { data, error } = await supabase
    .from('tailored_cv')
    .insert({
      user_id: ctx.user.id,
      job_description_id: job.id,
      profile_snapshot: snapshot,
      sections: { summary: tailored.summary, ...tailored.sections },
      status: 'draft',
      slug,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath('/tailored');
  revalidatePath(`/vacancies/${job.id}`);
  return { ok: true as const, id: data.id };
});

export const updateTailoredSections = authActionClient
  .inputSchema(updateTailoredSectionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from('tailored_cv')
      .select('sections')
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id)
      .single();
    if (fetchError || !existing) throw new Error(fetchError?.message ?? 'Tailored CV not found');

    const previousSections = (typeof existing.sections === 'object' && existing.sections !== null
      ? (existing.sections as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const previousSummary = typeof previousSections.summary === 'string' ? previousSections.summary : null;

    const nextSections = {
      ...previousSections,
      ...parsedInput.sections,
      summary: parsedInput.summary ?? previousSummary,
    } satisfies Record<string, unknown>;

    const { error } = await supabase
      .from('tailored_cv')
      .update({ sections: nextSections as never })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);

    revalidatePath(`/tailored/${parsedInput.id}`);
    return { ok: true as const };
  });

export const setTailoredStatus = authActionClient
  .inputSchema(setTailoredStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('tailored_cv')
      .update({ status: parsedInput.status })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath(`/tailored/${parsedInput.id}`);
    revalidatePath('/tailored');
    return { ok: true as const };
  });

export const deleteTailored = authActionClient
  .inputSchema(deleteTailoredSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('tailored_cv')
      .delete()
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/tailored');
    return { ok: true as const };
  });
