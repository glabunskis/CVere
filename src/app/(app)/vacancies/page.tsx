import Link from 'next/link';

import { JdForm } from '@/features/jobs/components/jd-form';
import { listJobs } from '@/features/jobs/controllers/get-jobs';

export default async function VacanciesPage() {
  const jobs = await listJobs();

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Vacancies</h1>
        <p className='text-sm text-muted-foreground'>
          Saved vacancies. Paste the raw description; review or delete from the detail view.
        </p>
      </header>

      <JdForm />

      <div className='flex flex-col gap-3'>
        <h2 className='text-lg font-semibold'>Recent</h2>
        {jobs.length === 0 ? (
          <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
            No vacancies yet.
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {jobs.map((job) => (
              <li key={job.id} className='rounded-xl border bg-card p-4'>
                <Link href={`/vacancies/${job.id}`} className='flex items-baseline justify-between gap-2'>
                  <div>
                    <p className='text-sm font-semibold'>
                      {job.role ?? '[MISSING] role'}
                      {job.company ? <span className='text-muted-foreground'> at {job.company}</span> : null}
                    </p>
                    <p className='text-xs text-muted-foreground'>{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                  <span className='text-xs text-primary underline'>Open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
