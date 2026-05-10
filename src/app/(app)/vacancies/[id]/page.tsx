import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { DiffColumns } from '@/features/jobs/components/diff-columns';
import { JdActions } from '@/features/jobs/components/jd-actions';
import { getJob } from '@/features/jobs/controllers/get-jobs';
import { buildJobDiff } from '@/features/jobs/diff';
import { parseExtracted } from '@/features/jobs/extracted';
import { getOrCreateProfile } from '@/features/profile/controllers/get-profile';
import { getProfileChildren } from '@/features/profile/controllers/get-profile-children';

type PageProps = { params: Promise<{ id: string }> };

export default async function VacancyPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const profile = await getOrCreateProfile();
  if (!profile) notFound();

  const children = await getProfileChildren(profile.id);
  const extracted = parseExtracted(job.extracted);
  const diff = extracted ? buildJobDiff(extracted, profile.summary, children) : null;

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {job.role ?? '[MISSING] role'}
          {job.company ? <span className='text-muted-foreground'> at {job.company}</span> : null}
        </h1>
        <p className='text-xs text-muted-foreground'>
          Ingested {new Date(job.created_at).toLocaleString()}
        </p>
      </header>

      <JdActions jobId={job.id} hasExtracted={Boolean(extracted)} />

      {extracted ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
            <h2 className='text-sm font-semibold'>Extracted</h2>
            <ExtractedList title='Requirements' items={extracted.requirements} />
            <ExtractedList title='Stack' items={extracted.stack} />
            <ExtractedList title='Keywords' items={extracted.keywords} />
            <ExtractedList title='Ownership' items={extracted.ownership} />
            {extracted.seniority ? (
              <p className='text-xs text-muted-foreground'>
                Seniority: <Badge variant='secondary'>{extracted.seniority}</Badge>
              </p>
            ) : null}
          </div>
          <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
            <h2 className='text-sm font-semibold'>Raw</h2>
            <pre className='max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground'>
              {job.raw_text}
            </pre>
          </div>
        </div>
      ) : (
        <div className='rounded-xl border bg-card p-6 text-sm text-muted-foreground'>
          No extracted data yet. Re-run extraction.
        </div>
      )}

      {diff ? (
        <div className='flex flex-col gap-3'>
          <h2 className='text-lg font-semibold'>Profile diff</h2>
          <DiffColumns diff={diff} />
        </div>
      ) : null}
    </section>
  );
}

function ExtractedList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className='mb-1 text-xs font-medium text-muted-foreground'>{title}</h3>
      {items.length === 0 ? (
        <p className='text-xs text-muted-foreground'>None.</p>
      ) : (
        <ul className='ml-4 list-disc text-sm'>
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
