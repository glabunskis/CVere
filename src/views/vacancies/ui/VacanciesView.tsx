import type { JobDescriptionRow } from '@/entities/job';
import { JdForm } from '@/features/vacancies';

import { VacanciesList } from './VacanciesList';

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

      <VacanciesList jobs={jobs} activeSessionId={activeSessionId} />
    </section>
  );
}
