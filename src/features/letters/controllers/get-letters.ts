import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type CoverLetterRow = Tables<'cover_letter'>;

export async function listCoverLetters(): Promise<(CoverLetterRow & { job: { company: string | null; role: string | null } | null })[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cover_letter')
    .select('*, job:job_description(company, role)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listCoverLetters error', error);
    return [];
  }
  return (data ?? []) as (CoverLetterRow & { job: { company: string | null; role: string | null } | null })[];
}

export async function getCoverLetter(id: string): Promise<CoverLetterRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('cover_letter').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getCoverLetter error', error);
    return null;
  }
  return data;
}
