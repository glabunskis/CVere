'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import type { LanguageRow } from '@/entities/cv';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select } from '@/shared/ui/select';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';
import type { LanguageInput } from '../schemas';

import { SectionShell } from './section-shell';

type Props = { items: LanguageRow[]; readOnly?: boolean };

const PROFICIENCIES: LanguageInput['proficiency'][] = [
  'beginner',
  'elementary',
  'intermediate',
  'upper_intermediate',
  'advanced',
  'native',
];

export function LanguageEditor({ items, readOnly = false }: Props) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell
      title='Languages'
      description='Spoken languages and proficiency.'
      action={
        !readOnly && !adding ? (
          <Button size='sm' variant='outline' onClick={() => setAdding(true)}>
            Add language
          </Button>
        ) : null
      }
    >
      {adding ? (
        <LanguageForm
          initial={{ position: items.length, name: '', proficiency: null }}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : null}

      {items.length === 0 && !adding ? <p className='text-sm text-muted-foreground'>No languages yet.</p> : null}

      <ul className='grid gap-2 sm:grid-cols-2'>
        {items.map((item) => (
          <LanguageRowItem key={item.id} row={item} readOnly={readOnly} />
        ))}
      </ul>
    </SectionShell>
  );
}

function LanguageRowItem({ row, readOnly }: { row: LanguageRow; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => toast.success('Deleted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  if (editing) {
    return (
      <li>
        <LanguageForm
          initial={{ id: row.id, position: row.position, name: row.name, proficiency: row.proficiency ?? null }}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className='flex items-start justify-between gap-2 rounded-lg border p-3'>
      <div>
        <p className='text-sm font-medium'>{row.name}</p>
        <p className='text-xs text-muted-foreground'>{row.proficiency ?? '[MISSING]'}</p>
      </div>
      {!readOnly ? (
        <div className='flex gap-1'>
          <Button size='xs' variant='outline' onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size='xs'
            variant='destructive'
            disabled={deleting}
            onClick={() => del({ section: 'language', id: row.id })}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </li>
  );
}

type LanguageDraft = {
  id?: string;
  position: number;
  name: string;
  proficiency: LanguageInput['proficiency'];
};

function LanguageForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: LanguageDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<LanguageDraft>(initial);
  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => {
      toast.success('Saved');
      onSaved();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  return (
    <form
      className='grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2'
      onSubmit={(event) => {
        event.preventDefault();
        execute({
          section: 'language',
          payload: {
            id: draft.id,
            position: draft.position,
            name: draft.name,
            proficiency: draft.proficiency ?? null,
          },
        });
      }}
    >
      <Field label='Name'>
        <Input value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label='Proficiency'>
        <Select
          value={draft.proficiency ?? ''}
          onChange={(event) =>
            setDraft({ ...draft, proficiency: (event.target.value || null) as LanguageInput['proficiency'] })
          }
        >
          <option value=''>--</option>
          {PROFICIENCIES.map((value) => (
            <option key={value ?? ''} value={value ?? ''}>
              {value}
            </option>
          ))}
        </Select>
      </Field>
      <div className='flex justify-end gap-2 sm:col-span-2'>
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
