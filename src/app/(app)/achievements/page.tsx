import { achievementSectionSchema, achievementStatusSchema,listAchievements } from '@/entities/achievement';
import { AchievementsView } from '@/views/achievements';

type SearchParams = Promise<{ status?: string; section?: string }>;

export default async function AchievementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusFilter = parseStatus(params.status);
  const sectionFilter = parseSection(params.section);

  const items = await listAchievements({ status: statusFilter, section: sectionFilter });

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <AchievementsView items={items} />
    </div>
  );
}

function parseStatus(value: string | undefined) {
  if (!value || value === 'all') return 'all' as const;
  const result = achievementStatusSchema.safeParse(value);
  return result.success ? result.data : ('pending' as const);
}

function parseSection(value: string | undefined) {
  if (!value || value === 'all') return 'all' as const;
  const result = achievementSectionSchema.safeParse(value);
  return result.success ? result.data : ('all' as const);
}
