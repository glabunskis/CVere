import { AchievementCard } from '@/features/achievements/components/achievement-card';
import { AchievementFilters } from '@/features/achievements/components/achievement-filters';
import { AddAchievementForm } from '@/features/achievements/components/add-achievement-form';
import { listAchievements } from '@/features/achievements/controllers/list-achievements';
import { achievementSectionSchema, achievementStatusSchema } from '@/features/achievements/schemas';

type SearchParams = Promise<{ status?: string; section?: string }>;

export default async function AchievementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusFilter = parseStatus(params.status);
  const sectionFilter = parseSection(params.section);

  const items = await listAchievements({ status: statusFilter, section: sectionFilter });

  return (
    <section className='flex flex-col gap-6'>
      <header>
        <h1 className='text-2xl font-semibold tracking-tight'>Achievements</h1>
        <p className='text-sm text-muted-foreground'>
          Append-only inbox. Capture wins as they happen, then integrate or dismiss explicitly.
        </p>
      </header>

      <AddAchievementForm />

      <div className='flex flex-col gap-4'>
        <AchievementFilters />
        {items.length === 0 ? (
          <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
            Nothing matches these filters.
          </p>
        ) : (
          <div className='flex flex-col gap-3'>
            {items.map((row) => (
              <AchievementCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </section>
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
