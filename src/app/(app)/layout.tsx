import { redirect } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { listCvs } from '@/entities/cv';
import { getSession } from '@/entities/user';
import { Logo } from '@/shared/ui/logo';
import { AccountMenu, AppNav, ThemeToggle } from '@/widgets/app-nav';

export default async function AppLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  const cvLibrary = await listCvs();

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {/* 56px header: 3px accent hairline + 53px bar */}
      <div className='flex shrink-0 flex-col'>
        <div className='h-[3px] bg-primary' />
        <header className='grid h-[53px] grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border px-4'>
          <Logo />
          <div className='flex min-w-0 items-center gap-3 justify-self-center'>
            <AppNav
              cvs={cvLibrary.items.map((item) => ({ id: item.id, title: item.title }))}
              selectedCvId={cvLibrary.selectedCvId}
            />
          </div>
          <div className='flex items-center gap-2 justify-self-end'>
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>
      </div>
      {/* Content fills the viewport flush; columns are divided by hairlines */}
      <div className='min-h-0 flex-1'>{children}</div>
    </div>
  );
}
