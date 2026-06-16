'use client';

import { useState, useTransition } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';

import { usePreviewStore } from '@/features/cv-preview/preview-store';
import { CV_DATE_FORMATS, type CvDateFormat } from '@/shared/lib/format-date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';

import { updateCvStyle } from './cv-style-actions';
import type { CvTemplate } from './schemas';

type Props = {
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  experienceDateFormat: CvDateFormat;
};

const TEMPLATES: { id: CvTemplate; label: string; description: string }[] = [
  { id: 'single-column', label: 'Single column', description: 'Classic, dense, ATS-friendly.' },
  { id: 'two-column', label: 'Two column', description: 'Sidebar with skills and projects.' },
];

const ACCENT_PRESETS = [
  '#2F5FD0',
  '#C0392B',
  '#16A34A',
  '#7C3AED',
  '#0891B2',
  '#D97706',
  '#374151',
  '#DB2777',
];

export function TemplatePicker({
  template,
  accentHex,
  educationDateFormat,
  certificationDateFormat,
  experienceDateFormat,
}: Props) {
  const [localAccent, setLocalAccent] = useState(accentHex);
  const [isPending, startTransition] = useTransition();
  // The selected template is reactive client state (kept in the preview store)
  // so chat-driven layout changes and manual picks reflect without a full
  // server refresh. Falls back to the server prop before hydration.
  const storeTemplate = usePreviewStore((s) => s.template);
  const setStoreTemplate = usePreviewStore((s) => s.setTemplate);
  const activeTemplate = (storeTemplate as CvTemplate | null) ?? template;

  const { execute } = useAction(updateCvStyle, {
    onSuccess: () => {
      toast.success('Style updated');
      void usePreviewStore.getState().markPreviewDirty();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to update style'),
  });

  function pickTemplate(next: CvTemplate) {
    setStoreTemplate(next);
    startTransition(() => execute({ template: next }));
  }

  function commitAccent(value: string) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return;
    setLocalAccent(value);
    startTransition(() => execute({ accentHex: value }));
  }

  function pickEducationDateFormat(next: CvDateFormat) {
    startTransition(() => execute({ educationDateFormat: next }));
  }

  function pickCertificationDateFormat(next: CvDateFormat) {
    startTransition(() => execute({ certificationDateFormat: next }));
  }

  function pickExperienceDateFormat(next: CvDateFormat) {
    startTransition(() => execute({ experienceDateFormat: next }));
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label className='text-xs uppercase tracking-wide text-muted-foreground'>Template</Label>
        <div className='grid grid-cols-2 gap-2'>
          {TEMPLATES.map((opt) => {
            const active = activeTemplate === opt.id;
            return (
              <button
                key={opt.id}
                type='button'
                onClick={() => pickTemplate(opt.id)}
                aria-pressed={active}
                disabled={isPending}
                className={
                  'flex flex-col gap-2 rounded-lg border p-2 text-left text-xs transition-colors disabled:opacity-60 ' +
                  (active
                    ? 'border-primary bg-primary-soft ring-1 ring-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted')
                }
              >
                {opt.id === 'single-column' ? <SingleColumnThumbnail /> : <TwoColumnThumbnail />}
                <span className='text-sm font-medium text-foreground'>{opt.label}</span>
                <span className='text-muted-foreground'>{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className='flex flex-col gap-2'>
        <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
          Document accent
        </Label>
        <div className='flex flex-wrap gap-1.5'>
          {ACCENT_PRESETS.map((hex) => (
            <button
              key={hex}
              type='button'
              aria-label={`Set accent to ${hex}`}
              onClick={() => commitAccent(hex)}
              style={{ backgroundColor: hex }}
              className={
                'size-6 rounded-full border-2 transition-[box-shadow,border-color] ' +
                (localAccent.toLowerCase() === hex.toLowerCase()
                  ? 'border-foreground shadow-[0_0_0_2px_var(--background)]'
                  : 'border-transparent hover:scale-110')
              }
            />
          ))}
        </div>
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
            className='h-8 flex-1 rounded-lg border border-input bg-card-2 px-2.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
          />
        </div>
      </div>

      <Separator />

      <div className='flex flex-col gap-3'>
        <Label className='text-xs uppercase tracking-wide text-muted-foreground'>Date formats</Label>
        <DateFormatField
          label='Experience'
          value={experienceDateFormat}
          disabled={isPending}
          onChange={pickExperienceDateFormat}
        />
        <DateFormatField
          label='Education'
          value={educationDateFormat}
          disabled={isPending}
          onChange={pickEducationDateFormat}
        />
        <DateFormatField
          label='Certifications'
          value={certificationDateFormat}
          disabled={isPending}
          onChange={pickCertificationDateFormat}
        />
      </div>
    </div>
  );
}

function SingleColumnThumbnail() {
  return (
    <div className='flex h-16 w-full flex-col gap-1 overflow-hidden rounded border border-border bg-muted/30 p-1.5'>
      <div className='h-2 w-3/4 rounded-sm bg-muted-foreground/30' />
      <div className='h-1 w-1/2 rounded-sm bg-muted-foreground/20' />
      <div className='mt-0.5 h-px w-full bg-muted-foreground/20' />
      <div className='flex flex-col gap-0.5'>
        <div className='h-1 w-full rounded-sm bg-muted-foreground/20' />
        <div className='h-1 w-5/6 rounded-sm bg-muted-foreground/20' />
        <div className='h-1 w-4/6 rounded-sm bg-muted-foreground/20' />
      </div>
    </div>
  );
}

function TwoColumnThumbnail() {
  return (
    <div className='flex h-16 w-full gap-1 overflow-hidden rounded border border-border bg-muted/30 p-1.5'>
      <div className='flex w-2/5 flex-col gap-0.5 border-r border-border pr-1'>
        <div className='h-1 w-full rounded-sm bg-muted-foreground/30' />
        <div className='h-1 w-4/5 rounded-sm bg-muted-foreground/20' />
        <div className='mt-0.5 h-1 w-full rounded-sm bg-muted-foreground/20' />
        <div className='h-1 w-3/4 rounded-sm bg-muted-foreground/20' />
      </div>
      <div className='flex flex-1 flex-col gap-0.5'>
        <div className='h-1.5 w-3/4 rounded-sm bg-muted-foreground/30' />
        <div className='h-1 w-full rounded-sm bg-muted-foreground/20' />
        <div className='h-1 w-5/6 rounded-sm bg-muted-foreground/20' />
        <div className='h-1 w-4/6 rounded-sm bg-muted-foreground/20' />
      </div>
    </div>
  );
}

function DateFormatField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: CvDateFormat;
  disabled: boolean;
  onChange: (next: CvDateFormat) => void;
}) {
  const active = CV_DATE_FORMATS.find((opt) => opt.id === value);
  return (
    <div className='flex items-center gap-3'>
      <span className='w-28 shrink-0 text-xs text-muted-foreground'>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className='flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
        >
          <span className='flex-1 truncate text-left'>
            {active ? `${active.label} (${active.example})` : value}
          </span>
          <ChevronDownIcon className='size-3 shrink-0 text-muted-foreground' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='min-w-[200px]'>
          {CV_DATE_FORMATS.map((opt) => (
            <DropdownMenuItem key={opt.id} onClick={() => onChange(opt.id)}>
              <span className='flex-1'>
                {opt.label} ({opt.example})
              </span>
              {opt.id === value && <CheckIcon className='ml-2 size-3 shrink-0 opacity-60' />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
