'use client';

import type { PropsWithChildren, ReactNode } from 'react';

import { Badge } from '@/shared/ui/badge';

type Props = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
  count?: number;
}>;

export function SectionShell({ title, description, action, count, children }: Props) {
  return (
    <section className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
      <header className='flex items-start justify-between gap-2'>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-1.5'>
            <h3 className='text-base font-semibold'>{title}</h3>
            {count !== undefined ? (
              <Badge variant='secondary' className='py-0 text-xs'>
                {count}
              </Badge>
            ) : null}
          </div>
          {description ? <p className='text-xs text-muted-foreground'>{description}</p> : null}
        </div>
        {action}
      </header>
      <div className='flex flex-col gap-3'>{children}</div>
    </section>
  );
}
