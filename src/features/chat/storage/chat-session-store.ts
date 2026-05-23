import { generateText } from 'ai';

import { getTitleModel } from '@/libs/ai/chat-model';
import { logger } from '@/libs/logger';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Tables } from '@/libs/supabase/types';

import type { ChatSessionListItem } from '../types';

import 'server-only';

const DEFAULT_SESSION_TITLE = 'New chat';
const TITLE_SYSTEM_PROMPT =
  'Write a short, neutral title for this conversation in five words or fewer. ' +
  'No quotes, no punctuation, no emojis.';

type ChatSessionRow = Tables<'chat_session'>;

function toListItem(row: ChatSessionRow): ChatSessionListItem {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}

function normaliseTitle(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return DEFAULT_SESSION_TITLE;
  return trimmed.slice(0, 80);
}

function fallbackTitleFromMessage(firstUserMessage: string): string {
  const collapsed = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (collapsed.length === 0) return DEFAULT_SESSION_TITLE;
  return collapsed.slice(0, 40).trim();
}

function cleanGeneratedTitle(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed.length === 0) return '';

  // Drop surrounding quotes and trailing punctuation if the model adds them.
  const withoutQuotes = collapsed.replace(/^['"`]+|['"`]+$/g, '');
  const withoutTrailingPunctuation = withoutQuotes.replace(/[.!?,;:]+$/g, '');

  return withoutTrailingPunctuation.slice(0, 80).trim();
}

async function getSessionByIdInternal(
  userId: string,
  sessionId: string,
): Promise<ChatSessionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load chat session: ${error.message}`);
  return data;
}

async function getMostRecentSession(userId: string): Promise<ChatSessionRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to list chat sessions: ${error.message}`);
  return data;
}

export async function listSessions(userId: string): Promise<ChatSessionListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to list chat sessions: ${error.message}`);
  return (data ?? []).map(toListItem);
}

export async function getSessionById(
  userId: string,
  sessionId: string,
): Promise<ChatSessionListItem | null> {
  const row = await getSessionByIdInternal(userId, sessionId);
  return row ? toListItem(row) : null;
}

export async function setLastActiveSession(
  userId: string,
  sessionId: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('cv_preferences')
    .upsert({ user_id: userId, last_active_session_id: sessionId }, { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to persist active chat session: ${error.message}`);
}

export async function createSession({
  userId,
  title,
}: {
  userId: string;
  title?: string;
}): Promise<ChatSessionListItem> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .insert({
      user_id: userId,
      title: normaliseTitle(title),
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create chat session.');

  await setLastActiveSession(userId, data.id);
  return toListItem(data);
}

export async function renameSession({
  userId,
  sessionId,
  title,
}: {
  userId: string;
  sessionId: string;
  title: string;
}): Promise<ChatSessionListItem> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .update({ title: normaliseTitle(title) })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to rename chat session.');
  return toListItem(data);
}

export async function deleteSession({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('chat_session')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to delete chat session: ${error.message}`);
}

/**
 * Resolve an active session for dashboard load:
 * 1) `cv_preferences.last_active_session_id` if it points to a live owned row
 * 2) most recent existing session
 * 3) create a new one
 */
export async function getOrCreateDefaultSession(userId: string): Promise<ChatSessionListItem> {
  const supabase = await createSupabaseServerClient();
  const { data: prefs, error: prefsError } = await supabase
    .from('cv_preferences')
    .select('last_active_session_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefsError) throw new Error(`Failed to load cv_preferences: ${prefsError.message}`);

  const preferredSessionId = prefs?.last_active_session_id;
  if (preferredSessionId) {
    const preferred = await getSessionByIdInternal(userId, preferredSessionId);
    if (preferred) return toListItem(preferred);
  }

  const mostRecent = await getMostRecentSession(userId);
  if (mostRecent) {
    await setLastActiveSession(userId, mostRecent.id);
    return toListItem(mostRecent);
  }

  const created = await createSession({ userId });
  return created;
}

/**
 * Fire-and-forget title generation for a brand-new session.
 * Safeguards:
 * - runs only while title is still "New chat"
 * - runs only when there is exactly one persisted user message in the session
 * - never throws to callers
 */
export async function generateAndSaveSessionTitle({
  userId,
  sessionId,
  firstUserMessage,
}: {
  userId: string;
  sessionId: string;
  firstUserMessage: string;
}): Promise<void> {
  try {
    const base = firstUserMessage.trim();
    if (!base) return;

    const supabase = await createSupabaseServerClient();

    const { data: session, error: sessionError } = await supabase
      .from('chat_session')
      .select('id, title')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (sessionError || !session) return;
    if (session.title !== DEFAULT_SESSION_TITLE) return;

    const { count, error: countError } = await supabase
      .from('chat_message')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('role', 'user');
    if (countError) return;
    if (count !== 1) return;

    const fallback = fallbackTitleFromMessage(base);
    let title = fallback;

    try {
      const result = await generateText({
        model: getTitleModel(),
        system: TITLE_SYSTEM_PROMPT,
        prompt: base,
        maxOutputTokens: 16,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(3000),
      });
      const cleaned = cleanGeneratedTitle(result.text);
      if (cleaned) title = cleaned;
    } catch (err) {
      logger.warn(
        { err, userId, sessionId },
        'chat-session title generation failed, falling back to heuristic title',
      );
    }

    const { error: updateError } = await supabase
      .from('chat_session')
      .update({ title })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('title', DEFAULT_SESSION_TITLE);
    if (updateError) {
      logger.warn(
        { err: updateError, userId, sessionId },
        'chat-session title update failed',
      );
    }
  } catch (err) {
    logger.warn({ err, userId, sessionId }, 'chat-session title generation crashed');
  }
}
