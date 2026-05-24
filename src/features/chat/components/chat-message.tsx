'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ChatUIMessage } from '../types';

import { StreamingText } from './streaming-text';
import { ToolCallCard, type ToolPartState } from './tool-call-card';

type Props = {
  message: ChatUIMessage;
  /**
   * True only for the last assistant message while a stream is in flight.
   * Used to render a blinking caret at the end of the trailing text part.
   */
  isStreamingLastAssistant?: boolean;
};

type ToolPart = {
  type: string;
  toolCallId: string;
  state: ToolPartState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolName?: string;
};

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function getToolName(part: ToolPart): string {
  if (part.type === 'dynamic-tool' && part.toolName) return part.toolName;
  return part.type.slice('tool-'.length);
}

function ReasoningDisclosure({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className='rounded-md border border-dashed bg-background/40 text-xs'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center gap-2 px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        aria-expanded={open}
      >
        <span className='font-medium uppercase tracking-wide text-[10px]'>
          Reasoning
        </span>
        <span className='flex-1' />
        <ChevronDownIcon
          className={cn('size-3 transition-transform', open && 'rotate-180')}
          aria-hidden='true'
        />
      </button>
      {open ? (
        <p className='whitespace-pre-wrap break-words border-t px-2 py-2 italic text-muted-foreground'>
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function ChatMessage({ message, isStreamingLastAssistant = false }: Props) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Find the last text part's index so the caret only trails the very end
  // of the streaming response (and not earlier text parts that got broken
  // up by tool calls).
  let lastTextPartIndex = -1;
  if (isStreamingLastAssistant) {
    for (let i = message.parts.length - 1; i >= 0; i -= 1) {
      if (message.parts[i]?.type === 'text') {
        lastTextPartIndex = i;
        break;
      }
    }
  }

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
              <StreamingText
                key={index}
                text={part.text}
                showCaret={index === lastTextPartIndex}
              />
            );
          }

          if (part.type === 'reasoning') {
            return <ReasoningDisclosure key={index} text={part.text} />;
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

          if (part.type === 'data-preview-switch') {
            // Side-channel: preview target switch (e.g. createTailoredCv).
            // Applied in the chat panel `onData` handler, not rendered inline.
            return null;
          }

          if (isToolPart(part)) {
            const toolPart = part as ToolPart;
            const toolName = getToolName(toolPart);
            return (
              <ToolCallCard
                key={toolPart.toolCallId ?? index}
                toolName={toolName}
                state={toolPart.state}
                input={toolPart.input}
                output={toolPart.output}
                errorText={toolPart.errorText}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
