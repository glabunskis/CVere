'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CertificationRow } from '@/features/profile/controllers/get-profile-children';

import { deleteProfileChild, updateProfileSection } from '../actions/update-profile-section';

import { SectionShell } from './section-shell';

type DraftState = { kind: 'idle' } | { kind: 'creating' } | { kind: 'editing'; id: string };
type Props = { items: CertificationRow[]; readOnly?: boolean };

export function CertificationEditor({ items, readOnly = false }: Props) {
  const [draft, setDraft] = useState<DraftState>({ kind: 'idle' });

  return (
    <SectionShell
      title='Certifications'
      description='External credentials with issuer and dates.'
      action={
        !readOnly && draft.kind === 'idle' ? (
          <Button size='sm' variant='outline' onClick={() => setDraft({ kind: 'creating' })}>
            Add certification
          </Button>
        ) : null
      }
    >
      {draft.kind === 'creating' ? (
        <CertificationForm
          initial={{ position: items.length, name: '', issuer: '', issuedAt: '', expiresAt: '', link: '' }}
          onCancel={() => setDraft({ kind: 'idle' })}
          onSaved={() => setDraft({ kind: 'idle' })}
        />
      ) : null}

      {items.length === 0 && draft.kind === 'idle' ? (
        <p className='text-sm text-muted-foreground'>No certifications yet.</p>
      ) : null}

      {items.map((item) =>
        draft.kind === 'editing' && draft.id === item.id ? (
          <CertificationForm
            key={item.id}
            initial={{
              id: item.id,
              position: item.position,
              name: item.name,
              issuer: item.issuer ?? '',
              issuedAt: item.issued_at ?? '',
              expiresAt: item.expires_at ?? '',
              link: item.link ?? '',
            }}
            onCancel={() => setDraft({ kind: 'idle' })}
            onSaved={() => setDraft({ kind: 'idle' })}
          />
        ) : (
          <CertificationCard
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

function CertificationCard({
  row,
  readOnly,
  onEdit,
}: {
  row: CertificationRow;
  readOnly: boolean;
  onEdit: () => void;
}) {
  const { execute: del, isExecuting: deleting } = useAction(deleteProfileChild, {
    onSuccess: () => toast.success('Deleted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  return (
    <article className='flex items-start justify-between gap-2 rounded-lg border p-3'>
      <div>
        <p className='text-sm font-semibold'>{row.name}</p>
        <p className='text-xs text-muted-foreground'>
          {row.issuer ?? '[MISSING]'}
          {row.issued_at ? ` - issued ${row.issued_at}` : ''}
          {row.expires_at ? ` - expires ${row.expires_at}` : ''}
        </p>
        {row.link ? (
          <a className='text-xs text-primary underline' href={row.link} target='_blank' rel='noreferrer'>
            {row.link}
          </a>
        ) : null}
      </div>
      {!readOnly ? (
        <div className='flex gap-1'>
          <Button size='xs' variant='outline' onClick={onEdit}>
            Edit
          </Button>
          <Button
            size='xs'
            variant='destructive'
            disabled={deleting}
            onClick={() => del({ section: 'certification', id: row.id })}
          >
            Delete
          </Button>
        </div>
      ) : null}
    </article>
  );
}

type CertificationDraft = {
  id?: string;
  position: number;
  name: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  link: string;
};

function CertificationForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: CertificationDraft;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<CertificationDraft>(initial);
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
          section: 'certification',
          payload: {
            id: draft.id,
            position: draft.position,
            name: draft.name,
            issuer: draft.issuer || null,
            issuedAt: draft.issuedAt || null,
            expiresAt: draft.expiresAt || null,
            link: draft.link || null,
          },
        });
      }}
    >
      <Field label='Name'>
        <Input value={draft.name} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label='Issuer'>
        <Input value={draft.issuer} onChange={(event) => setDraft({ ...draft, issuer: event.target.value })} />
      </Field>
      <Field label='Issued'>
        <Input
          type='date'
          value={draft.issuedAt}
          onChange={(event) => setDraft({ ...draft, issuedAt: event.target.value })}
        />
      </Field>
      <Field label='Expires'>
        <Input
          type='date'
          value={draft.expiresAt}
          onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
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
