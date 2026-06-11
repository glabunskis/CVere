import { redirect } from 'next/navigation';

import { getSession } from '@/entities/user';

import { AuthUI } from './auth-ui';

export async function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const session = await getSession();

  if (session) {
    redirect('/account');
  }

  return (
    <section className='m-auto flex h-full max-w-md items-center py-16'>
      <AuthUI mode={mode} />
    </section>
  );
}
