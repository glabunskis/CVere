'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { SkillRow } from '@/features/profile/controllers/get-profile-children';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';
import type { SkillInput } from '../schemas';

import { SectionShell } from './section-shell';

type Props = { items: SkillRow[]; readOnly?: boolean };

const LEVELS: SkillInput['level'][] = ['beginner', 'intermediate', 'advanced', 'expert'];

export function SkillEditor({ items, readOnly = false }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <SectionShell
      title='Skills'
      description='Tools and techniques you can speak to with concrete examples.'
      action={
        !readOnly && !adding ? (
          <Button size='sm' variant='outline' onClick={() => setAdding(true)}>
            Add skill
          </Button>
        ) : null
      }
    >
      {adding ? (
        <SkillForm
          initial={{ position: items.length, name: '', category: '', level: null }}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : null}

      {items.length === 0 && !adding ? <p className='text-sm text-muted-foreground'>No skills yet.</p> : null}

      <ul className='grid gap-2 sm:grid-cols-2'>
        {items.map((item) => (
          <SkillRowItem key={item.id} row={item} readOnly={readOnly} />
        ))}
      </ul>
    </SectionShell>
  );
}

function SkillRowItem({ row, readOnly }: { row: SkillRow; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => toast.success('Deleted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  if (editing) {
    return (
      <li>
        <SkillForm
          initial={{
            id: row.id,
            position: row.position,
            name: row.name,
            category: row.category ?? '',
            level: row.level ?? null,
          }}
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
        <p className='text-xs text-muted-foreground'>
          {row.category ?? 'Uncategorised'}
          {row.level ? ` - ${row.level}` : ''}
        </p>
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
            onClick={() => del({ section: 'skill', id: row.id })}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </li>
  );
}

type SkillDraft = { id?: string; position: number; name: string; category: string; level: SkillInput['level'] };

function SkillForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: SkillDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<SkillDraft>(initial);
  const { execute, isExecuting } = useAction(updateProfileSection, {
    onSuccess: () => {
      toast.success('Saved');
      onSaved();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  return (
    <form
      className='grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3'
      onSubmit={(event) => {
        event.preventDefault();
        execute({
          section: 'skill',
          payload: {
            id: draft.id,
            position: draft.position,
            name: draft.name,
            category: draft.category || null,
            level: draft.level ?? null,
          },
        });
      }}
    >
      <Field label='Name'>
        <Input value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label='Category'>
        <Input
          value={draft.category}
          placeholder='e.g. Backend, Cloud'
          onChange={(event) => setDraft({ ...draft, category: event.target.value })}
        />
      </Field>
      <Field label='Level'>
        <Select
          value={draft.level ?? ''}
          onChange={(event) => setDraft({ ...draft, level: (event.target.value || null) as SkillInput['level'] })}
        >
          <option value=''>--</option>
          {LEVELS.map((level) => (
            <option key={level ?? ''} value={level ?? ''}>
              {level}
            </option>
          ))}
        </Select>
      </Field>
      <div className='flex justify-end gap-2 sm:col-span-3'>
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
