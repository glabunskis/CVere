import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot='card'
      className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-header'
      className={cn('flex flex-col gap-1 px-6 pt-6 pb-2', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      data-slot='card-title'
      className={cn('text-base font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p data-slot='card-description' className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot='card-content' className={cn('px-6 py-4', className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-footer'
      className={cn('flex items-center gap-2 px-6 pt-2 pb-6', className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
