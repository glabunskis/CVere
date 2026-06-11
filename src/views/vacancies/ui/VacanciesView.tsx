import Link from 'next/link';

import type { JobDescriptionRow } from '@/entities/job';
import { buildVacancyTailorPrefill } from '@/features/chat';
import { JdForm } from '@/features/vacancies';

type VacanciesViewProps = {
  jobs: JobDescriptionRow[];
  activeSessionId: string | null;
};

export function VacanciesView({ jobs, activeSessionId }: VacanciesViewProps) {
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
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <Link href={`/vacancies/${job.id}`} className='text-sm font-semibold hover:underline'>
                      {job.role ?? '[MISSING] role'}
                      {job.company ? (
                        <span className='text-muted-foreground'> at {job.company}</span>
                      ) : null}
                    </Link>
                    <p className='text-xs text-muted-foreground'>{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Link href={`/vacancies/${job.id}`} className='text-xs text-primary underline'>
                      Open
                    </Link>
                    <Link
                      href={buildTailorHref({
                        sessionId: activeSessionId,
                        vacancyId: job.id,
                        role: job.role,
                        company: job.company,
                      })}
                      className='text-xs text-primary underline'
                    >
                      Tailor in chat
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function buildTailorHref({
  sessionId,
  vacancyId,
  role,
  company,
}: {
  sessionId: string | null;
  vacancyId: string;
  role: string | null;
  company: string | null;
}): string {
  const prefill = encodeURIComponent(
    buildVacancyTailorPrefill({
      vacancyId,
      role,
      company,
    }),
  );
  if (!sessionId) return `/dashboard?prefill=${prefill}`;
  return `/dashboard?session=${encodeURIComponent(sessionId)}&prefill=${prefill}`;
}
