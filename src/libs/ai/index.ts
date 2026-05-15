import { OpenAiProvider } from './openai';
import type { AiProvider } from './provider';
import { StubAiProvider } from './stub';

export type AiProviderKind = 'stub' | 'openai';

export function getAiProviderKind(): AiProviderKind {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (value === 'openai') return 'openai';
  return 'stub';
}

let cachedProvider: AiProvider | null = null;
let cachedKind: AiProviderKind | null = null;

export function getAiProvider(): AiProvider {
  const kind = getAiProviderKind();
  if (cachedProvider && cachedKind === kind) {
    return cachedProvider;
  }
  cachedKind = kind;
  cachedProvider = kind === 'openai' ? new OpenAiProvider() : new StubAiProvider();
  return cachedProvider;
}

export type { AiProvider } from './provider';
export * from './types';
