import type { Database } from '@/shared/api/supabase/types';
import { getEnvVar } from '@/shared/lib/get-env-var';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdminClient = createClient<Database>(
  getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  getEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
);
