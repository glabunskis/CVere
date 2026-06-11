import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';

export async function getSession() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
  }

  return user;
}
