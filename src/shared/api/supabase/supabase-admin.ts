import type { Database } from '@/shared/api/supabase/types';
import { getEnvVar } from '@/shared/lib/get-env-var';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient<Database> | null = null;

// Lazy proxy: defer reading SUPABASE_SERVICE_ROLE_KEY until the first property
// access so the app can build without the service-role secret present (it is a
// runtime-only secret, e.g. not injected during a Docker image build).
export const supabaseAdminClient = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    if (!cached) {
      cached = createClient<Database>(
        getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
        getEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
      );
    }
    return Reflect.get(cached as object, prop, receiver);
  },
});
