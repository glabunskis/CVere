import type { JobDescriptionRow } from '@/entities/job';
import { JdActions } from '@/features/vacancies';

type VacancyDetailViewProps = {
  job: JobDescriptionRow;
  tailorHref: string;
};

export function VacancyDetailView({ job, tailorHref }: VacancyDetailViewProps) {
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

      <JdActions jobId={job.id} tailorHref={tailorHref} />

      <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
        <h2 className='text-sm font-semibold'>Raw</h2>
        <pre className='max-h-[36rem] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground'>
          {job.raw_text}
        </pre>
      </div>
    </section>
  );
}
