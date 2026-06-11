import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      data-slot='label'
      className={cn(
        'text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
