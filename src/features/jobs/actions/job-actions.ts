'use server';

import { revalidatePath } from 'next/cache';

import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { deleteJobDescriptionSchema, ingestJobDescriptionSchema } from '../schemas';

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
