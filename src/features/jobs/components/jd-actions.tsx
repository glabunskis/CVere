'use client';

import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { deleteJobDescription } from '../actions/job-actions';

export function JdActions({ jobId }: { jobId: string }) {
  const router = useRouter();

  const { execute: del, isExecuting: deleting } = useAction(deleteJobDescription, {
    onSuccess: () => {
      toast.success('Deleted');
      router.push('/vacancies');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id: jobId })}>
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
