'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { reviewInterview } from '../actions/interview-actions';

export function ReviewInterviewButton() {
  const { execute, isExecuting } = useAction(reviewInterview, {
    onSuccess: ({ data }) => toast.success(`${data?.count ?? 0} advice notes generated`),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to review'),
  });

  return (
    <Button size='sm' disabled={isExecuting} onClick={() => execute({})}>
      {isExecuting ? 'Reviewing...' : 'Review answers'}
    </Button>
  );
}
