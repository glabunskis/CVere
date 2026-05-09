'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  InterviewAdviceRow,
  InterviewAnswerRow,
} from '@/features/interview/controllers/get-interview';

import {
  applyInterviewAdvice,
  deleteInterviewAnswer,
  dismissInterviewAdvice,
  updateInterviewAnswer,
} from '../actions/interview-actions';

const SEVERITY_VARIANT: Record<InterviewAdviceRow['severity'], 'secondary' | 'warning' | 'destructive'> = {
  info: 'secondary',
  weak: 'warning',
  gap: 'destructive',
};

export function AnswerCard({
  row,
  advice,
}: {
  row: InterviewAnswerRow;
  advice: InterviewAdviceRow[];
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(row.question);
  const [answer, setAnswer] = useState(row.answer);

  const { execute: update, isExecuting: saving } = useAction(updateInterviewAnswer, {
    onSuccess: () => {
      toast.success('Saved');
      setEditing(false);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  const { execute: del, isExecuting: deleting } = useAction(deleteInterviewAnswer, {
    onSuccess: () => toast.success('Deleted'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete'),
  });

  const { execute: applyAdv } = useAction(applyInterviewAdvice, {
    onSuccess: () => toast.success('Applied'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to apply'),
  });

  const { execute: dismissAdv } = useAction(dismissInterviewAdvice, {
    onSuccess: () => toast.success('Dismissed'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to dismiss'),
  });

  const relatedAdvice = advice.filter((entry) => entry.interview_answer_id === row.id);

  return (
    <article className='flex flex-col gap-3 rounded-xl border bg-card p-4'>
      {editing ? (
        <form
          className='flex flex-col gap-3'
          onSubmit={(event) => {
            event.preventDefault();
            update({ id: row.id, question, answer });
          }}
        >
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} required />
          <Textarea
            rows={4}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
          />
          <div className='flex justify-end gap-2'>
            <Button type='button' size='sm' variant='ghost' onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <header className='flex items-start justify-between gap-2'>
            <p className='text-sm font-semibold'>{row.question}</p>
            <div className='flex gap-1'>
              <Button size='xs' variant='outline' onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size='xs' variant='destructive' disabled={deleting} onClick={() => del({ id: row.id })}>
                Delete
              </Button>
            </div>
          </header>
          <p className='text-sm whitespace-pre-wrap'>{row.answer}</p>
        </>
      )}

      {relatedAdvice.length ? (
        <div className='flex flex-col gap-2 border-t pt-3'>
          <p className='text-xs font-medium text-muted-foreground'>Advice</p>
          {relatedAdvice.map((entry) => (
            <div key={entry.id} className='flex flex-col gap-1 rounded-lg border p-2'>
              <div className='flex items-center gap-2'>
                <Badge variant={SEVERITY_VARIANT[entry.severity]}>{entry.severity}</Badge>
                <Badge variant={entry.status === 'open' ? 'warning' : entry.status === 'applied' ? 'success' : 'secondary'}>
                  {entry.status}
                </Badge>
              </div>
              <p className='text-sm'>{entry.body}</p>
              {entry.status === 'open' ? (
                <div className='flex justify-end gap-1'>
                  <Button size='xs' variant='outline' onClick={() => dismissAdv({ id: entry.id })}>
                    Dismiss
                  </Button>
                  <Button size='xs' onClick={() => applyAdv({ id: entry.id })}>
                    Apply
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
