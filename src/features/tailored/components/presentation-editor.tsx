'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExportPdfButton } from '@/features/exports/components/export-pdf-button';

import {
  deleteTailored,
  setTailoredStatus,
  updateTailoredSections,
} from '../actions/tailored-actions';

type Sections = {
  summary?: string | null;
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
  emphasis?: string[];
};

type Props = {
  id: string;
  status: 'draft' | 'final';
  pdfPath: string | null;
  sections: Sections;
};

export function PresentationEditor({ id, status, pdfPath, sections }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState(sections.summary ?? '');
  const [emphasisText, setEmphasisText] = useState((sections.emphasis ?? []).join(', '));

  const { execute: save, isExecuting: saving } = useAction(updateTailoredSections, {
    onSuccess: () => toast.success('Presentation saved'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  const { execute: setStatus, isExecuting: statusUpdating } = useAction(setTailoredStatus, {
    onSuccess: () => toast.success('Status updated'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to update status'),
  });

  const { execute: del, isExecuting: deleting } = useAction(deleteTailored, {
    onSuccess: () => {
      toast.success('Deleted');
      router.push('/tailored');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <form
      className='flex flex-col gap-4 rounded-xl border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        save({
          id,
          summary,
          sections: {
            experienceOrder: sections.experienceOrder ?? [],
            experienceOverrides: {},
            projectsOrder: sections.projectsOrder ?? [],
            projectsOverrides: {},
            skillsOrder: sections.skillsOrder ?? [],
            emphasis: emphasisText
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          },
        });
      }}
    >
      <header className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-base font-semibold'>Presentation</h3>
        <div className='flex flex-wrap items-center gap-2'>
          <ExportPdfButton kind='tailored_cv' id={id} pdfPath={pdfPath} />
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={statusUpdating}
            onClick={() => setStatus({ id, status: status === 'final' ? 'draft' : 'final' })}
          >
            {statusUpdating ? '...' : status === 'final' ? 'Mark draft' : 'Mark final'}
          </Button>
          <Button type='button' size='sm' variant='destructive' disabled={deleting} onClick={() => del({ id })}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </header>

      <div className='flex flex-col gap-1'>
        <Label htmlFor='tailored-summary'>Tailored summary</Label>
        <Textarea
          id='tailored-summary'
          rows={4}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <p className='text-xs text-muted-foreground'>
          Edit emphasis or wording. Facts come from the snapshot below; never invent here.
        </p>
      </div>

      <div className='flex flex-col gap-1'>
        <Label htmlFor='tailored-emphasis'>Emphasis (comma-separated)</Label>
        <Input
          id='tailored-emphasis'
          value={emphasisText}
          placeholder='terms to highlight, e.g. typescript, postgres, kubernetes'
          onChange={(event) => setEmphasisText(event.target.value)}
        />
      </div>

      <div className='flex justify-end'>
        <Button type='submit' size='sm' disabled={saving}>
          {saving ? 'Saving...' : 'Save presentation'}
        </Button>
      </div>
    </form>
  );
}
