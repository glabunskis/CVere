'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdviceNoteRow } from '@/features/advice/controllers/list-advice';

import { applyAdvice, dismissAdvice } from '../actions/advice-actions';

const SEVERITY_VARIANT: Record<AdviceNoteRow['severity'], 'secondary' | 'warning' | 'destructive'> = {
  info: 'secondary',
  weak: 'warning',
  gap: 'destructive',
};

export function AdviceCard({ row, compact = false }: { row: AdviceNoteRow; compact?: boolean }) {
  const { execute: apply, isExecuting: applying } = useAction(applyAdvice, {
    onSuccess: () => toast.success('Advice applied'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to apply'),
  });

  const { execute: dismiss, isExecuting: dismissing } = useAction(dismissAdvice, {
    onSuccess: () => toast.success('Dismissed'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to dismiss'),
  });

  return (
    <article className={`flex flex-col gap-2 rounded-lg border ${compact ? 'p-3' : 'bg-card p-4'}`}>
      <header className='flex items-center gap-2'>
        <Badge variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Badge>
        <Badge variant='outline'>{row.target}</Badge>
        <Badge variant={row.status === 'open' ? 'warning' : row.status === 'applied' ? 'success' : 'secondary'}>
          {row.status}
        </Badge>
      </header>
      <p className='text-sm whitespace-pre-wrap'>{row.body}</p>
      {row.status === 'open' ? (
        <div className='flex justify-end gap-2'>
          <Button size='xs' variant='outline' disabled={dismissing} onClick={() => dismiss({ id: row.id })}>
            Dismiss
          </Button>
          <Button size='xs' disabled={applying} onClick={() => apply({ id: row.id })}>
            Apply
          </Button>
        </div>
      ) : null}
    </article>
  );
}
