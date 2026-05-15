import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

import { createAzure } from '@ai-sdk/azure';

export class ChatModelNotConfiguredError extends Error {
  readonly httpStatus = 500;

  constructor(missing: string[]) {
    super(
      `Azure OpenAI is not configured. Missing env vars: ${missing.join(', ')}. ` +
        `Set AZURE_RESOURCE_NAME, AZURE_API_KEY, and AZURE_CHAT_DEPLOYMENT (and optionally AZURE_API_VERSION).`,
    );
    this.name = 'ChatModelNotConfiguredError';
  }
}

function readAzureEnv() {
  const resourceName = process.env.AZURE_RESOURCE_NAME?.trim() || undefined;
  const apiKey = process.env.AZURE_API_KEY?.trim() || undefined;
  const deployment = process.env.AZURE_CHAT_DEPLOYMENT?.trim() || undefined;
  const apiVersion = process.env.AZURE_API_VERSION?.trim() || undefined;
  return { resourceName, apiKey, deployment, apiVersion };
}

let cachedModel: LanguageModel | null = null;

export function getChatModel(): LanguageModel {
  if (cachedModel) return cachedModel;

  const { resourceName, apiKey, deployment, apiVersion } = readAzureEnv();
  const missing: string[] = [];
  if (!resourceName) missing.push('AZURE_RESOURCE_NAME');
  if (!apiKey) missing.push('AZURE_API_KEY');
  if (!deployment) missing.push('AZURE_CHAT_DEPLOYMENT');

  if (missing.length === 0 && resourceName && apiKey && deployment) {
    const azure = createAzure({ resourceName, apiKey, apiVersion });
    cachedModel = azure.chat(deployment);
    return cachedModel;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ChatModelNotConfiguredError(missing);
  }

  // Dev/test fallback: a stub language model that lets routes wire up without
  // real Azure credentials. The chat-model module is imported only from server
  // code, so this never reaches the client bundle.
  const placeholderUsage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0, text: 0, reasoning: 0 },
  } as const;
  cachedModel = new MockLanguageModelV3({
    provider: 'mock-azure',
    modelId: 'mock-chat',
    doGenerate: async () => ({
      content: [
        { type: 'text', text: '[mock] AZURE_* env vars are not set; returning a placeholder.' },
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
