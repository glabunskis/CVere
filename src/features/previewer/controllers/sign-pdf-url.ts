import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import 'server-only';

const STORAGE_BUCKET = 'pdf';
// Long TTL so the previewer iframe never needs to refresh its signed URL mid-session.
const SIGNED_TTL_SECONDS = 60 * 60 * 8;

export async function signPdfUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data) {
    console.error('signPdfUrl error', error);
    return null;
  }
  return data.signedUrl;
}
