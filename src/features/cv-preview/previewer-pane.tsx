'use client';

import { useAction } from 'next-safe-action/hooks';
import { CheckIcon, ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';

import { HistoryControls } from '@/features/cv-history/history-controls';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import { usePreviewStore } from './preview-store';
import { renderCv } from './render-cv';

type Props = {
  selectedCvTitle?: string;
};

export function PreviewerPane({ selectedCvTitle }: Props) {
  const signedUrl = usePreviewStore((s) => s.signedUrl);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const isRefreshing = usePreviewStore((s) => s.isRefreshing);

  const { execute: rerender, isExecuting: rerendering } = useAction(renderCv, {
    onSuccess: () => {
      toast.success('Preview refreshed');
      void markPreviewDirty();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to refresh preview'),
  });

  const cvTitle = selectedCvTitle ?? (previewTarget ? `CV ${previewTarget.cvId.slice(0, 8)}` : 'CV');
  const cvIdChip = previewTarget?.cvId.slice(0, 8);

  return (
    <div className='flex h-full flex-col bg-muted/30'>
      {/* Toolbar */}
      <div className='flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4'>
        {/* Left: CV label, name, mono id chip */}
        <div className='flex min-w-0 items-center gap-2'>
          <span className='shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            CV
          </span>
          <span className='min-w-0 truncate text-sm font-medium'>{cvTitle}</span>
          {cvIdChip ? (
            <Badge variant='secondary' className='shrink-0 font-mono text-muted-foreground'>
              {cvIdChip}
            </Badge>
          ) : null}
        </div>

        {/* Right: live status hint, refresh, divider, history controls, open */}
        <div className='flex shrink-0 items-center gap-2'>
          {/* Transient status: the preview auto-updates after every edit; this
              reflects the brief re-sign/reload window rather than a manual
              "stale until you refresh" state. */}
          {isRefreshing ? (
            <div className='flex items-center gap-1.5 rounded-full border border-primary-soft-bd bg-primary-soft px-2.5 py-0.5 text-xs text-foreground'>
              <span className='size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
              Updating…
            </div>
          ) : (
            <div className='flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'>
              <CheckIcon className='size-3' />
              Up to date
            </div>
          )}

          {/* Manual re-render fallback (edits auto-render; this forces one). */}
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

          {/* Divider */}
          <div className='h-4 w-px shrink-0 bg-border' />

          {/* Undo / Redo */}
          <HistoryControls />

          {/* Open in new tab */}
          {signedUrl ? (
            <Button
              size='sm'
              variant='outline'
              aria-label='Open CV PDF in a new tab'
              render={<a href={signedUrl} target='_blank' rel='noreferrer' />}
            >
              <ExternalLinkIcon />
              Open
            </Button>
          ) : null}
        </div>
      </div>

      {/* PDF canvas gutter + iframe */}
      <div className='relative flex-1 bg-gutter'>
        {signedUrl ? (
          <iframe
            key={signedUrl}
            src={`${signedUrl}#toolbar=1&navpanes=0`}
            title='CV preview'
            className='absolute inset-0 h-full w-full'
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
