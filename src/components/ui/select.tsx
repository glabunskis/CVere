import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot='select'
      className={cn(
        'flex h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}

export { Select };
