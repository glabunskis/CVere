'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { cn } from '@/shared/lib/cn';
import { ScrollArea } from '@/shared/ui/scroll-area';

// Worker is loaded from a CDN pinned to the bundled pdfjs version. This avoids
// Turbopack worker-bundling issues and guarantees the worker API version always
// matches the library.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const HORIZONTAL_PADDING = 48; // matches p-6 (24px) on each side
const ZOOM_STEP = 0.1;

type Props = {
  url: string;
  /** Scale multiplier where 1 = fit-to-width. */
  zoom: number;
  onZoomDelta?: (delta: number) => void;
};

// After a resize settles for this long, re-rasterize the PDF at the new width.
const COMMIT_DEBOUNCE_MS = 180;

export function PdfViewer({ url, zoom, onZoomDelta }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  // `committedWidth` is the width the page canvas is actually rasterized at; it
  // only changes once a resize has settled (debounced). `scale` is the live CSS
  // transform applied to the already-rendered canvas so the CV grows/shrinks
  // smoothly during a resize without re-rasterizing (which causes flicker).
  const [committedWidth, setCommittedWidth] = useState(0);
  const committedRef = useRef(0);
  const [scale, setScale] = useState(1);
  // The live fit-to-width target during a resize. Used to size a layout "slot"
  // so the scaled pages stay centered in the viewport (a bare transform keeps
  // the old, larger layout box and drifts off-center when shrinking).
  const [liveWidth, setLiveWidth] = useState(0);
  const commitTimer = useRef<number | null>(null);
  // The display's real device pixel ratio. react-pdf multiplies `width` by the
  // `devicePixelRatio` we pass, and the browser then downscales the canvas to
  // this real ratio. To avoid fractional downscaling (which makes pdf.js render
  // gaps between glyphs), the value we pass must be a whole-number multiple of
  // this. Default 2 covers the common HiDPI case during SSR; the canvas is only
  // rasterized client-side after load, so reading the real ratio here is safe.
  const [deviceRatio] = useState(() =>
    typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1,
  );

  // The actual scrolling element is the ScrollArea Viewport. We reach it from
  // the content node to measure the fit-to-width target and to attach a
  // non-passive wheel listener for ctrl/cmd zoom.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;

    const commit = (width: number) => {
      committedRef.current = width;
      setCommittedWidth(width);
      setScale(1);
    };

    const update = () => {
      const width = Math.max(0, viewport.clientWidth - HORIZONTAL_PADDING);
      if (width <= 0) return;
      setLiveWidth(width);
      // First measurement: render at the real width immediately.
      if (committedRef.current === 0) {
        commit(width);
        return;
      }
      // Mid-resize: scale the existing canvas (cheap, no re-raster), then
      // debounce a single crisp re-render once the resize stops.
      setScale(width / committedRef.current);
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => {
        commit(width);
        commitTimer.current = null;
      }, COMMIT_DEBOUNCE_MS);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);

    const handleWheel = (event: WheelEvent) => {
      if (!onZoomDelta || (!event.ctrlKey && !event.metaKey)) return;
      event.preventDefault();
      onZoomDelta(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      observer.disconnect();
      viewport.removeEventListener('wheel', handleWheel);
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    };
  }, [onZoomDelta]);

  const pageWidth = committedWidth > 0 ? committedWidth * zoom : undefined;
  // Render the canvas 1:1 with physical pixels (no browser up-/down-scaling).
  // Any supersample + downscale resamples and softens glyphs; matching the
  // device ratio exactly is the sharpest at every zoom level.
  const renderRatio = deviceRatio;
  const scaling = scale !== 1;

  return (
    <ScrollArea className='h-full w-full' scrollbars='both'>
      <Document
        key={url}
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            Loading preview…
          </div>
        }
        error={
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            Failed to load preview.
          </div>
        }
        className='min-h-full w-full p-6'
        inputRef={contentRef}
      >
        {/* Layout "slot": while resizing it is sized to the live fit-to-width and
            centered, so the scaled pages stay centered (and clipped, no scrollbar)
            instead of drifting off-center. When settled it is content-sized so
            zoomed pages can scroll normally. */}
        <div
          className={cn('mx-auto', scaling ? 'flex justify-center' : 'w-fit')}
          style={scaling ? { width: liveWidth, overflow: 'hidden' } : undefined}
        >
          {/* Carries the live CSS scale so the rendered pages grow/shrink smoothly
              during a resize; transform doesn't trigger re-rasterization. */}
          <div
            className='flex w-fit flex-col items-center gap-4'
            style={
              scaling
                ? {
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    willChange: 'transform',
                  }
                : undefined
            }
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`${url}-${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                devicePixelRatio={renderRatio}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className='overflow-hidden rounded-sm shadow-lg ring-1 ring-black/5'
              />
            ))}
          </div>
        </div>
      </Document>
    </ScrollArea>
  );
}
