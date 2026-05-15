'use client';

import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { renderMasterCv } from '../actions/render-master-cv';
import { usePreviewStore } from '../stores/preview-store';

type Props = {
  pinnedLabel: string | null;
};

export function PreviewerPane({ pinnedLabel }: Props) {
  const signedUrl = usePreviewStore((s) => s.signedUrl);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);

  const { execute: rerender, isExecuting: rerendering } = useAction(renderMasterCv, {
    onSuccess: () => {
      toast.success('Preview refreshed');
      void markPreviewDirty();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to refresh preview'),
  });

  return (
    <div className='flex h-full flex-col rounded-xl border bg-muted/30'>
      <div className='flex items-center justify-between gap-2 border-b bg-background px-3 py-2'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='font-medium'>{pinnedLabel ? 'Pinned tailored CV' : 'Master CV'}</span>
          {pinnedLabel ? (
            <span className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>{pinnedLabel}</span>
          ) : null}
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='outline' disabled={rerendering} onClick={() => rerender()}>
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
            No preview yet. Press Refresh to render.
          </div>
        )}
      </div>
    </div>
  );
}
