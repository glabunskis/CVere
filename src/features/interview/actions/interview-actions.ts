'use server';

import { revalidatePath } from 'next/cache';

import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { buildProfileSnapshot } from '@/features/tailored/snapshot';
import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import {
  addInterviewAnswerSchema,
  applyInterviewAdviceSchema,
  deleteInterviewAnswerSchema,
  dismissInterviewAdviceSchema,
  draftInterviewAnswerSchema,
  reviewInterviewSchema,
  updateInterviewAnswerSchema,
} from '../schemas';

export const addInterviewAnswer = authActionClient
  .inputSchema(addInterviewAnswerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_answer')
      .insert({ user_id: ctx.user.id, question: parsedInput.question, answer: parsedInput.answer });
    if (error) throw new Error(error.message);
    revalidatePath('/interview');
    return { ok: true as const };
  });

export const updateInterviewAnswer = authActionClient
  .inputSchema(updateInterviewAnswerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_answer')
      .update({ question: parsedInput.question, answer: parsedInput.answer })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/interview');
    return { ok: true as const };
  });

export const deleteInterviewAnswer = authActionClient
  .inputSchema(deleteInterviewAnswerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_answer')
      .delete()
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/interview');
    return { ok: true as const };
  });

export const draftInterviewAnswer = authActionClient
  .inputSchema(draftInterviewAnswerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await getOrCreateProfile();
    if (!profile) throw new Error('Profile not available');
    const children = await getProfileChildren(profile.id);
    const snapshot = buildProfileSnapshot(profile.summary, children);
    const ai = getAiProvider();

    const { answer } = await ai.interviewAnswer({ profile: snapshot, question: parsedInput.question });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_answer')
      .insert({ user_id: ctx.user.id, question: parsedInput.question, answer });
    if (error) throw new Error(error.message);

    revalidatePath('/interview');
    return { ok: true as const };
  });

export const reviewInterview = authActionClient
  .inputSchema(reviewInterviewSchema)
  .action(async ({ ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { data: answers, error: fetchError } = await supabase
      .from('interview_answer')
      .select('id, question, answer')
      .eq('user_id', ctx.user.id);
    if (fetchError) throw new Error(fetchError.message);
    if (!answers || answers.length === 0) {
      return { ok: true as const, count: 0 };
    }

    const ai = getAiProvider();
    const review = await ai.interviewReview({ answers });

    if (review.length === 0) return { ok: true as const, count: 0 };

    const rows = review.map((entry) => ({
      user_id: ctx.user.id,
      interview_answer_id: entry.interviewAnswerId,
      severity: entry.severity,
      body: entry.body,
      status: 'open' as const,
    }));

    const { error: insertError } = await supabase.from('interview_advice').insert(rows);
    if (insertError) throw new Error(insertError.message);

    revalidatePath('/interview');
    return { ok: true as const, count: review.length };
  });

export const applyInterviewAdvice = authActionClient
  .inputSchema(applyInterviewAdviceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_advice')
      .update({ status: 'applied' })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/interview');
    return { ok: true as const };
  });

export const dismissInterviewAdvice = authActionClient
  .inputSchema(dismissInterviewAdviceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('interview_advice')
      .update({ status: 'dismissed' })
      .eq('id', parsedInput.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    revalidatePath('/interview');
    return { ok: true as const };
  });
