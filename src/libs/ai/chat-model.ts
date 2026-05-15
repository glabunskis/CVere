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
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || undefined;
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  return { apiKey, model, baseURL };
}

let cachedModel: LanguageModel | null = null;

export function getChatModel(): LanguageModel {
  if (cachedModel) return cachedModel;

  const { apiKey, model, baseURL } = readOpenAiEnv();
  const missing: string[] = [];
  if (!apiKey) missing.push('OPENAI_API_KEY');
  if (!model) missing.push('OPENAI_CHAT_MODEL');

  if (missing.length === 0 && apiKey && model) {
    const openai = createOpenAI({ apiKey, baseURL });
    cachedModel = openai.chat(model);
    return cachedModel;
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
  cachedModel = new MockLanguageModelV3({
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
  return cachedModel;
}

export function resetChatModelCache(): void {
  cachedModel = null;
}
