import Link from 'next/link';

import { APP_DISPLAY_NAME } from '@/shared/config';

export function Logo() {
  return (
    <Link href='/' className='flex w-fit items-center gap-2'>
      <span className='text-xl font-bold'>{APP_DISPLAY_NAME}</span>
    </Link>
  );
}
