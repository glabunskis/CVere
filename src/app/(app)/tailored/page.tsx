import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { listTailoredCvs } from '@/features/tailored/controllers/get-tailored';

export default async function TailoredListPage() {
  const items = await listTailoredCvs();

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Tailored CVs</h1>
        <p className='text-sm text-muted-foreground'>
          Derived variants. Each is anchored on a job description and a profile snapshot taken at creation time.
        </p>
      </header>

      {items.length === 0 ? (
        <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
          No tailored CVs yet. Open a job and click &quot;Tailor CV&quot;.
        </p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {items.map((row) => (
            <li key={row.id} className='rounded-xl border bg-card p-4'>
              <Link href={`/tailored/${row.id}`} className='flex items-center justify-between gap-2'>
                <div>
                  <p className='text-sm font-semibold'>
                    {row.job?.role ?? '[MISSING] role'}
                    {row.job?.company ? <span className='text-muted-foreground'> at {row.job.company}</span> : null}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(row.created_at).toLocaleString()} - {row.slug}
                  </p>
                </div>
                <Badge variant={row.status === 'final' ? 'success' : 'warning'}>{row.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
