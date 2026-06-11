'use client';

import { cn } from '@/shared/lib/cn';

type Props = {
  text: string;
  /**
   * Whether to render a blinking caret directly after the text. The chat
   * panel turns this on for the trailing text part of the last assistant
   * message while `status === 'streaming'`. The caret disappears as soon as
   * the next part arrives or the stream ends.
   */
  showCaret?: boolean;
  className?: string;
};

/**
 * Renders an assistant text part. The caret is a zero-width inline element
 * with a 1.25s blink (`animate-caret-blink`, shipped by `tw-animate-css`).
 *
 * Implementation note: we keep this component pure-presentational. The
 * decision of when to show the caret lives in the message component so
 * markup stays simple and the caret never trails non-streaming text.
 */
export function StreamingText({ text, showCaret = false, className }: Props) {
  return (
    <p
      className={cn(
        'whitespace-pre-wrap break-words leading-relaxed',
        className,
      )}
    >
      {text}
      {showCaret ? (
        <span
          aria-hidden='true'
          className='ms-0.5 inline-block h-[1em] w-[2px] -mb-[2px] translate-y-[2px] animate-caret-blink bg-current align-middle'
        />
      ) : null}
    </p>
  );
}
