'use client';

import { useEffect, useRef } from 'react';
import { DefaultChatTransport } from 'ai';
import { MessageSquareIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePreviewStore } from '@/features/previewer/stores/preview-store';
import { useChat } from '@ai-sdk/react';

import type { ChatSessionListItem, ChatUIMessage } from '../types';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { SessionRail } from './session-rail';

type Props = {
  sessionId: string;
  sessions: ChatSessionListItem[];
  initialMessages: ChatUIMessage[];
};

/**
 * Pixel threshold (in px from the bottom) under which we consider the user
 * "stuck to the bottom" and continue auto-scrolling new content into view.
 * Beyond this, we assume they've scrolled up to re-read and stop yanking.
 */
const STICKY_BOTTOM_THRESHOLD_PX = 80;

export function ChatPanel({ sessionId, sessions, initialMessages }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({
    id: sessionId,
    messages: initialMessages,
    // Re-attach to an in-flight stream after a reload. The route's GET handler
    // returns 204 when there is no active stream or Upstash Redis is not
    // configured, so this is safe to leave on unconditionally.
    resume: true,
    transport: new DefaultChatTransport({
      api: `/api/chat?sessionId=${encodeURIComponent(sessionId)}`,
      body: { sessionId },
      // The default reconnect URL is `${api}/${chatId}/stream`. We keep
      // reconnects on the same URL and let the route read `sessionId` from
      // the query string.
      prepareReconnectToStreamRequest: ({ api }) => ({ api }),
    }),
    onData: (dataPart) => {
      if (dataPart.type === 'data-preview-dirty') {
        void usePreviewStore.getState().markPreviewDirty();
      }
    },
    onError: (err) => {
      toast.error(err?.message ?? 'Chat request failed');
    },
  });

  // Watch the scrollable viewport (the base-ui ScrollArea wraps children in
  // a Viewport element with `data-slot="scroll-area-viewport"`) and only
  // auto-scroll when the user is parked near the bottom. This stops streaming
  // updates from yanking the view back when they've scrolled up to re-read.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return undefined;

    const updateStick = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      stickToBottomRef.current = distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
    };

    updateStick();
    viewport.addEventListener('scroll', updateStick, { passive: true });
    return () => viewport.removeEventListener('scroll', updateStick);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const node = contentRef.current;
    if (!node) return;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, status]);

  const isEmpty = messages.length === 0;
  const showRetry = status === 'error' && error != null;
  const isStreaming = status === 'streaming';

  // Index of the last assistant message — used to scope the streaming caret.
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div className='flex h-full min-h-0'>
      <SessionRail sessions={sessions} activeSessionId={sessionId} />

      <div className='flex min-w-0 flex-1 flex-col'>
        <ScrollArea className='min-h-0 flex-1'>
          <div ref={contentRef} className='flex h-full flex-col gap-3 p-3'>
            {isEmpty ? (
              <Empty className='m-auto border-0'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <MessageSquareIcon />
                  </EmptyMedia>
                  <EmptyTitle>Edit your CV in chat</EmptyTitle>
                  <EmptyDescription>
                    Ask the assistant to read your profile, rewrite a summary, tweak a
                    bullet, or change the template. Edits land in your master CV and
                    the preview refreshes automatically.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreamingLastAssistant={isStreaming && index === lastAssistantIndex}
                />
              ))
            )}
            {showRetry ? (
              <p className='px-1 text-xs text-destructive'>
                {error?.message ?? 'Something went wrong.'}
              </p>
            ) : null}
          </div>
        </ScrollArea>

        <ChatInput
          status={status}
          onSend={(text) => {
            void sendMessage({ text });
          }}
          onStop={() => stop()}
        />
      </div>
    </div>
  );
}
