'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { actionClient } from '@/libs/safe-action';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { getURL } from '@/utils/get-url';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signInWithOAuth = actionClient
  .inputSchema(z.object({ provider: z.enum(['github', 'google']) }))
  .action(async ({ parsedInput: { provider } }) => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getURL('/auth/callback'),
      },
    });

    if (error) throw error;

    return redirect(data.url);
  });

export const signInWithPassword = actionClient
  .inputSchema(credentialsSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    return redirect('/account');
  });

export const signUpWithPassword = actionClient
  .inputSchema(credentialsSchema)
  .action(async ({ parsedInput: { email, password } }) => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getURL('/auth/callback'),
      },
    });

    if (error) throw error;

    // When email confirmation is enabled, no session is returned and the user
    // must click the confirmation link before signing in.
    if (data.session) {
      return redirect('/account');
    }

    return { needsEmailConfirmation: true };
  });

export const signOut = actionClient.action(async () => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
});
