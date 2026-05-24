'use client';

import { useState } from 'react';
import { ChevronDownIcon, WrenchIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TOOL_LABELS: Record<string, string> = {
  readProfile: 'Read profile',
  rewriteSummary: 'Rewrite summary',
  // Experience bullets
  editExperienceBullet: 'Edit experience bullet',
  addExperienceBullet: 'Add experience bullet',
  removeExperienceBullet: 'Remove experience bullet',
  moveExperienceBullet: 'Move experience bullet',
  // Project bullets
  editProjectBullet: 'Edit project bullet',
  addProjectBullet: 'Add project bullet',
  removeProjectBullet: 'Remove project bullet',
  moveProjectBullet: 'Move project bullet',
  // Experience entries
  addExperience: 'Add experience',
  editExperience: 'Edit experience',
  removeExperience: 'Remove experience',
  moveExperience: 'Move experience',
  // Project entries
  addProject: 'Add project',
  editProject: 'Edit project',
  removeProject: 'Remove project',
  moveProject: 'Move project',
  // Skills
  addSkill: 'Add skill',
  editSkill: 'Edit skill',
  removeSkill: 'Remove skill',
  moveSkill: 'Move skill',
  // Education
  addEducation: 'Add education',
  editEducation: 'Edit education',
  removeEducation: 'Remove education',
  moveEducation: 'Move education',
  // Certifications
  addCertification: 'Add certification',
  editCertification: 'Edit certification',
  removeCertification: 'Remove certification',
  moveCertification: 'Move certification',
  // Languages
  addLanguage: 'Add language',
  editLanguage: 'Edit language',
  removeLanguage: 'Remove language',
  moveLanguage: 'Move language',
  // Identity / contact
  setFullName: 'Set full name',
  setLocation: 'Set location',
  setPhone: 'Set phone',
  setContactEmail: 'Set contact email',
  setLinks: 'Set links',
  // Achievements
  listPendingAchievements: 'List pending achievements',
  integrateAchievement: 'Integrate achievement',
  dismissAchievement: 'Dismiss achievement',
  // Vacancies
  listVacancies: 'List vacancies',
  readVacancy: 'Read vacancy',
  // Tailored CVs
  listTailoredCvs: 'List tailored CVs',
  createTailoredCv: 'Create tailored CV',
  readTailoredCv: 'Read tailored CV',
  rewriteTailoredSummary: 'Rewrite tailored summary',
  editTailoredExperienceBullet: 'Edit tailored experience bullet',
  addTailoredExperienceBullet: 'Add tailored experience bullet',
  removeTailoredExperienceBullet: 'Remove tailored experience bullet',
  editTailoredProjectBullet: 'Edit tailored project bullet',
  addTailoredProjectBullet: 'Add tailored project bullet',
  removeTailoredProjectBullet: 'Remove tailored project bullet',
  setTailoredAccentHex: 'Set tailored accent',
  setTailoredTemplate: 'Set tailored template',
  renameTailoredCv: 'Rename tailored CV',
  deleteTailoredCv: 'Delete tailored CV',
  // Style
  setTemplate: 'Set template',
  setAccentHex: 'Set accent color',
  setEducationDateFormat: 'Set education date format',
  setCertificationDateFormat: 'Set certification date format',
};

function humanizeToolName(toolName: string): string {
  if (TOOL_LABELS[toolName]) return TOOL_LABELS[toolName];
  return toolName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export type ToolPartState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error'
  | 'approval-requested';

type Props = {
  toolName: string;
  state: ToolPartState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolStatusBadge({ state, errorText }: { state: ToolPartState; errorText?: string }) {
  switch (state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <Badge variant='outline' title='Working...'>
          Working
        </Badge>
      );
    case 'output-available':
      return <Badge variant='success'>Done</Badge>;
    case 'output-error':
      return (
        <Badge variant='destructive' title={errorText}>
          Error
        </Badge>
      );
    case 'approval-requested':
      return <Badge variant='warning'>Awaiting approval</Badge>;
    default:
      return <Badge variant='outline'>{state}</Badge>;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  const t = typeof value;
  return value === null || t === 'string' || t === 'number' || t === 'boolean' || t === 'undefined';
}

function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  return String(value);
}

/**
 * Renders an object as a tight key/value grid when it is a plain object with
 * ≤ 4 primitive-valued fields, and as a fenced JSON block otherwise. Returns
 * `null` when the payload is empty (no args, empty string, or `{}`), so the
 * caller can render its own empty-state copy.
 */
function renderStructuredPayload(value: unknown): React.ReactNode {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    if (value.length === 0) return null;
    return (
      <p className='whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground'>
        {value}
      </p>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return null;
    const allPrimitive = entries.every(([, v]) => isPrimitive(v));
    if (entries.length <= 4 && allPrimitive) {
      return (
        <dl className='grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs'>
          {entries.map(([k, v]) => (
            <div key={k} className='contents'>
              <dt className='font-medium text-muted-foreground'>{k}</dt>
              <dd className='break-words font-mono text-foreground'>
                {formatPrimitive(v)}
              </dd>
            </div>
          ))}
        </dl>
      );
    }
  }

  return (
    <pre className='max-h-72 overflow-auto rounded-md border bg-background/80 p-2 font-mono text-[11px] leading-relaxed text-foreground'>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/**
 * Best-effort one-liner shown next to the chevron when the card is
 * collapsed. Picks the output (if it's a short string), otherwise the first
 * primitive-valued input field.
 */
function summarize({
  state,
  input,
  output,
  errorText,
}: {
  state: ToolPartState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}): string | null {
  if (state === 'output-error') {
    return errorText ?? null;
  }
  if (state === 'output-available') {
    if (typeof output === 'string' && output.length > 0) {
      const firstSentence = output.split(/(?<=[.!?])\s/)[0];
      return firstSentence.length <= 120
        ? firstSentence
        : `${firstSentence.slice(0, 117)}...`;
    }
  }
  if (isPlainObject(input)) {
    for (const [, v] of Object.entries(input)) {
      if (isPrimitive(v) && v != null && v !== '') {
        const s = formatPrimitive(v);
        return s.length <= 80 ? s : `${s.slice(0, 77)}...`;
      }
    }
  }
  return null;
}

function shouldAutoOpen(state: ToolPartState): boolean {
  return state === 'input-streaming' || state === 'input-available' || state === 'output-error';
}

export function ToolCallCard({ toolName, state, input, output, errorText }: Props) {
  // `null` means "follow auto rule"; once the user clicks, we lock it.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? shouldAutoOpen(state);

  const summary = summarize({ state, input, output, errorText });
  const label = humanizeToolName(toolName);

  return (
    <div className='rounded-md border bg-background/60 text-xs'>
      <button
        type='button'
        onClick={() => setUserOpen(!open)}
        className='flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        aria-expanded={open}
      >
        <WrenchIcon className='size-3 shrink-0 text-muted-foreground' />
        <span className='font-medium text-foreground'>{label}</span>
        {summary ? (
          <span className='min-w-0 flex-1 truncate text-muted-foreground'>{summary}</span>
        ) : (
          <span className='flex-1' />
        )}
        <ToolStatusBadge state={state} errorText={errorText} />
        <ChevronDownIcon
          className={cn(
            'size-3 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden='true'
        />
      </button>

      {open ? (
        <div className='space-y-2 border-t px-2 py-2'>
          <ToolSection label='Arguments'>
            {state === 'input-streaming' ? (
              <div className='flex items-center gap-2 text-muted-foreground'>
                <span className='size-1.5 animate-pulse rounded-full bg-muted-foreground' />
                <span>Streaming...</span>
              </div>
            ) : (
              renderStructuredPayload(input) ?? (
                <p className='text-muted-foreground'>No arguments.</p>
              )
            )}
          </ToolSection>

          {state === 'output-error' ? (
            <ToolSection label='Error'>
              <p className='whitespace-pre-wrap break-words text-destructive'>
                {errorText ?? 'Tool failed without an error message.'}
              </p>
            </ToolSection>
          ) : state === 'output-available' ? (
            <ToolSection label='Result'>
              {renderStructuredPayload(output) ?? (
                <p className='text-muted-foreground'>No output.</p>
              )}
            </ToolSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ToolSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      {children}
    </div>
  );
}
