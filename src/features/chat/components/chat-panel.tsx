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

import type { ChatUIMessage } from '../types';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';

type Props = {
  initialMessages: ChatUIMessage[];
};

export function ChatPanel({ initialMessages }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({
    id: 'chat:singleton',
    messages: initialMessages,
    // Re-attach to an in-flight stream after a reload. The route's GET handler
    // returns 204 when there is no active stream or Upstash Redis is not
    // configured, so this is safe to leave on unconditionally.
    resume: true,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // The default reconnect URL is `${api}/${chatId}/stream`. Our singleton
      // GET handler lives at `/api/chat` and derives the stream id from the
      // session, so we point reconnects there and drop the chat id from the
      // path.
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

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  const isEmpty = messages.length === 0;
  const showRetry = status === 'error' && error != null;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <ScrollArea className='flex-1 min-h-0'>
        <div ref={scrollRef} className='flex h-full flex-col gap-3 p-3'>
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
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
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
  );
}
