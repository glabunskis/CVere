'use client';

import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

const APP_PREFIXES = ['/dashboard', '/vacancies'];

export function HeaderGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAppRoute = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isAppRoute) return null;
  return <>{children}</>;
}
