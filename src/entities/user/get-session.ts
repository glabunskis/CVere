import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';

export async function getSession() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A missing session is the normal state for anonymous visitors, not an error
  // worth logging; only surface genuine auth failures.
  if (error && error.name !== 'AuthSessionMissingError') {
    console.error(error);
  }

  return user;
}
