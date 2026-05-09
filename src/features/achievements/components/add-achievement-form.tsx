'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { addAchievement } from '../actions/achievement-actions';

export function AddAchievementForm() {
  const [value, setValue] = useState('');
  const { execute, isExecuting } = useAction(addAchievement, {
    onSuccess: () => {
      toast.success('Captured. AI normalized the text.');
      setValue('');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to capture'),
  });

  return (
    <form
      className='flex flex-col gap-2 rounded-xl border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        execute({ rawText: value });
      }}
    >
      <Label htmlFor='achievement-raw'>Capture an achievement</Label>
      <Textarea
        id='achievement-raw'
        rows={3}
        value={value}
        placeholder='Plain text. Anything from a one-liner to a paragraph.'
        onChange={(event) => setValue(event.target.value)}
      />
      <div className='flex justify-end'>
        <Button type='submit' size='sm' disabled={isExecuting || !value.trim()}>
          {isExecuting ? 'Normalizing...' : 'Capture'}
        </Button>
      </div>
    </form>
  );
}
