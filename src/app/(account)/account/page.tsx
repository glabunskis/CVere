import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className='py-16'>
      <h1 className='mb-8 text-center text-3xl font-bold'>Account</h1>

      <div className='m-auto flex max-w-2xl flex-col gap-6'>
        <div className='rounded-lg border p-6'>
          <h2 className='mb-1 text-lg font-semibold'>Profile</h2>
          <p className='text-sm text-muted-foreground'>{session.email}</p>
        </div>
      </div>
    </section>
  );
}
