import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type AdviceNoteRow = Tables<'advice_note'>;

export async function listAdvice(filters?: {
  status?: AdviceNoteRow['status'] | 'all';
  tailoredCvId?: string;
}): Promise<AdviceNoteRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('advice_note').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.tailoredCvId) {
    query = query.eq('tailored_cv_id', filters.tailoredCvId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('listAdvice error', error);
    return [];
  }
  return data ?? [];
}
