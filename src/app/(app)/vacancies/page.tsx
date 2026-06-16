import { listJobs } from '@/entities/job';
import { getSession } from '@/entities/user';
import { getOrCreateDefaultSession } from '@/features/chat';
import { VacanciesView } from '@/views/vacancies';

export default async function VacanciesPage() {
  const user = await getSession();
  const [jobs, activeSession] = await Promise.all([
    listJobs(),
    user ? getOrCreateDefaultSession(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <VacanciesView jobs={jobs} activeSessionId={activeSession?.id ?? null} />
    </div>
  );
}
