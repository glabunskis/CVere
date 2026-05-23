'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import {
  MessageSquareIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  createChatSession,
  deleteChatSession,
  renameChatSession,
  setLastActiveChatSession,
} from '@/features/chat/actions/session-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { ChatSessionListItem } from '../types';

type Props = {
  sessions: ChatSessionListItem[];
  activeSessionId: string;
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function SessionRail({ sessions, activeSessionId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ChatSessionListItem | null>(null);
  const router = useRouter();

  const { execute: create, isExecuting: creating } = useAction(createChatSession, {
    onSuccess: ({ data }) => {
      const session = data?.session;
      if (!session) return;
      router.push(`/dashboard?session=${encodeURIComponent(session.id)}`);
      router.refresh();
      toast.success('New chat created.');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to create chat.'),
  });

  const { execute: rename } = useAction(renameChatSession, {
    onSuccess: () => {
      router.refresh();
      toast.success('Chat renamed.');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to rename chat.'),
  });

  const { execute: remove, isExecuting: deleting } = useAction(deleteChatSession, {
    onSuccess: ({ data }) => {
      const nextSessionId = data?.nextSessionId;
      if (nextSessionId) {
        router.push(`/dashboard?session=${encodeURIComponent(nextSessionId)}`);
      }
      router.refresh();
      setPendingDelete(null);
      toast.success('Chat deleted.');
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to delete chat.'),
  });

  const { execute: setActiveSession } = useAction(setLastActiveChatSession, {
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to switch chat.'),
  });

  const orderedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const byLast = Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt);
        if (!Number.isNaN(byLast) && byLast !== 0) return byLast;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }),
    [sessions],
  );

  const openSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setActiveSession({ sessionId });
    router.push(`/dashboard?session=${encodeURIComponent(sessionId)}`);
  };

  return (
    <>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r bg-card/60 transition-[width]',
          collapsed ? 'w-12' : 'w-[220px]',
        )}
      >
        <div className='flex items-center justify-between gap-1 border-b p-2'>
          {!collapsed ? <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Chats</p> : null}
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              onClick={() => create({})}
              disabled={creating}
              title='New chat'
            >
              <PlusIcon />
              <span className='sr-only'>New chat</span>
            </Button>
            <Button
              type='button'
              size='icon-xs'
              variant='ghost'
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Expand chats' : 'Collapse chats'}
            >
              <PanelLeftIcon className={cn('transition-transform', collapsed && 'rotate-180')} />
              <span className='sr-only'>{collapsed ? 'Expand chat list' : 'Collapse chat list'}</span>
            </Button>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2'>
          {orderedSessions.map((session) =>
            collapsed ? (
              <Button
                key={session.id}
                type='button'
                size='icon-sm'
                variant={session.id === activeSessionId ? 'secondary' : 'ghost'}
                className='w-full'
                onClick={() => openSession(session.id)}
                title={session.title}
              >
                <span className='text-xs font-semibold'>{initials(session.title)}</span>
                <span className='sr-only'>{session.title}</span>
              </Button>
            ) : (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md border px-1 py-1',
                  session.id === activeSessionId ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-muted/60',
                )}
              >
                <button
                  type='button'
                  onClick={() => openSession(session.id)}
                  className='min-w-0 flex-1 rounded-sm px-1 py-1 text-left'
                >
                  <p className='truncate text-sm font-medium text-foreground'>{session.title}</p>
                  <p className='truncate text-[11px] text-muted-foreground'>
                    {formatRelativeTime(session.lastMessageAt)}
                  </p>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type='button'
                        size='icon-xs'
                        variant='ghost'
                        className='opacity-70 group-hover:opacity-100'
                      />
                    }
                    aria-label={`Session actions for ${session.title}`}
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-40'>
                    <DropdownMenuItem
                      onClick={() => {
                        const next = window.prompt('Rename chat', session.title)?.trim();
                        if (!next || next === session.title) return;
                        rename({ sessionId: session.id, title: next });
                      }}
                    >
                      <PencilIcon />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant='destructive'
                      onClick={() => setPendingDelete(session)}
                    >
                      <Trash2Icon />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          )}

          {orderedSessions.length === 0 ? (
            <div className='rounded-md border border-dashed p-3 text-xs text-muted-foreground'>
              <div className='mb-2 flex items-center gap-2'>
                <MessageSquareIcon className='size-3.5' />
                <span>No chats yet</span>
              </div>
              <p>Create a chat to start editing your CV.</p>
            </div>
          ) : null}
        </div>
      </aside>

      <Dialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The chat history for this session will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={deleting || pendingDelete == null}
              onClick={() => {
                if (!pendingDelete) return;
                remove({ sessionId: pendingDelete.id });
              }}
            >
              {deleting ? 'Deleting...' : 'Delete chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatRelativeTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return 'Updated recently';

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);
  if (absolute < 30) return 'just now';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (absolute >= secondsPerUnit) {
      const value = Math.round(diffSeconds / secondsPerUnit);
      return relativeTimeFormatter.format(value, unit);
    }
  }

  return relativeTimeFormatter.format(diffSeconds, 'second');
}

function initials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}
