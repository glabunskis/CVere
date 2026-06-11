'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createCv, setSelectedCv } from '@/entities/cv';
import { deleteJobDescriptionSchema, ingestJobDescriptionSchema } from '@/entities/job';
import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { authActionClient } from '@/shared/lib/safe-action';

export const ingestJobDescription = authActionClient
  .inputSchema(ingestJobDescriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('job_description')
      .insert({
        user_id: ctx.user.id,
        raw_text: parsedInput.rawText,
        company: parsedInput.company ?? null,
        role: parsedInput.role ?? null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    revalidatePath('/vacancies');
    return { ok: true as const, id: data.id };
  });

export const deleteJobDescription = authActionClient
  .inputSchema(deleteJobDescriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('job_description')
      .delete()
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/vacancies');
    return { ok: true as const };
  });

const startVacancyTailorSchema = z.object({
  jobId: z.uuid(),
});

export const startVacancyTailor = authActionClient
  .inputSchema(startVacancyTailorSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { data: job, error: jobError } = await supabase
      .from('job_description')
      .select('id, role, company')
      .eq('id', parsedInput.jobId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job) throw new Error('Vacancy not found.');

    const title = [job.role, job.company].filter(Boolean).join(' at ').trim();
    const cv = await createCv({
      userId: ctx.user.id,
      title: title.length > 0 ? title.slice(0, 120) : 'Vacancy CV',
      sourceVacancyId: job.id,
    });
    await setSelectedCv(ctx.user.id, cv.id);

    revalidatePath('/dashboard');
    revalidatePath('/profile');
    revalidatePath('/vacancies');
    return { ok: true as const, cvId: cv.id };
  });
