import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type JobDescriptionRow = Tables<'job_description'>;

export async function listJobs(): Promise<JobDescriptionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('job_description')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listJobs error', error);
    return [];
  }
  return data ?? [];
}

export async function getJob(id: string): Promise<JobDescriptionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('job_description').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getJob error', error);
    return null;
  }
  return data;
}
