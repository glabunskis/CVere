import type { UIMessage } from 'ai';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import type { Json } from '@/libs/supabase/types';

import 'server-only';

/**
 * Chat history persistence scoped to one chat session (AI SDK v6).
 *
 * One row per UIMessage. The `parts` column holds the v6 `UIMessage.parts`
 * array verbatim so reload restores tool-call states. RLS scopes every
 * read/write to the calling user.
 */

type ChatMessageRow = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Json;
};

const SELECT_COLUMNS = 'id, role, parts';

function toUIMessage(row: ChatMessageRow): UIMessage {
  return {
    id: row.id,
    role: row.role,
    parts: (row.parts ?? []) as UIMessage['parts'],
  };
}

async function resolveSessionOwnerId(sessionId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_session')
    .select('user_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw new Error(`Failed to resolve chat session owner: ${error.message}`);
  if (!data) throw new Error(`Chat session ${sessionId} not found.`);
  return data.user_id;
}

export async function loadMessages(sessionId: string): Promise<UIMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_message')
    .select(SELECT_COLUMNS)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load chat messages: ${error.message}`);
  return (data ?? []).map((row) => toUIMessage(row as ChatMessageRow));
}

export async function appendMessages(
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const userId = await resolveSessionOwnerId(sessionId);
  const supabase = await createSupabaseServerClient();
  const rows = messages.map((message) => ({
    id: message.id,
    user_id: userId,
    session_id: sessionId,
    role: message.role,
    parts: message.parts as unknown as Json,
  }));
  const { error } = await supabase.from('chat_message').insert(rows);
  if (error) throw new Error(`Failed to persist chat messages: ${error.message}`);
}

export async function clearMessages(sessionId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('chat_message').delete().eq('session_id', sessionId);
  if (error) throw new Error(`Failed to clear chat messages: ${error.message}`);
}
