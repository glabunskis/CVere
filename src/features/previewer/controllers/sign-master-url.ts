import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import 'server-only';

const STORAGE_BUCKET = 'pdf';
const SIGNED_TTL_SECONDS = 60;

export async function signMasterUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data) {
    console.error('signMasterUrl error', error);
    return null;
  }
  return data.signedUrl;
}
