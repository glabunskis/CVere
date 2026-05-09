import { Badge } from '@/components/ui/badge';

import type { DiffEntry, DiffResult } from '../diff';

type ColumnProps = {
  title: string;
  description: string;
  entries: DiffEntry[];
  variant: 'success' | 'warning' | 'destructive';
};

function Column({ title, description, entries, variant }: ColumnProps) {
  return (
    <div className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
      <header>
        <h3 className='text-sm font-semibold'>
          {title} <span className='text-xs text-muted-foreground'>({entries.length})</span>
        </h3>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </header>
      {entries.length === 0 ? (
        <p className='text-xs text-muted-foreground'>None.</p>
      ) : (
        <ul className='flex flex-col gap-2'>
          {entries.map((entry, idx) => (
            <li key={`${entry.source}-${idx}`} className='flex items-start gap-2 text-sm'>
              <Badge variant={variant} className='shrink-0'>
                {entry.source}
              </Badge>
              <span>{entry.term}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DiffColumns({ diff }: { diff: DiffResult }) {
  return (
    <div className='grid gap-4 md:grid-cols-3'>
      <Column
        title='Matches'
        description='Direct overlap with your fact base.'
        entries={diff.matches}
        variant='success'
      />
      <Column
        title='Weak'
        description='Indirectly supported in summary or bullets. Strengthen with explicit facts.'
        entries={diff.weak}
        variant='warning'
      />
      <Column
        title='Gaps'
        description='Not found. Add an achievement or skill if you have evidence.'
        entries={diff.gaps}
        variant='destructive'
      />
    </div>
  );
}
