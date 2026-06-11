import { notFound } from 'next/navigation';

import { getJob } from '@/entities/job';
import { getSession } from '@/entities/user';
import { buildVacancyTailorPrefill, getOrCreateDefaultSession } from '@/features/chat';
import { VacancyDetailView } from '@/views/vacancy-detail';

type PageProps = { params: Promise<{ id: string }> };

export default async function VacancyPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSession();
  const [job, activeSession] = await Promise.all([
    getJob(id),
    user ? getOrCreateDefaultSession(user.id) : Promise.resolve(null),
  ]);
  if (!job) notFound();

  const prefill = encodeURIComponent(
    buildVacancyTailorPrefill({
      vacancyId: job.id,
      role: job.role,
      company: job.company,
    }),
  );
  const tailorHref = activeSession
    ? `/dashboard?session=${encodeURIComponent(activeSession.id)}&prefill=${prefill}`
    : `/dashboard?prefill=${prefill}`;

  return <VacancyDetailView job={job} tailorHref={tailorHref} />;
}
