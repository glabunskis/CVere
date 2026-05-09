import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type TailoredCvRow = Tables<'tailored_cv'>;

export async function listTailoredCvs(): Promise<(TailoredCvRow & { job: { company: string | null; role: string | null } | null })[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tailored_cv')
    .select('*, job:job_description(company, role)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listTailoredCvs error', error);
    return [];
  }
  return (data ?? []) as (TailoredCvRow & { job: { company: string | null; role: string | null } | null })[];
}

export async function getTailoredCv(id: string): Promise<TailoredCvRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('tailored_cv').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getTailoredCv error', error);
    return null;
  }
  return data;
}
