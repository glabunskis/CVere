'use client';

import { LoaderIcon } from 'lucide-react';

/**
 * Shown under the last message while the agent is working (request submitted
 * or response streaming). A spinning loader plus "Working" with three trailing
 * dots that appear one-by-one left-to-right, then disappear in the same order
 * (see the `dot-sequence` keyframe in globals.css).
 */
export function WorkingIndicator() {
  return (
    <div className='flex items-center gap-1.5 px-1 text-xs text-muted-foreground'>
      <LoaderIcon className='size-3.5 animate-spin' aria-hidden='true' />
      <span className='font-medium'>Working</span>
      <span className='-ms-1 inline-flex' aria-hidden='true'>
        <span className='animate-[dot-sequence_1.4s_ease-in-out_infinite]'>.</span>
        <span className='animate-[dot-sequence_1.4s_ease-in-out_infinite] [animation-delay:0.2s]'>
          .
        </span>
        <span className='animate-[dot-sequence_1.4s_ease-in-out_infinite] [animation-delay:0.4s]'>
          .
        </span>
      </span>
      <span className='sr-only'>The assistant is working</span>
    </div>
  );
}
