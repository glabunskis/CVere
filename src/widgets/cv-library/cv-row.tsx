'use client';

import { cn } from '@/shared/lib/cn';
import { useHasMounted } from '@/shared/lib/use-has-mounted';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

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
  const hasMounted = useHasMounted();
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-transparent px-2 py-2 transition-colors duration-150',
        isActive
          ? 'border-primary-soft-bd bg-primary-soft'
          : 'hover:bg-muted',
      )}
    >
      <button
        type='button'
        onClick={onOpen}
        className='min-w-0 flex-1 rounded-sm text-left'
      >
        <div className='flex items-center gap-1.5'>
          {isActive ? <span className='size-1.5 shrink-0 rounded-full bg-primary' /> : null}
          <p className='truncate text-sm font-medium text-foreground'>{title}</p>
          {isActive ? (
            <Badge variant='secondary' className='shrink-0 py-0 text-[10px]'>
              Active
            </Badge>
          ) : null}
        </div>
        {meta ? <p className='truncate text-xs text-muted-foreground'>{meta}</p> : null}
        <p className='truncate font-mono text-[11px] text-muted-foreground'>
          {hasMounted ? formatUpdatedAt(updatedAt) : '\u00A0'}
        </p>
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
