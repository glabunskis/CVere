import type { PropsWithChildren } from 'react';

export default function AuthLayout({ children }: PropsWithChildren) {
  return <div className='mx-auto w-full max-w-5xl'>{children}</div>;
}
