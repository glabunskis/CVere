'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

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

export function PdfViewer({ url, zoom, onZoomDelta }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  // The display's real device pixel ratio. react-pdf multiplies `width` by the
  // `devicePixelRatio` we pass, and the browser then downscales the canvas to
  // this real ratio. To avoid fractional downscaling (which makes pdf.js render
  // gaps between glyphs), the value we pass must be a whole-number multiple of
  // this. Default 2 covers the common HiDPI case before hydration.
  const [deviceRatio, setDeviceRatio] = useState(2);

  useEffect(() => {
    setDeviceRatio(window.devicePixelRatio || 1);
  }, []);

  // The actual scrolling element is the ScrollArea Viewport. We reach it from
  // the content node to measure the fit-to-width target and to attach a
  // non-passive wheel listener for ctrl/cmd zoom.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;

    const update = () => setAvailableWidth(Math.max(0, viewport.clientWidth - HORIZONTAL_PADDING));
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
    };
  }, [onZoomDelta]);

  const pageWidth = availableWidth > 0 ? availableWidth * zoom : undefined;
  // Render the canvas 1:1 with physical pixels (no browser up-/down-scaling).
  // Any supersample + downscale resamples and softens glyphs; matching the
  // device ratio exactly is the sharpest at every zoom level.
  const renderRatio = deviceRatio;

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
        className='mx-auto flex min-h-full w-fit flex-col items-center gap-4 p-6'
        inputRef={contentRef}
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
      </Document>
    </ScrollArea>
  );
}
