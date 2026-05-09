'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { addInterviewAnswer, draftInterviewAnswer } from '../actions/interview-actions';

export function AddAnswerForm() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const { execute: add, isExecuting: adding } = useAction(addInterviewAnswer, {
    onSuccess: () => {
      toast.success('Saved');
      setQuestion('');
      setAnswer('');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to save'),
  });

  const { execute: draft, isExecuting: drafting } = useAction(draftInterviewAnswer, {
    onSuccess: () => {
      toast.success('AI drafted an answer');
      setQuestion('');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to draft'),
  });

  return (
    <form
      className='flex flex-col gap-3 rounded-xl border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        add({ question, answer });
      }}
    >
      <div className='flex flex-col gap-1'>
        <Label htmlFor='int-question'>Question</Label>
        <Input
          id='int-question'
          value={question}
          required
          onChange={(event) => setQuestion(event.target.value)}
        />
      </div>
      <div className='flex flex-col gap-1'>
        <Label htmlFor='int-answer'>Your answer</Label>
        <Textarea
          id='int-answer'
          rows={4}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
        />
      </div>
      <div className='flex flex-wrap justify-end gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={drafting || !question.trim()}
          onClick={() => draft({ question })}
        >
          {drafting ? 'Drafting...' : 'AI draft answer'}
        </Button>
        <Button type='submit' size='sm' disabled={adding || !question.trim() || !answer.trim()}>
          {adding ? 'Saving...' : 'Save answer'}
        </Button>
      </div>
    </form>
  );
}
