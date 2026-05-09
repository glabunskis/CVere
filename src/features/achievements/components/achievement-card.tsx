'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { AchievementRow } from '@/features/achievements/controllers/list-achievements';

import { dismissAchievement, integrateAchievement } from '../actions/achievement-actions';
import { achievementSectionSchema } from '../schemas';

const SECTIONS = achievementSectionSchema.options;

export function AchievementCard({ row }: { row: AchievementRow }) {
  const [section, setSection] = useState<AchievementRow['target_section']>(row.target_section ?? 'experience');

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
              {new Date(row.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {row.normalized_text ? (
        <p className='text-sm whitespace-pre-wrap'>{row.normalized_text}</p>
      ) : (
        <p className='text-sm text-muted-foreground'>Awaiting normalization.</p>
      )}

      <details className='text-xs'>
        <summary className='cursor-pointer text-muted-foreground'>Original</summary>
        <pre className='mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground'>{row.raw_text}</pre>
      </details>

      {row.status === 'pending' ? (
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Select
            value={section ?? ''}
            onChange={(event) => setSection(event.target.value as AchievementRow['target_section'])}
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
            disabled={integrating || !section}
            onClick={() => integrate({ id: row.id, targetSection: section ?? undefined })}
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
