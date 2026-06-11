import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { listCvs } from '@/entities/cv';
import { getSession } from '@/entities/user';
import { Separator } from '@/shared/ui/separator';
import { AppNav } from '@/widgets/app-nav';

export default async function AppLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  const cvLibrary = await listCvs();

  return (
    <div className='flex flex-1 flex-col gap-6 py-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-4'>
          <AppNav
            cvs={cvLibrary.items.map((item) => ({ id: item.id, title: item.title }))}
            selectedCvId={cvLibrary.selectedCvId}
          />
        </div>
        <Separator />
      </div>
      <div className='flex-1'>{children}</div>
    </div>
  );
}
