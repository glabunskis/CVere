'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4'>
      <h2 className='text-xl font-semibold'>Something went wrong</h2>
      <button
        onClick={reset}
        className='rounded-md bg-zinc-800 px-4 py-2 text-sm transition-colors hover:bg-zinc-700'
      >
        Try again
      </button>
    </div>
  );
}
