import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { Separator } from '@/components/ui/separator';
import { getSession } from '@/features/account/controllers/get-session';

import { AppNav } from './_components/app-nav';

export default async function AppLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className='flex flex-1 flex-col gap-6 py-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-4'>
          <AppNav />
        </div>
        <Separator />
      </div>
      <div className='flex-1'>{children}</div>
    </div>
  );
}
