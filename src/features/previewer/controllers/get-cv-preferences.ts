import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import 'server-only';

export type CvPreferencesRow = Tables<'cv_preferences'>;

export async function getCvPreferences(): Promise<CvPreferencesRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('cv_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('getCvPreferences error', error);
    return null;
  }
  return data;
}

export async function getOrCreateCvPreferences(): Promise<CvPreferencesRow | null> {
  const existing = await getCvPreferences();
  if (existing) return existing;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('cv_preferences')
    .insert({ user_id: user.id })
    .select('*')
    .single();
  if (error) {
    console.error('getOrCreateCvPreferences error', error);
    return null;
  }
  return data;
}
