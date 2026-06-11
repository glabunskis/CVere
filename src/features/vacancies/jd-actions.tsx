'use client';

import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { deleteJobDescription, startVacancyTailor } from './job-actions';

export function JdActions({ jobId, tailorHref }: { jobId: string; tailorHref?: string }) {
  const router = useRouter();

  const { execute: del, isExecuting: deleting } = useAction(deleteJobDescription, {
    onSuccess: () => {
      toast.success('Deleted');
      router.push('/vacancies');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  const { execute: startTailor, isExecuting: startingTailor } = useAction(startVacancyTailor, {
    onSuccess: () => {
      if (!tailorHref) return;
      router.push(tailorHref);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to start tailoring'),
  });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {tailorHref ? (
        <Button
          size='sm'
          variant='outline'
          disabled={startingTailor}
          onClick={() => startTailor({ jobId })}
        >
          {startingTailor ? 'Preparing...' : 'Tailor in chat'}
        </Button>
      ) : null}
      <Button size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id: jobId })}>
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
