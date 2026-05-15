'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ChatUIMessage } from '../types';

type Props = {
  message: ChatUIMessage;
};

const TOOL_LABELS: Record<string, string> = {
  readProfile: 'Read profile',
  rewriteSummary: 'Rewrite summary',
  editExperienceBullet: 'Edit experience bullet',
  addExperienceBullet: 'Add experience bullet',
  removeExperienceBullet: 'Remove experience bullet',
  editProjectBullet: 'Edit project bullet',
  addProjectBullet: 'Add project bullet',
  removeProjectBullet: 'Remove project bullet',
  setTemplate: 'Set template',
  setAccentHex: 'Set accent color',
  setEducationDateFormat: 'Set education date format',
  setCertificationDateFormat: 'Set certification date format',
};

function humanizeToolName(toolName: string): string {
  if (TOOL_LABELS[toolName]) return TOOL_LABELS[toolName];
  // Fallback: split camelCase into words.
  return toolName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

type ToolPart = {
  type: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' | 'approval-requested';
  errorText?: string;
};

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function getToolName(part: ToolPart & { toolName?: string }): string {
  if (part.type === 'dynamic-tool' && part.toolName) return part.toolName;
  return part.type.slice('tool-'.length);
}

function ToolStatusBadge({ state, errorText }: { state: ToolPart['state']; errorText?: string }) {
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

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        isUser ? 'items-end' : 'items-start',
      )}
    >
      <span className='px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
        {isUser ? 'You' : isAssistant ? 'Assistant' : message.role}
      </span>
      <div
        className={cn(
          'flex max-w-[90%] flex-col gap-2 rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <p key={index} className='whitespace-pre-wrap break-words leading-relaxed'>
                {part.text}
              </p>
            );
          }

          if (part.type === 'reasoning') {
            return (
              <p
                key={index}
                className='whitespace-pre-wrap break-words text-xs italic text-muted-foreground'
              >
                {part.text}
              </p>
            );
          }

          if (part.type === 'step-start') {
            return null;
          }

          if (part.type === 'data-preview-dirty') {
            // Side-channel: the route signals an end-of-turn render via this
            // part. The chat panel routes it to `usePreviewStore` via
            // `onData` — we never render it inline.
            return null;
          }

          if (isToolPart(part)) {
            const toolPart = part as ToolPart & { toolName?: string };
            const toolName = getToolName(toolPart);
            return (
              <div
                key={toolPart.toolCallId ?? index}
                className='flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1'
              >
                <span className='text-xs font-medium text-foreground'>
                  {humanizeToolName(toolName)}
                </span>
                <ToolStatusBadge state={toolPart.state} errorText={toolPart.errorText} />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
