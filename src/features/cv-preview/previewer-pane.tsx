'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { HistoryControls } from '@/features/cv-history/history-controls';
import { Button } from '@/shared/ui/button';

import { usePreviewStore } from './preview-store';
import { renderCv } from './render-cv';

export function PreviewerPane() {
  const signedUrl = usePreviewStore((s) => s.signedUrl);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);
  const previewTarget = usePreviewStore((s) => s.previewTarget);

  const { execute: rerender, isExecuting: rerendering } = useAction(renderCv, {
    onSuccess: () => {
      toast.success('Preview refreshed');
      void markPreviewDirty();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to refresh preview'),
  });

  const targetLabel = previewTarget ? `CV ${previewTarget.cvId.slice(0, 8)}` : 'CV';

  return (
    <div className='flex h-full flex-col rounded-xl border bg-muted/30'>
      <div className='flex items-center justify-between gap-2 border-b bg-background px-3 py-2'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='font-medium'>{targetLabel}</span>
        </div>
        <div className='flex items-center gap-2'>
          <HistoryControls />
          <Button
            size='sm'
            variant='outline'
            disabled={rerendering || !previewTarget}
            onClick={() => {
              if (!previewTarget) return;
              rerender({ cvId: previewTarget.cvId });
            }}
          >
            {rerendering ? 'Rendering...' : 'Refresh'}
          </Button>
          {signedUrl ? (
            <Button
              size='sm'
              variant='ghost'
              render={<a href={signedUrl} target='_blank' rel='noreferrer' />}
            >
              Open
            </Button>
          ) : null}
        </div>
      </div>
      <div className='relative flex-1'>
        {signedUrl ? (
          <iframe
            key={signedUrl}
            src={`${signedUrl}#toolbar=1&navpanes=0`}
            title='CV preview'
            className='absolute inset-0 h-full w-full rounded-b-xl'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            No preview yet for this target. Press Refresh to render.
          </div>
        )}
      </div>
    </div>
  );
}
