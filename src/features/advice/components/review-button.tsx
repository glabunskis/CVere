'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { reviewCv } from '../actions/advice-actions';

type Props = {
  tailoredCvId?: string;
  label?: string;
};

export function ReviewButton({ tailoredCvId, label = 'Run review' }: Props) {
  const { execute, isExecuting } = useAction(reviewCv, {
    onSuccess: ({ data }) => toast.success(`${data?.count ?? 0} advice notes generated`),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to review'),
  });

  return (
    <Button size='sm' disabled={isExecuting} onClick={() => execute({ tailoredCvId })}>
      {isExecuting ? 'Reviewing...' : label}
    </Button>
  );
}
