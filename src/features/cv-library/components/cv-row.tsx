'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CvRowProps = {
  title: string;
  meta?: string | null;
  updatedAt?: string | null;
  isActive: boolean;
  onOpen: () => void;
  actions?: React.ReactNode;
};

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return 'Updated recently';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Updated recently';
  return new Date(timestamp).toLocaleString();
}

export function CvRow({ title, meta, updatedAt, isActive, onOpen, actions }: CvRowProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-2 py-2',
        isActive ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-muted/60',
      )}
    >
      <button
        type='button'
        onClick={onOpen}
        className='min-w-0 flex-1 rounded-sm text-left'
      >
        <p className='truncate text-sm font-medium text-foreground'>{title}</p>
        {meta ? <p className='truncate text-xs text-muted-foreground'>{meta}</p> : null}
        <p className='truncate text-[11px] text-muted-foreground'>{formatUpdatedAt(updatedAt)}</p>
      </button>
      <div className='flex shrink-0 items-center gap-1'>
        <Button type='button' size='sm' variant='ghost' onClick={onOpen}>
          Open
        </Button>
        {actions}
      </div>
    </div>
  );
}
