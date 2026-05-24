'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { deleteJobDescription } from '../actions/job-actions';

export function JdActions({ jobId, tailorHref }: { jobId: string; tailorHref?: string }) {
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
      {tailorHref ? (
        <Button size='sm' variant='outline' render={<Link href={tailorHref} />}>
          Tailor in chat
        </Button>
      ) : null}
      <Button size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id: jobId })}>
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
