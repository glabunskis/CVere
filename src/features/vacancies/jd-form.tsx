'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { ingestJobDescription } from './job-actions';

export function JdForm() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [rawText, setRawText] = useState('');

  const { execute, isExecuting } = useAction(ingestJobDescription, {
    onSuccess: ({ data }) => {
      toast.success('Job description ingested');
      if (data?.id) router.push(`/vacancies/${data.id}`);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to ingest'),
  });

  return (
    <form
      className='flex flex-col gap-3 rounded-xl border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        execute({
          rawText,
          company: company.trim() || undefined,
          role: role.trim() || undefined,
        });
      }}
    >
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='jd-company'>Company</Label>
          <Input id='jd-company' value={company} onChange={(event) => setCompany(event.target.value)} />
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='jd-role'>Role</Label>
          <Input id='jd-role' value={role} onChange={(event) => setRole(event.target.value)} />
        </div>
      </div>
      <div className='flex flex-col gap-1'>
        <Label htmlFor='jd-raw'>Job description text</Label>
        <Textarea
          id='jd-raw'
          rows={10}
          required
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder='Paste the full job description.'
        />
      </div>
      <div className='flex justify-end'>
        <Button type='submit' size='sm' disabled={isExecuting || rawText.trim().length < 20}>
          {isExecuting ? 'Ingesting...' : 'Ingest'}
        </Button>
      </div>
    </form>
  );
}
