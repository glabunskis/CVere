'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import type { ProjectRow } from '@/entities/cv';
import { jsonToStringArray } from '@/shared/lib/cv-json';
import { AnimatePresence, collapse, fadeIn, motion } from '@/shared/lib/motion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';
import { refreshCvPreview } from '../lib/refresh-preview';
import { commaListToArray, stringArrayFromTextarea } from '../utils';

import { SectionShell } from './section-shell';

type DraftState = { kind: 'idle' } | { kind: 'creating' } | { kind: 'editing'; id: string };

type Props = { items: ProjectRow[]; readOnly?: boolean };

export function ProjectEditor({ items, readOnly = false }: Props) {
  const [draft, setDraft] = useState<DraftState>({ kind: 'idle' });

  return (
    <SectionShell
      title='Projects'
      description='Side or open-source work. Link out where useful.'
      count={items.length}
      action={
        !readOnly && draft.kind === 'idle' ? (
          <Button size='sm' variant='outline' onClick={() => setDraft({ kind: 'creating' })}>
            Add project
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
            <ProjectForm
              initial={{ position: items.length, name: '', description: '', link: '', bullets: [], stack: [] }}
              onCancel={() => setDraft({ kind: 'idle' })}
              onSaved={() => setDraft({ kind: 'idle' })}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {items.length === 0 && draft.kind === 'idle' ? (
        <p className='text-sm text-muted-foreground'>No projects yet.</p>
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
                <ProjectForm
                  initial={{
                    id: item.id,
                    position: item.position,
                    name: item.name,
                    description: item.description ?? '',
                    link: item.link ?? '',
                    bullets: jsonToStringArray(item.bullets),
                    stack: jsonToStringArray(item.stack),
                  }}
                  onCancel={() => setDraft({ kind: 'idle' })}
                  onSaved={() => setDraft({ kind: 'idle' })}
                />
              </motion.div>
            ) : (
              <motion.div key='card' variants={fadeIn} initial='hidden' animate='visible' exit='exit'>
                <ProjectCard row={item} readOnly={readOnly} onEdit={() => setDraft({ kind: 'editing', id: item.id })} />
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </SectionShell>
  );
}

function ProjectCard({ row, readOnly, onEdit }: { row: ProjectRow; readOnly: boolean; onEdit: () => void }) {
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => {
      toast.success('Deleted');
      refreshCvPreview();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });
  const bullets = jsonToStringArray(row.bullets);
  const stack = jsonToStringArray(row.stack);

  return (
    <article className='flex flex-col gap-2 rounded-lg border p-3'>
      <header className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold'>{row.name}</p>
          {row.link ? (
            <a href={row.link} className='text-xs text-primary underline' target='_blank' rel='noreferrer'>
              {row.link}
            </a>
          ) : null}
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
              onClick={() => del({ section: 'project', id: row.id })}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ) : null}
      </header>
      {row.description ? <p className='text-sm whitespace-pre-wrap'>{row.description}</p> : null}
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

type ProjectDraft = {
  id?: string;
  position: number;
  name: string;
  description: string;
  link: string;
  bullets: string[];
  stack: string[];
};

function ProjectForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ProjectDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ProjectDraft>(initial);
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
          section: 'project',
          payload: {
            id: draft.id,
            position: draft.position,
            name: draft.name,
            description: draft.description || null,
            link: draft.link || null,
            bullets: stringArrayFromTextarea(bulletsText),
            stack: commaListToArray(stackText),
          },
        });
      }}
    >
      <Field label='Name'>
        <Input value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label='Description'>
        <Textarea
          rows={2}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </Field>
      <Field label='Link'>
        <Input
          type='url'
          placeholder='https://'
          value={draft.link}
          onChange={(event) => setDraft({ ...draft, link: event.target.value })}
        />
      </Field>
      <Field label='Bullets (one per line)'>
        <Textarea rows={3} value={bulletsText} onChange={(event) => setBulletsText(event.target.value)} />
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
