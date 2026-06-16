import Link from 'next/link';
import { FileTextIcon } from 'lucide-react';

import { APP_DISPLAY_NAME } from '@/shared/config';

export function Logo() {
  return (
    <Link href='/' className='flex w-fit items-center gap-2'>
      <span className='flex size-6 shrink-0 items-center justify-center rounded bg-primary'>
        <FileTextIcon className='size-3.5 text-primary-foreground' />
      </span>
      <span className='text-sm font-bold tracking-widest text-foreground'>
        {APP_DISPLAY_NAME.toUpperCase()}
      </span>
    </Link>
  );
}
