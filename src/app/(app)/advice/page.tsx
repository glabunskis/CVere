import { AdviceCard } from '@/features/advice/components/advice-card';
import { ReviewButton } from '@/features/advice/components/review-button';
import { listAdvice } from '@/features/advice/controllers/list-advice';
import { adviceStatusSchema } from '@/features/advice/schemas';

type SearchParams = Promise<{ status?: string }>;

export default async function AdvicePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const items = await listAdvice({ status });

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.target;
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Advice</h1>
          <p className='text-sm text-muted-foreground'>
            Critique store. Notes are never auto-applied. Review the master profile or a tailored variant.
          </p>
        </div>
        <ReviewButton label='Review profile' />
      </header>

      {items.length === 0 ? (
        <p className='rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground'>
          No advice yet. Click &quot;Review profile&quot; to generate notes.
        </p>
      ) : (
        <div className='flex flex-col gap-6'>
          {Array.from(grouped.entries()).map(([target, rows]) => (
            <div key={target} className='flex flex-col gap-3'>
              <h2 className='text-lg font-semibold capitalize'>{target}</h2>
              <div className='flex flex-col gap-3'>
                {rows.map((row) => (
                  <AdviceCard key={row.id} row={row} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function parseStatus(value: string | undefined) {
  if (!value || value === 'all') return 'open' as const;
  const result = adviceStatusSchema.safeParse(value);
  return result.success ? result.data : ('open' as const);
}
