'use client';

import { useState, useTransition } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';

import { updateCvPreferences } from '../actions/update-cv-preferences';
import type { CvTemplate } from '../schemas';

type Props = {
  template: CvTemplate;
  accentHex: string;
};

const TEMPLATES: { id: CvTemplate; label: string; description: string }[] = [
  { id: 'single-column', label: 'Single column', description: 'Classic, dense, ATS-friendly.' },
  { id: 'two-column', label: 'Two column', description: 'Sidebar with skills and projects.' },
];

export function TemplatePicker({ template, accentHex }: Props) {
  const [localAccent, setLocalAccent] = useState(accentHex);
  const [isPending, startTransition] = useTransition();

  const { execute } = useAction(updateCvPreferences, {
    onSuccess: () => toast.success('Style updated'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to update style'),
  });

  function pickTemplate(next: CvTemplate) {
    startTransition(() => execute({ template: next }));
  }

  function commitAccent(value: string) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return;
    setLocalAccent(value);
    startTransition(() => execute({ accentHex: value }));
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs uppercase tracking-wide text-muted-foreground'>Template</Label>
        <div className='grid grid-cols-2 gap-2'>
          {TEMPLATES.map((opt) => {
            const active = template === opt.id;
            return (
              <button
                key={opt.id}
                type='button'
                onClick={() => pickTemplate(opt.id)}
                aria-pressed={active}
                disabled={isPending}
                className={
                  'flex flex-col gap-1 rounded-lg border p-2 text-left text-xs transition-colors disabled:opacity-60 ' +
                  (active
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted')
                }
              >
                <span className='text-sm font-medium text-foreground'>{opt.label}</span>
                <span>{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='accent-color' className='text-xs uppercase tracking-wide text-muted-foreground'>
          Accent color
        </Label>
        <div className='flex items-center gap-2'>
          <input
            id='accent-color'
            type='color'
            value={localAccent}
            onChange={(e) => setLocalAccent(e.target.value)}
            onBlur={(e) => commitAccent(e.target.value)}
            className='h-8 w-12 cursor-pointer rounded border bg-transparent'
          />
          <input
            type='text'
            value={localAccent}
            onChange={(e) => setLocalAccent(e.target.value)}
            onBlur={(e) => commitAccent(e.target.value)}
            placeholder='#0066CC'
            maxLength={7}
            className='h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          />
        </div>
      </div>
    </div>
  );
}
