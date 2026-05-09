import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import 'server-only';

export type ProfileRow = {
  id: string;
  user_id: string;
  summary: string | null;
};

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profile').select('id, user_id, summary').eq('user_id', user.id).maybeSingle();
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
    .select('id, user_id, summary')
    .single();
  if (error) {
    console.error('getOrCreateProfile error', error);
    return null;
  }
  return data;
}
