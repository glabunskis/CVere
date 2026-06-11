import { create } from 'zustand';

import type { PreviewTarget } from './preview-target';

type Refresher = () => Promise<string | null>;

type PreviewState = {
  previewTarget: PreviewTarget | null;
  signedUrl: string | null;
  isRefreshing: boolean;
  /**
   * Bumped on every `markPreviewDirty`. History controls watch this to
   * re-query undo/redo availability after chat turns and manual saves that
   * recorded a new version.
   */
  historyTick: number;
  setPreviewTarget: (target: PreviewTarget) => void;
  /**
   * Replace the cached signed URL. Used by the provider to hydrate from the
   * server-rendered initial value, and by `markPreviewDirty` after a refresh.
   */
  setSignedUrl: (url: string | null) => void;
  /**
   * Register the async refresher (typically `useAction(createSignedDownload)`
   * bound to the current `pdfPath`). Returns null when no PDF path is known.
   */
  setRefresher: (fn: Refresher) => void;
  /**
   * Invoke the registered refresher, swap the signed URL in, and clear the
   * refreshing flag. Safe to call when no refresher is registered (no-op).
   */
  markPreviewDirty: () => Promise<void>;
};

const noopRefresher: Refresher = async () => null;

export const usePreviewStore = create<PreviewState>((set, get) => ({
  previewTarget: null,
  signedUrl: null,
  isRefreshing: false,
  historyTick: 0,
  setPreviewTarget: (previewTarget) =>
    set((state) => {
      const current = state.previewTarget;
      if (current?.cvId === previewTarget.cvId) return state;
      return { previewTarget };
    }),
  setSignedUrl: (signedUrl) => set({ signedUrl }),
  setRefresher: (fn) => {
    refresherRef.current = fn;
  },
  markPreviewDirty: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });
    try {
      const next = await refresherRef.current();
      if (next) set({ signedUrl: next });
    } finally {
      set((state) => ({ isRefreshing: false, historyTick: state.historyTick + 1 }));
    }
  },
}));

// Module-scoped refresher reference. Kept outside the store so re-registering
// (e.g. when `pdfPath` changes) does not trigger React re-renders for every
// subscriber to the store.
const refresherRef: { current: Refresher } = { current: noopRefresher };
