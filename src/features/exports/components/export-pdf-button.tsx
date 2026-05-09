'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { createSignedDownload, exportPdf } from '../actions/export-pdf';

type Props = {
  kind: 'tailored_cv' | 'cover_letter';
  id: string;
  pdfPath: string | null;
};

export function ExportPdfButton({ kind, id, pdfPath }: Props) {
  const { execute: render, isExecuting: rendering } = useAction(exportPdf, {
    onSuccess: ({ data }) => {
      toast.success('PDF rendered');
      if (data?.path) downloadFromPath(data.path);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to render PDF'),
  });

  const { execute: sign } = useAction(createSignedDownload, {
    onSuccess: ({ data }) => {
      if (data?.url) window.open(data.url, '_blank');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to sign URL'),
  });

  function downloadFromPath(path: string) {
    sign({ path });
  }

  return (
    <div className='flex items-center gap-2'>
      <Button size='sm' variant='outline' disabled={rendering} onClick={() => render({ kind, id })}>
        {rendering ? 'Rendering...' : pdfPath ? 'Re-render PDF' : 'Render PDF'}
      </Button>
      {pdfPath ? (
        <Button size='sm' variant='ghost' onClick={() => downloadFromPath(pdfPath)}>
          Download
        </Button>
      ) : null}
    </div>
  );
}
