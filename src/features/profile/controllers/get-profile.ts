import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import 'server-only';

export type ProfileRow = {
  id: string;
  user_id: string;
  summary: string | null;
  full_name: string | null;
  location: string | null;
  phone: string | null;
  contact_email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
};

const PROFILE_COLUMNS =
  'id, user_id, summary, full_name, location, phone, contact_email, linkedin_url, github_url, website_url';

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profile')
    .select(PROFILE_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('getProfile error', error);
    return null;
  }
  return data;
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
    .from('profile')
    .insert({ user_id: user.id })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    console.error('getOrCreateProfile error', error);
    return null;
  }
  return data;
}
