import type { UIMessage } from 'ai';

import type { PreviewDirtyData } from './schemas';

/**
 * Custom UI message type for the chat. Adds the `preview-dirty` data part so
 * `useChat`'s `onData` callback narrows correctly when the route signals an
 * end-of-turn re-render. Tool parts stay generic (the route uses untyped
 * `UIMessage` on the persistence side) and are rendered by name at runtime.
 */
export type ChatUIDataParts = {
  'preview-dirty': PreviewDirtyData;
};

export type ChatUIMessage = UIMessage<never, ChatUIDataParts>;
