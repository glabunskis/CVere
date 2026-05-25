import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Database } from '@/libs/supabase/types';

import 'server-only';

export type ProfileRow = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  full_name: string | null;
  location: string | null;
  phone: string | null;
  contact_email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  template: Database['public']['Enums']['cv_template'];
  accent_hex: string;
  education_date_format: Database['public']['Enums']['cv_date_format'];
  certification_date_format: Database['public']['Enums']['cv_date_format'];
  pdf_path: string | null;
};

const PROFILE_COLUMNS =
  'id, user_id, title, is_default, source_cv_id, source_vacancy_id, summary, full_name, location, phone, contact_email, linkedin_url, github_url, website_url, links, template, accent_hex, education_date_format, certification_date_format, pdf_path, created_at, updated_at';

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prefs } = await supabase
    .from('cv_preferences')
    .select('selected_cv_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (prefs?.selected_cv_id) {
    const { data, error } = await supabase
      .from('cv')
      .select(PROFILE_COLUMNS)
      .eq('id', prefs.selected_cv_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!error && data) return data;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('cv')
    .select(PROFILE_COLUMNS)
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();
  if (fallbackError) {
    console.error('getProfile error', fallbackError);
    return null;
  }
  if (!fallback) return null;

  await supabase
    .from('cv_preferences')
    .upsert({ user_id: user.id, selected_cv_id: fallback.id }, { onConflict: 'user_id' });
  return fallback;
}

export async function getOrCreateProfile(): Promise<ProfileRow | null> {
  const existing = await getProfile();
  if (existing) return existing;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('cv')
    .insert({ user_id: user.id, title: 'Master', is_default: true })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    console.error('getOrCreateProfile error', error);
    return null;
  }
  await supabase
    .from('cv_preferences')
    .upsert({ user_id: user.id, selected_cv_id: data.id }, { onConflict: 'user_id' });
  return data;
}
