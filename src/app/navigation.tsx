import Link from 'next/link';
import { Menu } from 'lucide-react';

import { AccountMenu } from '@/components/account-menu';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { getSession } from '@/features/account/controllers/get-session';

export async function Navigation() {
  const session = await getSession();

  return (
    <div className='relative flex items-center gap-4'>
      {session ? (
        <AccountMenu />
      ) : (
        <>
          <Button className='hidden shrink-0 lg:flex' render={<Link href='/login' />}>
            Sign In
          </Button>
          <Sheet>
            <SheetTrigger className='block lg:hidden' aria-label='Open menu'>
              <Menu size={24} />
            </SheetTrigger>
            <SheetContent className='w-full'>
              <SheetHeader>
                <Logo />
                <SheetDescription className='py-8'>
                  <Button className='shrink-0' render={<Link href='/login' />}>
                    Sign In
                  </Button>
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
