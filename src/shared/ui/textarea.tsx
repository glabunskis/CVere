'use client';

import type { ComponentProps, PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';

import { cn } from '@/shared/lib/cn';

const MIN_HEIGHT_PX = 80;

type TextareaProps = ComponentProps<'textarea'> & {
  /**
   * When true (default), the textarea can be resized by dragging anywhere
   * along its bottom edge via a custom handle, instead of the browser's
   * corner-only grip. Set to false for embedded contexts (e.g. InputGroup)
   * that manage their own sizing.
   */
  edgeResize?: boolean;
};

function Textarea({ className, edgeResize = true, disabled, ...props }: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  const baseClasses =
    'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50';

  if (!edgeResize) {
    return (
      <textarea
        data-slot='textarea'
        disabled={disabled}
        className={cn(baseClasses, className)}
        {...props}
      />
    );
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    const node = textareaRef.current;
    if (!state || !node) return;
    const next = Math.max(MIN_HEIGHT_PX, state.startHeight + (event.clientY - state.startY));
    node.style.height = `${next}px`;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = textareaRef.current;
    if (!node) return;
    event.preventDefault();
    dragState.current = { startY: event.clientY, startHeight: node.offsetHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className='relative w-full'>
      <textarea
        ref={textareaRef}
        data-slot='textarea'
        disabled={disabled}
        className={cn(baseClasses, 'resize-none', className)}
        {...props}
      />
      {!disabled ? (
        <div
          aria-hidden='true'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className='group absolute inset-x-0 bottom-0 flex h-3 cursor-row-resize touch-none items-center justify-center'
        >
          <span className='h-0.5 w-8 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100' />
        </div>
      ) : null}
    </div>
  );
}

export { Textarea };
