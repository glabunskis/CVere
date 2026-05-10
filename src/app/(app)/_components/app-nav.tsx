'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

const items: NavItem[] = [
  { href: '/dashboard', label: 'Previewer' },
  { href: '/profile', label: 'Profile' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/vacancies', label: 'Vacancies' },
  { href: '/tailored', label: 'Tailored' },
  { href: '/letters', label: 'Letters' },
  { href: '/advice', label: 'Advice' },
  { href: '/interview', label: 'Interview' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className='flex items-center gap-1 overflow-x-auto pb-1'>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
