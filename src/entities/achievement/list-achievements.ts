import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import type { Tables } from '@/shared/api/supabase/types';

import 'server-only';

export type AchievementRow = Tables<'achievement_log_entry'>;

export async function listAchievements(filters?: {
  status?: AchievementRow['status'] | 'all';
  section?: AchievementRow['target_section'] | 'all';
}): Promise<AchievementRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('achievement_log_entry').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.section && filters.section !== 'all') {
    query = query.eq('target_section', filters.section);
  }
  const { data, error } = await query;
  if (error) {
    console.error('listAchievements error', error);
    return [];
  }
  return data ?? [];
}
