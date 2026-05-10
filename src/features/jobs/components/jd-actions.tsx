'use client';

import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { generateCoverLetter } from '@/features/letters/actions/letter-actions';
import { tailorCv } from '@/features/tailored/actions/tailored-actions';

import { deleteJobDescription, reExtractJobDescription } from '../actions/job-actions';

export function JdActions({ jobId, hasExtracted }: { jobId: string; hasExtracted: boolean }) {
  const router = useRouter();

  const { execute: reExtract, isExecuting: extracting } = useAction(reExtractJobDescription, {
    onSuccess: () => toast.success('Re-extracted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to re-extract'),
  });

  const { execute: tailor, isExecuting: tailoring } = useAction(tailorCv, {
    onSuccess: ({ data }) => {
      toast.success('Tailored CV created');
      if (data?.id) router.push(`/tailored/${data.id}`);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to tailor CV'),
  });

  const { execute: writeLetter, isExecuting: writingLetter } = useAction(generateCoverLetter, {
    onSuccess: ({ data }) => {
      toast.success('Cover letter drafted');
      if (data?.id) router.push(`/letters/${data.id}`);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to draft cover letter'),
  });

  const { execute: del, isExecuting: deleting } = useAction(deleteJobDescription, {
    onSuccess: () => {
      toast.success('Deleted');
      router.push('/vacancies');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button size='sm' variant='outline' disabled={extracting} onClick={() => reExtract({ id: jobId })}>
        {extracting ? 'Extracting...' : hasExtracted ? 'Re-extract' : 'Extract'}
      </Button>
      <Button
        size='sm'
        disabled={tailoring || !hasExtracted}
        onClick={() => tailor({ jobDescriptionId: jobId })}
      >
        {tailoring ? 'Tailoring...' : 'Tailor CV'}
      </Button>
      <Button
        size='sm'
        variant='outline'
        disabled={writingLetter || !hasExtracted}
        onClick={() => writeLetter({ jobDescriptionId: jobId })}
      >
        {writingLetter ? 'Drafting...' : 'Cover letter'}
      </Button>
      <Button size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id: jobId })}>
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
