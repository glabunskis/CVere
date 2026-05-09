'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EducationRow } from '@/features/profile/controllers/get-profile-children';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';

import { SectionShell } from './section-shell';

type DraftState = { kind: 'idle' } | { kind: 'creating' } | { kind: 'editing'; id: string };
type Props = { items: EducationRow[]; readOnly?: boolean };

export function EducationEditor({ items, readOnly = false }: Props) {
  const [draft, setDraft] = useState<DraftState>({ kind: 'idle' });

  return (
    <SectionShell
      title='Education'
      description='Degrees and formal training.'
      action={
        !readOnly && draft.kind === 'idle' ? (
          <Button size='sm' variant='outline' onClick={() => setDraft({ kind: 'creating' })}>
            Add education
          </Button>
        ) : null
      }
    >
      {draft.kind === 'creating' ? (
        <EducationForm
          initial={{
            position: items.length,
            institution: '',
            degree: '',
            field: '',
            startDate: '',
            endDate: '',
            summary: '',
          }}
          onCancel={() => setDraft({ kind: 'idle' })}
          onSaved={() => setDraft({ kind: 'idle' })}
        />
      ) : null}

      {items.length === 0 && draft.kind === 'idle' ? (
        <p className='text-sm text-muted-foreground'>No education yet.</p>
      ) : null}

      {items.map((item) =>
        draft.kind === 'editing' && draft.id === item.id ? (
          <EducationForm
            key={item.id}
            initial={{
              id: item.id,
              position: item.position,
              institution: item.institution,
              degree: item.degree ?? '',
              field: item.field ?? '',
              startDate: item.start_date ?? '',
              endDate: item.end_date ?? '',
              summary: item.summary ?? '',
            }}
            onCancel={() => setDraft({ kind: 'idle' })}
            onSaved={() => setDraft({ kind: 'idle' })}
          />
        ) : (
          <EducationCard
            key={item.id}
            row={item}
            readOnly={readOnly}
            onEdit={() => setDraft({ kind: 'editing', id: item.id })}
          />
        ),
      )}
    </SectionShell>
  );
}

function EducationCard({
  row,
  readOnly,
  onEdit,
}: {
  row: EducationRow;
  readOnly: boolean;
  onEdit: () => void;
}) {
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => toast.success('Deleted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <article className='flex flex-col gap-2 rounded-lg border p-3'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold'>{row.institution}</p>
          <p className='text-xs text-muted-foreground'>
            {[row.degree, row.field].filter(Boolean).join(' - ') || '[MISSING]'}
            {row.start_date || row.end_date
              ? ` - ${row.start_date ?? '?'} -> ${row.end_date ?? '?'}`
              : ''}
          </p>
        </div>
        {!readOnly ? (
          <div className='flex gap-2'>
            <Button size='xs' variant='outline' onClick={onEdit}>
              Edit
            </Button>
            <Button
              size='xs'
              variant='destructive'
              disabled={deleting}
              onClick={() => del({ section: 'education', id: row.id })}
            >
              Delete
            </Button>
          </div>
        ) : null}
      </header>
      {row.summary ? <p className='text-sm whitespace-pre-wrap'>{row.summary}</p> : null}
    </article>
  );
}

type EducationDraft = {
  id?: string;
  position: number;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  summary: string;
};

function EducationForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: EducationDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<EducationDraft>(initial);
  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => {
      toast.success('Saved');
      onSaved();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  return (
    <form
      className='grid gap-3 rounded-lg border bg-muted/30 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        execute({
          section: 'education',
          payload: {
            id: draft.id,
            position: draft.position,
            institution: draft.institution,
            degree: draft.degree || null,
            field: draft.field || null,
            startDate: draft.startDate || null,
            endDate: draft.endDate || null,
            summary: draft.summary || null,
          },
        });
      }}
    >
      <div className='grid gap-2 sm:grid-cols-2'>
        <Field label='Institution'>
          <Input
            value={draft.institution}
            required
            onChange={(event) => setDraft({ ...draft, institution: event.target.value })}
          />
        </Field>
        <Field label='Degree'>
          <Input value={draft.degree} onChange={(event) => setDraft({ ...draft, degree: event.target.value })} />
        </Field>
        <Field label='Field'>
          <Input value={draft.field} onChange={(event) => setDraft({ ...draft, field: event.target.value })} />
        </Field>
        <div className='grid grid-cols-2 gap-2'>
          <Field label='Start date'>
            <Input
              type='date'
              value={draft.startDate}
              onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
            />
          </Field>
          <Field label='End date'>
            <Input
              type='date'
              value={draft.endDate}
              onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            />
          </Field>
        </div>
      </div>
      <Field label='Summary'>
        <Textarea
          rows={2}
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
        />
      </Field>
      <div className='flex justify-end gap-2'>
        <Button type='button' size='sm' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' size='sm' disabled={isExecuting}>
          {isExecuting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-1'>
      <Label className='text-xs'>{label}</Label>
      {children}
    </div>
  );
}
