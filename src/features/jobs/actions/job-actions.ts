'use server';

import { revalidatePath } from 'next/cache';

import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  deleteJobDescriptionSchema,
  ingestJobDescriptionSchema,
  reExtractJobDescriptionSchema,
} from '../schemas';

export const ingestJobDescription = authActionClient
  .schema(ingestJobDescriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const ai = getAiProvider();

    const extracted = await ai.extractJobDescription({ rawText: parsedInput.rawText });

    const { data, error } = await supabase
      .from('job_description')
      .insert({
        user_id: ctx.user.id,
        raw_text: parsedInput.rawText,
        company: parsedInput.company ?? null,
        role: parsedInput.role ?? null,
        extracted,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    revalidatePath('/vacancies');
    return { ok: true as const, id: data.id };
  });

export const reExtractJobDescription = authActionClient
  .schema(reExtractJobDescriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { data: row, error: fetchError } = await supabase
      .from('job_description')
      .select('raw_text')
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id)
      .single();
    if (fetchError || !row) throw new Error(fetchError?.message ?? 'Job description not found');

    const ai = getAiProvider();
    const extracted = await ai.extractJobDescription({ rawText: row.raw_text });

    const { error } = await supabase
      .from('job_description')
      .update({ extracted })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);

    revalidatePath(`/vacancies/${parsedInput.id}`);
    return { ok: true as const };
  });

export const deleteJobDescription = authActionClient
  .schema(deleteJobDescriptionSchema)
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
