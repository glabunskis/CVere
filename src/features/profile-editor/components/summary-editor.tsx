'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { updateProfileSection } from '../actions/update-profile-section';
import { refreshCvPreview } from '../lib/refresh-preview';

type Props = {
  initialSummary: string | null;
  readOnly?: boolean;
};

export function SummaryEditor({ initialSummary, readOnly = false }: Props) {
  const [value, setValue] = useState(initialSummary ?? '');

  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => {
      toast.success('Summary saved');
      refreshCvPreview();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save summary'),
  });

  if (readOnly) {
    return (
      <div className='flex flex-col gap-2'>
        <h3 className='text-sm font-medium'>Summary</h3>
        <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
          {initialSummary && initialSummary.trim().length > 0 ? initialSummary : '[MISSING] summary'}
        </p>
      </div>
    );
  }

  return (
    <form
      className='flex flex-col gap-2'
        onSubmit={(event) => {
          event.preventDefault();
          execute({ section: 'summary', payload: { summary: value.trim() === '' ? null : value } });
        }}
    >
      <Label htmlFor='profile-summary'>Summary</Label>
      <Textarea
        id='profile-summary'
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={5}
        placeholder='2-3 lines anchored on concrete evidence. No hype.'
      />
      <div className='flex justify-end'>
        <Button type='submit' size='sm' disabled={isExecuting}>
          {isExecuting ? 'Saving...' : 'Save summary'}
        </Button>
      </div>
    </form>
  );
}
