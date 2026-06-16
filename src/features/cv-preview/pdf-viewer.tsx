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
  // Rasterize the page canvas at >=2x so thin serif strokes stay crisp on
  // standard (1x) displays. Capped to keep canvas sizes reasonable when zoomed.
  const [pixelRatio, setPixelRatio] = useState(2);

  useEffect(() => {
    setPixelRatio(Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1))));
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
            devicePixelRatio={pixelRatio}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className='overflow-hidden rounded-sm shadow-lg ring-1 ring-black/5'
          />
        ))}
      </Document>
    </ScrollArea>
  );
}
