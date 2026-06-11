'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/api/supabase/supabase-server-client';
import { getURL } from '@/shared/lib/get-url';
import { actionClient } from '@/shared/lib/safe-action';

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signUpSchema = credentialsSchema.extend({
  accessCode: z.string().min(1, 'Access code is required'),
});

// Friction gate for closed beta: only people with the shared access code can
// create accounts. Existing users (sign-in) are unaffected. Fails closed — if
// SIGNUP_ACCESS_CODE is unset or empty, signups are rejected entirely.
function assertSignUpAllowed(accessCode: string): void {
  const expected = process.env.SIGNUP_ACCESS_CODE?.trim();
  if (!expected) {
    throw new Error('Signups are currently disabled.');
  }
  if (accessCode.trim() !== expected) {
    throw new Error('Invalid access code.');
  }
}

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

    return redirect('/dashboard');
  });

export const signUpWithPassword = actionClient
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput: { email, password, accessCode } }) => {
    assertSignUpAllowed(accessCode);

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
      return redirect('/dashboard');
    }

    return { needsEmailConfirmation: true };
  });

export const signOut = actionClient.action(async () => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
});
