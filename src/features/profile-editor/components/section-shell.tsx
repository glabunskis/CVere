'use client';

import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export function SectionShell({ title, description, action, children }: Props) {
  return (
    <section className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <h3 className='text-base font-semibold'>{title}</h3>
          {description ? <p className='text-xs text-muted-foreground'>{description}</p> : null}
        </div>
        {action}
      </header>
      <div className='flex flex-col gap-3'>{children}</div>
    </section>
  );
}
