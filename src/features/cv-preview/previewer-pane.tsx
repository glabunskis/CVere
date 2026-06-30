'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAction } from 'next-safe-action/hooks';
import { CheckIcon, ExternalLinkIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { toast } from 'sonner';

import { HistoryControls } from '@/features/cv-history/history-controls';
import { AnimatePresence, fadeIn, motion } from '@/shared/lib/motion';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import { usePreviewStore } from './preview-store';
import { renderCv } from './render-cv';

// react-pdf touches browser-only globals (DOMMatrix) at module-evaluation
// time, which crashes during SSR. Load it client-side only.
const PdfViewer = dynamic(() => import('./pdf-viewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => (
    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
      Loading preview…
    </div>
  ),
});

type Props = {
  selectedCvTitle?: string;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

export function PreviewerPane({ selectedCvTitle }: Props) {
  const signedUrl = usePreviewStore((s) => s.signedUrl);
  const markPreviewDirty = usePreviewStore((s) => s.markPreviewDirty);
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const isRefreshing = usePreviewStore((s) => s.isRefreshing);

  const [zoom, setZoom] = useState(1);
  const adjustZoom = (delta: number) => setZoom((current) => clampZoom(current + delta));

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
          <AnimatePresence mode='wait' initial={false}>
            {isRefreshing ? (
              <motion.div
                key='updating'
                className='flex items-center gap-1.5 rounded-full border border-primary-soft-bd bg-primary-soft px-2.5 py-0.5 text-xs text-foreground'
                variants={fadeIn}
                initial='hidden'
                animate='visible'
                exit='exit'
              >
                <span className='size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
                Updating…
              </motion.div>
            ) : (
              <motion.div
                key='up-to-date'
                className='flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground'
                variants={fadeIn}
                initial='hidden'
                animate='visible'
                exit='exit'
              >
                <CheckIcon className='size-3' />
                Up to date
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Zoom controls (fit-to-width at 100%) */}
          {signedUrl ? (
            <div className='flex items-center gap-1'>
              <Button
                size='icon-sm'
                variant='outline'
                aria-label='Zoom out'
                disabled={zoom <= MIN_ZOOM}
                onClick={() => adjustZoom(-0.1)}
              >
                <ZoomOutIcon />
              </Button>
              <Button
                size='sm'
                variant='ghost'
                aria-label='Reset zoom to fit width'
                className='w-12 tabular-nums'
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                size='icon-sm'
                variant='outline'
                aria-label='Zoom in'
                disabled={zoom >= MAX_ZOOM}
                onClick={() => adjustZoom(0.1)}
              >
                <ZoomInIcon />
              </Button>
              <div className='h-4 w-px shrink-0 bg-border' />
            </div>
          ) : null}

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

      {/* PDF canvas gutter + custom (chrome-free) viewer.
          `min-h-0` keeps this the only scroll region so the toolbar above stays
          fixed while the PDF scrolls. */}
      <div className='relative min-h-0 flex-1 bg-gutter'>
        {signedUrl ? (
          <PdfViewer url={signedUrl} zoom={zoom} onZoomDelta={adjustZoom} />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            No preview yet for this target. Press Refresh to render.
          </div>
        )}
      </div>
    </div>
  );
}
