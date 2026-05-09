import { AzureAiProvider } from './azure';
import type { AiProvider } from './provider';
import { StubAiProvider } from './stub';

export type AiProviderKind = 'stub' | 'azure';

export function getAiProviderKind(): AiProviderKind {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (value === 'azure') return 'azure';
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
  cachedProvider = kind === 'azure' ? new AzureAiProvider() : new StubAiProvider();
  return cachedProvider;
}

export type { AiProvider } from './provider';
export * from './types';
