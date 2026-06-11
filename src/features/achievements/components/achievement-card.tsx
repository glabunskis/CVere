'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import type { AchievementRow } from '@/entities/achievement/list-achievements';
import { integrableSectionSchema } from '@/entities/achievement/schemas';
import { useHasMounted } from '@/shared/lib/use-has-mounted';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/select';

import { dismissAchievement, integrateAchievement } from '../actions/achievement-actions';

const SECTIONS = integrableSectionSchema.options;
type IntegrableSection = (typeof SECTIONS)[number];

function defaultSection(suggested: AchievementRow['target_section']): IntegrableSection {
  return suggested && (SECTIONS as readonly string[]).includes(suggested)
    ? (suggested as IntegrableSection)
    : 'summary';
}

export function AchievementCard({ row }: { row: AchievementRow }) {
  const hasMounted = useHasMounted();
  const [section, setSection] = useState<IntegrableSection>(defaultSection(row.target_section));

  const { execute: integrate, isExecuting: integrating } = useAction(integrateAchievement, {
    onSuccess: () => toast.success('Integrated into profile'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to integrate'),
  });

  const { execute: dismiss, isExecuting: dismissing } = useAction(dismissAchievement, {
    onSuccess: () => toast.success('Dismissed'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to dismiss'),
  });

  return (
    <article className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
      <header className='flex items-start justify-between gap-2'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <StatusBadge status={row.status} />
            <span className='text-xs text-muted-foreground'>
              {hasMounted ? new Date(row.created_at).toLocaleString() : '\u00A0'}
            </span>
          </div>
        </div>
      </header>

      {row.normalized_text ? (
        <p className='text-sm whitespace-pre-wrap'>{row.normalized_text}</p>
      ) : (
        <p className='text-sm whitespace-pre-wrap'>{row.raw_text}</p>
      )}

      {row.status === 'pending' ? (
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Select
            value={section}
            onChange={(event) => setSection(event.target.value as IntegrableSection)}
            className='w-auto'
          >
            {SECTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Button
            size='sm'
            variant='outline'
            disabled={dismissing}
            onClick={() => dismiss({ id: row.id })}
          >
            Dismiss
          </Button>
          <Button
            size='sm'
            disabled={integrating}
            onClick={() => integrate({ id: row.id, targetSection: section })}
          >
            {integrating ? 'Integrating...' : 'Integrate'}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function StatusBadge({ status }: { status: AchievementRow['status'] }) {
  if (status === 'integrated') return <Badge variant='success'>Integrated</Badge>;
  if (status === 'dismissed') return <Badge variant='secondary'>Dismissed</Badge>;
  return <Badge variant='warning'>Pending</Badge>;
}
