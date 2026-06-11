'use server';

import { z } from 'zod';

import { loadMessages } from '@/features/chat/storage/chat-message-store';
import {
  createSession,
  deleteSession,
  getOrCreateDefaultSession,
  getSessionById,
  renameSession,
  setLastActiveSession,
} from '@/features/chat/storage/chat-session-store';
import { authActionClient } from '@/shared/lib/safe-action';

const createSessionSchema = z.object({
  title: z.string().trim().max(80).optional(),
});

const renameSessionSchema = z.object({
  sessionId: z.uuid(),
  title: z.string().trim().min(1).max(80),
});

const deleteSessionSchema = z.object({
  sessionId: z.uuid(),
});

const loadSessionMessagesSchema = z.object({
  sessionId: z.uuid(),
});

const setLastActiveSessionSchema = z.object({
  sessionId: z.uuid(),
});

export const createChatSession = authActionClient
  .inputSchema(createSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await createSession({ userId: ctx.user.id, title: parsedInput.title });
    return { ok: true as const, session };
  });

export const renameChatSession = authActionClient
  .inputSchema(renameSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await renameSession({
      userId: ctx.user.id,
      sessionId: parsedInput.sessionId,
      title: parsedInput.title,
    });
    return { ok: true as const, session };
  });

export const deleteChatSession = authActionClient
  .inputSchema(deleteSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    await deleteSession({ userId: ctx.user.id, sessionId: parsedInput.sessionId });
    const nextSession = await getOrCreateDefaultSession(ctx.user.id);
    return { ok: true as const, nextSessionId: nextSession.id, nextSession };
  });

export const loadChatSessionMessages = authActionClient
  .inputSchema(loadSessionMessagesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await getSessionById(ctx.user.id, parsedInput.sessionId);
    if (!session) {
      throw new Error('Chat session not found.');
    }

    const messages = await loadMessages(parsedInput.sessionId);
    return { ok: true as const, messages };
  });

export const setActiveChatSession = authActionClient
  .inputSchema(setLastActiveSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const session = await getSessionById(ctx.user.id, parsedInput.sessionId);
    if (!session) {
      throw new Error('Chat session not found.');
    }

    await setLastActiveSession(ctx.user.id, session.id);
    return { ok: true as const };
  });
