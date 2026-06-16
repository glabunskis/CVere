'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { DefaultChatTransport } from 'ai';
import { ArrowDownIcon, MessageSquareIcon, PanelLeftIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  createChatSession,
  loadChatSessionMessages,
  setActiveChatSession,
} from '@/features/chat/actions/session-actions';
import { usePreviewStore } from '@/features/cv-preview/preview-store';
import {
  isPreviewTargetMatch,
} from '@/features/cv-preview/preview-target';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Chat, useChat } from '@ai-sdk/react';

import type { ChatSessionListItem, ChatUIMessage } from '../types';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { SessionRail } from './session-rail';
import { WorkingIndicator } from './working-indicator';

type Props = {
  initialActiveSessionId: string;
  initialCvId: string;
  sessions: ChatSessionListItem[];
  initialMessages: ChatUIMessage[];
  initialPrefill: string | null;
  onCollapse?: () => void;
};

/**
 * Pixel threshold (in px from the bottom) under which we consider the user
 * "stuck to the bottom" and continue auto-scrolling new content into view.
 * Beyond this, we assume they've scrolled up to re-read and stop yanking.
 */
const STICKY_BOTTOM_THRESHOLD_PX = 80;

export function ChatPanel({
  initialActiveSessionId,
  initialCvId,
  sessions,
  initialMessages,
  initialPrefill,
  onCollapse,
}: Props) {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState(initialActiveSessionId);
  const [sessionList, setSessionList] = useState(sessions);
  const [prefillText, setPrefillText] = useState<string | null>(initialPrefill);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const activeSessionIdRef = useRef(initialActiveSessionId);
  // Refs the Chat instance's closures read without forcing it to be recreated.
  // The Chat is keyed only on `activeSessionId`, so a `router.refresh()` or a
  // changed prop mid-stream cannot tear down an in-flight stream.
  const routerRef = useRef(router);
  const initialCvIdRef = useRef(initialCvId);
  const setMessagesRef = useRef<
    (messages: ChatUIMessage[] | ((messages: ChatUIMessage[]) => ChatUIMessage[])) => void
  >(() => undefined);
  const messagesCacheRef = useRef<Record<string, ChatUIMessage[]>>({
    [initialActiveSessionId]: initialMessages,
  });
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  useEffect(() => {
    initialCvIdRef.current = initialCvId;
  }, [initialCvId]);

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  // Adopt a server-provided active session only when it genuinely changes
  // (e.g. URL `?session=` navigation that re-rendered the server tree). A bare
  // `router.refresh()` re-runs the dashboard server component and passes a
  // fresh `initialMessages` array for the *same* session — we must not reset
  // then, or the in-flight assistant stream (not yet persisted) is discarded.
  useEffect(() => {
    if (initialActiveSessionId === activeSessionIdRef.current) return;
    if (!messagesCacheRef.current[initialActiveSessionId]) {
      messagesCacheRef.current[initialActiveSessionId] = initialMessages;
    }
    activeSessionIdRef.current = initialActiveSessionId;
    setActiveSessionId(initialActiveSessionId);
  }, [initialActiveSessionId, initialMessages]);

  useEffect(() => {
    setPrefillText(initialPrefill);
    if (!initialPrefill) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('prefill')) return;
    url.searchParams.delete('prefill');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [initialPrefill]);

  /* eslint-disable react-hooks/refs -- refs are read inside useMemo intentionally:
     messagesCacheRef seeds the initial message list for the new session; callbacks
     that read initialCvIdRef / routerRef do so at invocation time, not during render. */
  const chat = useMemo(
    () =>
      new Chat<ChatUIMessage>({
        id: activeSessionId,
        messages: messagesCacheRef.current[activeSessionId] ?? [],
        transport: new DefaultChatTransport({
          api: `/api/chat?sessionId=${encodeURIComponent(activeSessionId)}`,
          body: () => {
            const currentPreviewing = usePreviewStore.getState().previewTarget;
            const cvId = currentPreviewing?.cvId ?? initialCvIdRef.current;
            return {
              sessionId: activeSessionId,
              context: {
                cv: { id: cvId },
              },
            };
          },
          // The default reconnect URL is `${api}/${chatId}/stream`. We keep
          // reconnects on the same URL and let the route read `sessionId` from
          // the query string.
          prepareReconnectToStreamRequest: ({ api }) => ({ api }),
        }),
        // onData / onError live on `ChatInit`, not on the `useChat({ chat })`
        // overload — passing them to the hook is silently ignored once an
        // external Chat instance is provided.
        onData: (dataPart) => {
          if (dataPart.type === 'data-session-title') {
            setSessionList((current) =>
              current.map((session) =>
                session.id === dataPart.data.sessionId
                  ? { ...session, title: dataPart.data.title }
                  : session,
              ),
            );
            return;
          }
          if (dataPart.type === 'data-cv-created') {
            // The agent created a new CV (e.g. a tailoring copy) and made it
            // selected server-side. Point the previewer at it so the
            // end-of-turn render is visible, and refresh server-rendered CV
            // lists so the new row appears in the Library. The Chat instance is
            // keyed only on the session id, so this refresh cannot tear down
            // the in-flight stream.
            usePreviewStore.getState().setPreviewTarget({ cvId: dataPart.data.cvId });
            routerRef.current.refresh();
            return;
          }
          if (dataPart.type === 'data-preview-dirty') {
            const current = usePreviewStore.getState().previewTarget ?? {
              cvId: initialCvIdRef.current,
            };
            const shouldRefresh = isPreviewTargetMatch({
              current,
              incoming: dataPart.data,
            });
            if (!shouldRefresh) return;
            // The turn already re-rendered the PDF server-side; re-sign the URL
            // so the iframe reloads the fresh render.
            void usePreviewStore.getState().markPreviewDirty();
            // Also re-run the dashboard server component so the CV editor (and
            // Library titles) reflect the chat-driven edit. This event fires in
            // the route's end-of-turn `onFinish`, so the assistant message is
            // already generated; and the Chat is keyed only on the session id
            // while reading everything else from refs, so the refresh cannot
            // tear down the in-flight stream or reset the streamed message.
            routerRef.current.refresh();
            return;
          }
          if (dataPart.type === 'data-preview-error') {
            toast.error(`Rendering failed: ${dataPart.data.message}`);
            return;
          }
        },
        onError: (err) => {
          toast.error(err?.message ?? 'Chat request failed');
        },
      }),
    // Only re-create the Chat when the active session changes. Everything else
    // the closures need is read live from refs / the preview store, so an
    // incidental re-render (router.refresh, prop change) never interrupts a
    // streaming turn.
    [activeSessionId],
  );
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, stop, error, setMessages } = useChat<ChatUIMessage>({
    chat,
    // Re-attach to an in-flight stream after a reload. The route's GET handler
    // returns 204 when there is no active stream or Upstash Redis is not
    // configured, so this is safe to leave on unconditionally.
    resume: true,
  });

  useEffect(() => {
    setMessagesRef.current = setMessages;
  }, [setMessages]);

  useEffect(() => {
    messagesCacheRef.current[activeSessionId] = messages;
  }, [activeSessionId, messages]);

  const { execute: createSession, isExecuting: creatingSession } = useAction(createChatSession, {
    onSuccess: ({ data }) => {
      const session = data?.session;
      if (!session) return;
      handleCreated(session);
      toast.success('New chat created.');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to create chat.'),
  });

  const { executeAsync: fetchMessages } = useAction(loadChatSessionMessages, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to load chat messages.');
    },
  });
  const { execute: persistActiveSession } = useAction(setActiveChatSession, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to save active chat session.');
    },
  });

  const switchSession = async (nextSessionId: string) => {
    if (nextSessionId === activeSessionIdRef.current) return;

    activeSessionIdRef.current = nextSessionId;
    setActiveSessionId(nextSessionId);
    window.history.replaceState(null, '', `/dashboard?session=${encodeURIComponent(nextSessionId)}`);
    persistActiveSession({ sessionId: nextSessionId });

    if (messagesCacheRef.current[nextSessionId]) {
      return;
    }

    const result = await fetchMessages({ sessionId: nextSessionId });
    const fetched = (result?.data?.messages ?? []) as ChatUIMessage[];
    messagesCacheRef.current[nextSessionId] = fetched;

    if (activeSessionIdRef.current === nextSessionId) {
      setMessagesRef.current(fetched);
    }
  };

  const upsertSession = (
    existingSessions: ChatSessionListItem[],
    session: ChatSessionListItem,
  ): ChatSessionListItem[] => [session, ...existingSessions.filter((item) => item.id !== session.id)];

  const handleCreated = (session: ChatSessionListItem) => {
    setSessionList((current) => upsertSession(current, session));
    void switchSession(session.id);
  };

  const handleRenamed = (session: ChatSessionListItem) => {
    setSessionList((current) =>
      current.map((item) => (item.id === session.id ? session : item)),
    );
  };

  const handleDeleted = (deletedSessionId: string, nextSession: ChatSessionListItem) => {
    setSessionList((current) => {
      const filtered = current.filter((item) => item.id !== deletedSessionId);
      if (filtered.some((item) => item.id === nextSession.id)) {
        return filtered;
      }
      return upsertSession(filtered, nextSession);
    });
    void switchSession(nextSession.id);
  };

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
      const atBottom = distanceFromBottom <= STICKY_BOTTOM_THRESHOLD_PX;
      stickToBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    };

    updateStick();
    viewport.addEventListener('scroll', updateStick, { passive: true });

    // New streamed content grows the scroll height without firing a scroll
    // event. Observe size changes so the jump-to-latest button shows/hides
    // correctly even when the user is parked above the bottom.
    const resizeObserver = new ResizeObserver(updateStick);
    resizeObserver.observe(node);

    return () => {
      viewport.removeEventListener('scroll', updateStick);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const node = contentRef.current;
    if (!node) return;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, status]);

  const scrollToBottom = () => {
    const node = contentRef.current;
    if (!node) return;
    const viewport = node.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    stickToBottomRef.current = true;
    setIsAtBottom(true);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  };

  const isEmpty = messages.length === 0;
  const showRetry = status === 'error' && error != null;
  const isStreaming = status === 'streaming';
  const isWorking = status === 'submitted' || status === 'streaming';

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
      <SessionRail
        sessions={sessionList}
        activeSessionId={activeSessionId}
        onSwitch={(sessionId) => {
          void switchSession(sessionId);
        }}
        onRenamed={handleRenamed}
        onDeleted={handleDeleted}
      />

      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-card px-4'>
          <span className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'>
            {sessionList.find((s) => s.id === activeSessionId)?.title ?? 'Chat'}
          </span>
          <Button
            type='button'
            size='icon-xs'
            variant='ghost'
            onClick={() => createSession({})}
            disabled={creatingSession}
            aria-label='New chat'
          >
            <PlusIcon />
          </Button>
          {onCollapse && (
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              onClick={onCollapse}
              aria-label='Collapse chat panel'
            >
              <PanelLeftIcon />
            </Button>
          )}
        </div>
        <div className='relative min-h-0 flex-1'>
          <ScrollArea className='h-full'>
          <div ref={contentRef} className='flex min-h-full flex-col gap-3 px-3 pt-3 pb-8'>
            {isEmpty ? (
              <Empty className='m-auto border-0'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <MessageSquareIcon />
                  </EmptyMedia>
                  <EmptyTitle>Edit your CV in chat</EmptyTitle>
                  <EmptyDescription>
                    Ask the assistant to read your CV, rewrite a summary, tweak a
                    bullet, or change the template. Edits land in the selected CV and
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
            {isWorking ? <WorkingIndicator /> : null}
            {showRetry ? (
              <p className='px-1 text-xs text-destructive'>
                {error?.message ?? 'Something went wrong.'}
              </p>
            ) : null}
          </div>
          </ScrollArea>

          {!isEmpty && !isAtBottom ? (
            <Button
              type='button'
              size='icon-sm'
              variant='secondary'
              onClick={scrollToBottom}
              aria-label='Scroll to latest messages'
              className='absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border shadow-md'
            >
              <ArrowDownIcon />
            </Button>
          ) : null}
        </div>

        <ChatInput
          key={prefillText ?? 'chat-input'}
          status={status}
          onSend={(text) => {
            void sendMessage({ text });
          }}
          onStop={() => stop()}
          prefillText={prefillText}
        />
      </div>
    </div>
  );
}
