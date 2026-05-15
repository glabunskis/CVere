'use client';

import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_DISPLAY_NAME } from '@/config';
import { zodResolver } from '@hookform/resolvers/zod';

import { signInWithPassword, signUpWithPassword } from './auth-actions';

const credentialsSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type CredentialsForm = z.infer<typeof credentialsSchema>;

function getAuthErrorMessage(error?: string): string {
  const lower = (error ?? '').toLowerCase();
  if (lower.includes('rate') || lower.includes('security purposes')) {
    const seconds = error?.match(/(\d+)\s*second/)?.[1];
    return seconds
      ? `Please wait ${seconds} seconds before trying again.`
      : 'Too many attempts. Please wait a minute and try again.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (lower.includes('invalid') || lower.includes('credentials')) {
    return 'Invalid email or password.';
  }
  return 'Something went wrong. Please try again.';
}

const titleMap = {
  login: 'Sign in to your account',
  signup: `Create your ${APP_DISPLAY_NAME} account`,
};

const subtitleMap = {
  login: 'Enter your email and password',
  signup: 'Enter your email and choose a password',
};

export function AuthUI({ mode }: { mode: 'login' | 'signup' }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
  });

  const action = mode === 'login' ? signInWithPassword : signUpWithPassword;
  const { executeAsync, isPending } = useAction(action);

  async function onSubmit(data: CredentialsForm) {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(getAuthErrorMessage(result.serverError));
      return;
    }

    if (mode === 'signup' && result?.data && 'needsEmailConfirmation' in result.data) {
      toast(`Check your inbox to confirm your email: ${data.email}`);
      reset();
    }
  }

  return (
    <div className='flex w-full flex-col gap-8 rounded-lg border p-8'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>{titleMap[mode]}</h1>
        <p className='text-sm text-muted-foreground'>{subtitleMap[mode]}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            autoComplete='email'
            placeholder='you@example.com'
            {...register('email')}
          />
          {errors.email && <p className='text-sm text-destructive'>{errors.email.message}</p>}
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder='At least 8 characters'
            {...register('password')}
          />
          {errors.password && <p className='text-sm text-destructive'>{errors.password.message}</p>}
        </div>

        <Button type='submit' disabled={isPending}>
          {isPending
            ? mode === 'login'
              ? 'Signing in...'
              : 'Creating account...'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
        </Button>
      </form>

      <p className='text-center text-sm text-muted-foreground'>
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href='/signup' className='underline underline-offset-4 hover:text-foreground'>
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href='/login' className='underline underline-offset-4 hover:text-foreground'>
              Sign in
            </Link>
          </>
        )}
      </p>

      {mode === 'signup' && (
        <p className='text-center text-xs text-muted-foreground'>
          By continuing, you agree to our{' '}
          <Link href='/terms' className='underline'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href='/privacy' className='underline'>
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </div>
  );
}
