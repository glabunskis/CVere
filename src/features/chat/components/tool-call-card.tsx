'use client';

import { useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  LoaderIcon,
  TriangleAlertIcon,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import { TOOL_REGISTRY } from '../tools/tool-registry';

const REGISTRY_LABELS: Record<string, string> = Object.fromEntries(
  TOOL_REGISTRY.map((t) => [t.name, t.label]),
);

/** Gated behind NEXT_PUBLIC_TOOL_DEBUG. When off, cards are not expandable and
 * raw tool I/O (arguments + result) is never shown to the user. */
const TOOL_DEBUG = process.env.NEXT_PUBLIC_TOOL_DEBUG === 'true';

/** Present-continuous / past-tense forms for the imperative verbs used in the
 * tool registry labels, so the card reads as an activity ("Editing summary")
 * rather than a tool name. */
const PRESENT_TENSE: Record<string, string> = {
  list: 'Listing',
  create: 'Creating',
  read: 'Reading',
  rewrite: 'Rewriting',
  edit: 'Editing',
  add: 'Adding',
  remove: 'Removing',
  move: 'Moving',
  set: 'Setting',
  reset: 'Resetting',
  integrate: 'Integrating',
  dismiss: 'Dismissing',
};

const PAST_TENSE: Record<string, string> = {
  list: 'Listed',
  create: 'Created',
  read: 'Read',
  rewrite: 'Rewrote',
  edit: 'Edited',
  add: 'Added',
  remove: 'Removed',
  move: 'Moved',
  set: 'Set',
  reset: 'Reset',
  integrate: 'Integrated',
  dismiss: 'Dismissed',
};

function humanizeToolName(toolName: string): string {
  if (REGISTRY_LABELS[toolName]) return REGISTRY_LABELS[toolName];
  return toolName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Turns an imperative registry label ("Edit experience bullet") into an
 * activity phrase that reflects the current state: present continuous while
 * running ("Editing experience bullet"), past tense once done ("Edited
 * experience bullet"), and an infinitive for the error / approval framing.
 */
function actionPhrase(toolName: string, state: ToolPartState): string {
  const label = humanizeToolName(toolName);
  const [verb, ...rest] = label.split(' ');
  const verbKey = verb.toLowerCase();
  const object = rest.join(' ');
  const withObject = (head: string) => (object ? `${head} ${object}` : head);

  switch (state) {
    case 'input-streaming':
    case 'input-available':
      return withObject(PRESENT_TENSE[verbKey] ?? `${capitalize(verbKey)}ing`);
    case 'output-available':
      return withObject(PAST_TENSE[verbKey] ?? `${capitalize(verbKey)}ed`);
    case 'output-error':
      return withObject(`Couldn't ${verbKey}`);
    case 'approval-requested':
      return withObject(`Approve to ${verbKey}`);
    default:
      return label;
  }
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

function StatusIcon({ state }: { state: ToolPartState }) {
  switch (state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <LoaderIcon
          className='size-3 shrink-0 animate-spin text-muted-foreground'
          aria-hidden='true'
        />
      );
    case 'output-available':
      return (
        <CheckIcon
          className='size-3 shrink-0 text-emerald-600 dark:text-emerald-400'
          aria-hidden='true'
        />
      );
    case 'output-error':
      return (
        <TriangleAlertIcon className='size-3 shrink-0 text-destructive' aria-hidden='true' />
      );
    case 'approval-requested':
      return (
        <ClockIcon
          className='size-3 shrink-0 text-amber-600 dark:text-amber-400'
          aria-hidden='true'
        />
      );
    default:
      return null;
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
  const phrase = actionPhrase(toolName, state);
  const isWorking = state === 'input-streaming' || state === 'input-available';

  // Without debug enabled the card is a static, non-interactive activity line:
  // no chevron, no click target, and the raw I/O panel is never rendered.
  if (!TOOL_DEBUG) {
    return (
      <div className='flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5 text-xs'>
        <StatusIcon state={state} />
        <span
          className={cn('font-medium text-foreground', isWorking && 'text-muted-foreground')}
        >
          {phrase}
        </span>
        {summary ? (
          <span className='min-w-0 flex-1 truncate text-muted-foreground'>{summary}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className='rounded-md border bg-background/60 text-xs'>
      <button
        type='button'
        onClick={() => setUserOpen(!open)}
        className='flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        aria-expanded={open}
      >
        <StatusIcon state={state} />
        <span
          className={cn(
            'font-medium text-foreground',
            isWorking && 'text-muted-foreground',
          )}
        >
          {phrase}
        </span>
        {summary ? (
          <span className='min-w-0 flex-1 truncate text-muted-foreground'>{summary}</span>
        ) : (
          <span className='flex-1' />
        )}
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
