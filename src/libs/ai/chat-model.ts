import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

import { createOpenAI } from '@ai-sdk/openai';

export class ChatModelNotConfiguredError extends Error {
  readonly httpStatus = 500;

  constructor(missing: string[]) {
    super(
      `OpenAI is not configured. Missing env vars: ${missing.join(', ')}. ` +
        `Set OPENAI_API_KEY and OPENAI_CHAT_MODEL (and optionally OPENAI_BASE_URL).`,
    );
    this.name = 'ChatModelNotConfiguredError';
  }
}

function readOpenAiEnv() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const chatModel = process.env.OPENAI_CHAT_MODEL?.trim() || undefined;
  const titleModel = process.env.OPENAI_TITLE_MODEL?.trim() || 'gpt-4o-mini';
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  return { apiKey, chatModel, titleModel, baseURL };
}

let cachedChatModel: LanguageModel | null = null;
let cachedTitleModel: LanguageModel | null = null;

export function getChatModel(): LanguageModel {
  if (cachedChatModel) return cachedChatModel;

  const { apiKey, chatModel, baseURL } = readOpenAiEnv();
  const missing: string[] = [];
  if (!apiKey) missing.push('OPENAI_API_KEY');
  if (!chatModel) missing.push('OPENAI_CHAT_MODEL');

  if (missing.length === 0 && apiKey && chatModel) {
    const openai = createOpenAI({ apiKey, baseURL });
    cachedChatModel = openai.chat(chatModel);
    return cachedChatModel;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ChatModelNotConfiguredError(missing);
  }

  // Dev/test fallback: a stub language model that lets routes wire up without
  // real OpenAI credentials. The chat-model module is imported only from server
  // code, so this never reaches the client bundle.
  const placeholderUsage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0, text: 0, reasoning: 0 },
  } as const;
  cachedChatModel = new MockLanguageModelV3({
    provider: 'mock-openai',
    modelId: 'mock-chat',
    doGenerate: async () => ({
      content: [
        { type: 'text', text: '[mock] OPENAI_* env vars are not set; returning a placeholder.' },
      ],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: placeholderUsage,
      warnings: [],
    }),
  }) as unknown as LanguageModel;
  return cachedChatModel;
}

export function getTitleModel(): LanguageModel {
  if (cachedTitleModel) return cachedTitleModel;

  const { apiKey, titleModel, baseURL } = readOpenAiEnv();
  if (apiKey) {
    const openai = createOpenAI({ apiKey, baseURL });
    cachedTitleModel = openai.chat(titleModel);
    return cachedTitleModel;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ChatModelNotConfiguredError(['OPENAI_API_KEY']);
  }

  const placeholderUsage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0, text: 0, reasoning: 0 },
  } as const;
  cachedTitleModel = new MockLanguageModelV3({
    provider: 'mock-openai',
    modelId: 'mock-title',
    doGenerate: async () => ({
      content: [{ type: 'text', text: 'General' }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: placeholderUsage,
      warnings: [],
    }),
  }) as unknown as LanguageModel;
  return cachedTitleModel;
}

export function resetChatModelCache(): void {
  cachedChatModel = null;
  cachedTitleModel = null;
}
