import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

type SeparatorProps = ComponentProps<'div'> & {
  orientation?: 'horizontal' | 'vertical';
};

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <div
      data-slot='separator'
      role='separator'
      aria-orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
