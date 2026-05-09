import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type InterviewAnswerRow = Tables<'interview_answer'>;
export type InterviewAdviceRow = Tables<'interview_advice'>;

export async function listInterviewAnswers(): Promise<InterviewAnswerRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('interview_answer')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listInterviewAnswers error', error);
    return [];
  }
  return data ?? [];
}

export async function listInterviewAdvice(): Promise<InterviewAdviceRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('interview_advice')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listInterviewAdvice error', error);
    return [];
  }
  return data ?? [];
}
