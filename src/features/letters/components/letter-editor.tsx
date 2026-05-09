'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExportPdfButton } from '@/features/exports/components/export-pdf-button';

import { deleteCoverLetter, updateCoverLetter } from '../actions/letter-actions';

type Props = {
  id: string;
  initialBody: string;
  pdfPath: string | null;
};

export function LetterEditor({ id, initialBody, pdfPath }: Props) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);

  const { execute: save, isExecuting: saving } = useAction(updateCoverLetter, {
    onSuccess: () => toast.success('Cover letter saved'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  const { execute: del, isExecuting: deleting } = useAction(deleteCoverLetter, {
    onSuccess: () => {
      toast.success('Deleted');
      router.push('/letters');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <form
      className='flex flex-col gap-3 rounded-xl border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        save({ id, body });
      }}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Label htmlFor='letter-body'>Body</Label>
        <div className='flex flex-wrap items-center gap-2'>
          <ExportPdfButton kind='cover_letter' id={id} pdfPath={pdfPath} />
          <Button type='button' size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id })}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
      <Textarea
        id='letter-body'
        rows={20}
        className='font-mono'
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className='flex justify-end'>
        <Button type='submit' size='sm' disabled={saving || body.trim().length === 0}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
