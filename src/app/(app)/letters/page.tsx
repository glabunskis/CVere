import Link from 'next/link';

import { listCoverLetters } from '@/features/letters/controllers/get-letters';

export default async function LettersListPage() {
  const items = await listCoverLetters();

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Cover letters</h1>
        <p className='text-sm text-muted-foreground'>Short, truthful, anchored on the job description.</p>
      </header>

      {items.length === 0 ? (
        <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
          No cover letters yet. Open a job and click &quot;Cover letter&quot;.
        </p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {items.map((row) => (
            <li key={row.id} className='rounded-xl border bg-card p-4'>
              <Link href={`/letters/${row.id}`} className='flex items-center justify-between gap-2'>
                <div>
                  <p className='text-sm font-semibold'>
                    {row.job?.role ?? '[MISSING] role'}
                    {row.job?.company ? <span className='text-muted-foreground'> at {row.job.company}</span> : null}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(row.created_at).toLocaleString()} - {row.slug}
                  </p>
                </div>
                <span className='text-xs text-primary underline'>Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
