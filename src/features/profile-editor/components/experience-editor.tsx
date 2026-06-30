'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import type { ExperienceRow } from '@/entities/cv';
import { jsonToStringArray } from '@/shared/lib/cv-json';
import { type CvDateFormat, DEFAULT_CV_DATE_FORMAT, formatCvDate } from '@/shared/lib/format-date';
import { AnimatePresence, collapse, fadeIn, motion } from '@/shared/lib/motion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';
import { refreshCvPreview } from '../lib/refresh-preview';
import { commaListToArray, stringArrayFromTextarea } from '../utils';

import { SectionShell } from './section-shell';

type DraftState =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'editing'; id: string };

type Props = {
  items: ExperienceRow[];
  readOnly?: boolean;
  dateFormat?: CvDateFormat;
};

export function ExperienceEditor({ items, readOnly = false, dateFormat = DEFAULT_CV_DATE_FORMAT }: Props) {
  const [draft, setDraft] = useState<DraftState>({ kind: 'idle' });

  return (
    <SectionShell
      title='Experience'
      description='Roles you have held. Use bullets that anchor on situation, action, and outcome.'
      count={items.length}
      action={
        !readOnly && draft.kind === 'idle' ? (
          <Button size='sm' variant='outline' onClick={() => setDraft({ kind: 'creating' })}>
            Add experience
          </Button>
        ) : null
      }
    >
      <AnimatePresence initial={false}>
        {draft.kind === 'creating' ? (
          <motion.div
            key='create'
            className='overflow-hidden'
            variants={collapse}
            initial='hidden'
            animate='visible'
            exit='exit'
          >
            <ExperienceForm
              initial={{
                position: items.length,
                company: '',
                role: '',
                location: '',
                startDate: '',
                endDate: '',
                isCurrent: false,
                summary: '',
                bullets: [],
                stack: [],
              }}
              onCancel={() => setDraft({ kind: 'idle' })}
              onSaved={() => setDraft({ kind: 'idle' })}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {items.length === 0 && draft.kind === 'idle' ? (
        <p className='text-sm text-muted-foreground'>No experience yet. Add the most recent role first.</p>
      ) : null}

      {items.map((item) => {
        const isEditing = draft.kind === 'editing' && draft.id === item.id;
        return (
          <AnimatePresence key={item.id} mode='wait' initial={false}>
            {isEditing ? (
              <motion.div
                key='edit'
                className='overflow-hidden'
                variants={collapse}
                initial='hidden'
                animate='visible'
                exit='exit'
              >
                <ExperienceForm
                  initial={{
                    id: item.id,
                    position: item.position,
                    company: item.company,
                    role: item.role,
                    location: item.location ?? '',
                    startDate: item.start_date ?? '',
                    endDate: item.end_date ?? '',
                    isCurrent: item.is_current,
                    summary: item.summary ?? '',
                    bullets: jsonToStringArray(item.bullets),
                    stack: jsonToStringArray(item.stack),
                  }}
                  onCancel={() => setDraft({ kind: 'idle' })}
                  onSaved={() => setDraft({ kind: 'idle' })}
                />
              </motion.div>
            ) : (
              <motion.div key='card' variants={fadeIn} initial='hidden' animate='visible' exit='exit'>
                <ExperienceCard
                  row={item}
                  readOnly={readOnly}
                  dateFormat={dateFormat}
                  onEdit={() => setDraft({ kind: 'editing', id: item.id })}
                />
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </SectionShell>
  );
}

function ExperienceCard({
  row,
  readOnly,
  dateFormat,
  onEdit,
}: {
  row: ExperienceRow;
  readOnly: boolean;
  dateFormat: CvDateFormat;
  onEdit: () => void;
}) {
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => {
      toast.success('Deleted');
      refreshCvPreview();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });
  const bullets = jsonToStringArray(row.bullets);
  const stack = jsonToStringArray(row.stack);
  const startLabel = formatCvDate(row.start_date, dateFormat) ?? row.start_date ?? '[MISSING]';
  const endLabel = row.is_current
    ? 'Present'
    : (formatCvDate(row.end_date, dateFormat) ?? row.end_date ?? '[MISSING]');

  return (
    <article className='flex flex-col gap-2 rounded-lg border p-3'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold'>
            {row.role} <span className='text-muted-foreground'>at {row.company}</span>
          </p>
          <p className='text-xs text-muted-foreground'>
            {startLabel} - {endLabel}
            {row.location ? ` - ${row.location}` : ''}
          </p>
        </div>
        {!readOnly ? (
          <div className='flex gap-2'>
            <Button size='xs' variant='outline' onClick={onEdit}>
              Edit
            </Button>
            <Button
              size='xs'
              variant='ghost'
              className='hover:bg-destructive/10 hover:text-destructive'
              disabled={deleting}
              onClick={() => del({ section: 'experience', id: row.id })}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ) : null}
      </header>
      {row.summary ? <p className='text-sm whitespace-pre-wrap'>{row.summary}</p> : null}
      {bullets.length ? (
        <ul className='ml-4 list-disc text-sm'>
          {bullets.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      {stack.length ? (
        <p className='text-xs text-muted-foreground'>
          Stack: <span className='text-foreground'>{stack.join(', ')}</span>
        </p>
      ) : null}
    </article>
  );
}

type ExperienceDraft = {
  id?: string;
  position: number;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  summary: string;
  bullets: string[];
  stack: string[];
};

function ExperienceForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ExperienceDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ExperienceDraft>(initial);
  const [bulletsText, setBulletsText] = useState(initial.bullets.join('\n'));
  const [stackText, setStackText] = useState(initial.stack.join(', '));

  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => {
      toast.success('Saved');
      refreshCvPreview();
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
          section: 'experience',
          payload: {
            id: draft.id,
            position: draft.position,
            company: draft.company,
            role: draft.role,
            location: draft.location || null,
            startDate: draft.startDate || null,
            endDate: draft.endDate || null,
            isCurrent: draft.isCurrent,
            summary: draft.summary || null,
            bullets: stringArrayFromTextarea(bulletsText),
            stack: commaListToArray(stackText),
          },
        });
      }}
    >
      <div className='grid gap-2 sm:grid-cols-2'>
        <Field label='Company'>
          <Input
            value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
            required
          />
        </Field>
        <Field label='Role'>
          <Input
            value={draft.role}
            onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            required
          />
        </Field>
        <Field label='Location'>
          <Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
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
              disabled={draft.isCurrent}
              onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
            />
          </Field>
        </div>
      </div>
      <label className='flex items-center gap-2 text-sm'>
        <input
          type='checkbox'
          checked={draft.isCurrent}
          onChange={(event) =>
            setDraft({ ...draft, isCurrent: event.target.checked, endDate: event.target.checked ? '' : draft.endDate })
          }
        />
        Currently in this role
      </label>
      <Field label='Summary'>
        <Textarea
          value={draft.summary}
          rows={2}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
        />
      </Field>
      <Field label='Bullets (one per line)'>
        <Textarea value={bulletsText} rows={4} onChange={(event) => setBulletsText(event.target.value)} />
      </Field>
      <Field label='Stack (comma-separated)'>
        <Input value={stackText} onChange={(event) => setStackText(event.target.value)} />
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
