'use server';

import { revalidatePath } from 'next/cache';

import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { profileSnapshotSchema } from '@/features/tailored/schemas';
import { buildProfileSnapshot } from '@/features/tailored/snapshot';
import { getAiProvider } from '@/libs/ai';
import { authActionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { applyAdviceSchema, dismissAdviceSchema, reviewCvSchema } from '../schemas';

export const reviewCv = authActionClient.schema(reviewCvSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();
  const ai = getAiProvider();

  let snapshot;
  if (parsedInput.tailoredCvId) {
    const { data: row, error } = await supabase
      .from('tailored_cv')
      .select('profile_snapshot')
      .eq('id', parsedInput.tailoredCvId)
      .eq('user_id', ctx.user.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? 'Tailored CV not found');
    const parsed = profileSnapshotSchema.safeParse(row.profile_snapshot);
    if (!parsed.success) throw new Error('Profile snapshot is invalid');
    snapshot = parsed.data;
  } else {
    const profile = await getOrCreateProfile();
    if (!profile) throw new Error('Profile not available');
    const children = await getProfileChildren(profile.id);
    snapshot = buildProfileSnapshot(profile.summary, children);
  }

  const notes = await ai.reviewProfile({ profile: snapshot });

  if (notes.length === 0) {
    return { ok: true as const, count: 0 };
  }

  const rows = notes.map((note) => ({
    user_id: ctx.user.id,
    tailored_cv_id: parsedInput.tailoredCvId ?? null,
    target: note.target,
    target_ref_id: note.targetRefId ?? null,
    severity: note.severity,
    body: note.body,
    status: 'open' as const,
  }));

  const { error: insertError } = await supabase.from('advice_note').insert(rows);
  if (insertError) throw new Error(insertError.message);

  revalidatePath('/advice');
  if (parsedInput.tailoredCvId) revalidatePath(`/tailored/${parsedInput.tailoredCvId}`);
  revalidatePath('/dashboard');
  return { ok: true as const, count: notes.length };
});

export const applyAdvice = authActionClient.schema(applyAdviceSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();

  const { data: note, error: fetchError } = await supabase
    .from('advice_note')
    .select('*')
    .eq('id', parsedInput.id)
    .eq('user_id', ctx.user.id)
    .single();
  if (fetchError || !note) throw new Error(fetchError?.message ?? 'Advice not found');

  // Apply to a presentation row only (tailored_cv or cover_letter), never the master profile.
  if (note.tailored_cv_id) {
    const { data: cv, error: cvError } = await supabase
      .from('tailored_cv')
      .select('sections')
      .eq('id', note.tailored_cv_id)
      .eq('user_id', ctx.user.id)
      .single();
    if (cvError || !cv) throw new Error(cvError?.message ?? 'Tailored CV not found');
    const sections = (typeof cv.sections === 'object' && cv.sections !== null
      ? (cv.sections as Record<string, unknown>)
      : {}) as { advice_applied?: string[] };
    const next = {
      ...sections,
      advice_applied: [...(sections.advice_applied ?? []), note.body],
    };
    const { error: updateError } = await supabase
      .from('tailored_cv')
      .update({ sections: next })
      .eq('id', note.tailored_cv_id)
      .eq('user_id', ctx.user.id);
    if (updateError) throw new Error(updateError.message);
  } else if (note.cover_letter_id) {
    const { data: letter, error: letterError } = await supabase
      .from('cover_letter')
      .select('body')
      .eq('id', note.cover_letter_id)
      .eq('user_id', ctx.user.id)
      .single();
    if (letterError || !letter) throw new Error(letterError?.message ?? 'Cover letter not found');
    const next = `${letter.body}\n\n[Applied advice] ${note.body}`;
    const { error: updateError } = await supabase
      .from('cover_letter')
      .update({ body: next })
      .eq('id', note.cover_letter_id)
      .eq('user_id', ctx.user.id);
    if (updateError) throw new Error(updateError.message);
  }
  // If neither id is set, the advice is profile-level; "apply" only marks status (no automatic profile mutation).

  const { error: statusError } = await supabase
    .from('advice_note')
    .update({ status: 'applied' })
    .eq('id', parsedInput.id)
    .eq('user_id', ctx.user.id);
  if (statusError) throw new Error(statusError.message);

  revalidatePath('/advice');
  if (note.tailored_cv_id) revalidatePath(`/tailored/${note.tailored_cv_id}`);
  if (note.cover_letter_id) revalidatePath(`/letters/${note.cover_letter_id}`);
  revalidatePath('/dashboard');
  return { ok: true as const };
});

export const dismissAdvice = authActionClient.schema(dismissAdviceSchema).action(async ({ parsedInput, ctx }) => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('advice_note')
    .update({ status: 'dismissed' })
    .eq('id', parsedInput.id)
    .eq('user_id', ctx.user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/advice');
  revalidatePath('/dashboard');
  return { ok: true as const };
});
