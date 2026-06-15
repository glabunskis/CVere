import { create } from 'zustand';

import type { PreviewTarget } from './preview-target';

/**
 * Result of a preview refresh: the freshly signed PDF URL plus the previewed
 * CV's current `template`. The template rides along so the Library layout
 * selector can update reactively after a chat turn or manual change without a
 * full `router.refresh()`. Typed as a plain string to avoid a cross-slice
 * import of `CvTemplate` (consumers narrow it).
 */
type RefresherResult = { url: string | null; template: string | null };
type Refresher = () => Promise<RefresherResult | null>;

type PreviewState = {
  previewTarget: PreviewTarget | null;
  signedUrl: string | null;
  /**
   * The previewed CV's current template (single/two-column). Hydrated from the
   * server, kept in sync by every `markPreviewDirty`, and updated optimistically
   * by the Library template picker. The selector reads this instead of relying
   * on a server re-render.
   */
  template: string | null;
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
   * Set the previewed CV's template. Used for optimistic updates from the
   * Library picker; `markPreviewDirty` reconciles it from the server.
   */
  setTemplate: (template: string | null) => void;
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
  template: null,
  isRefreshing: false,
  historyTick: 0,
  setPreviewTarget: (previewTarget) =>
    set((state) => {
      const current = state.previewTarget;
      if (current?.cvId === previewTarget.cvId) return state;
      return { previewTarget };
    }),
  setSignedUrl: (signedUrl) => set({ signedUrl }),
  setTemplate: (template) => set({ template }),
  setRefresher: (fn) => {
    refresherRef.current = fn;
  },
  markPreviewDirty: async () => {
    if (get().isRefreshing) return;
    set({ isRefreshing: true });
    try {
      const next = await refresherRef.current();
      if (next) {
        set((state) => ({
          signedUrl: next.url ?? state.signedUrl,
          template: next.template ?? state.template,
        }));
      }
    } finally {
      set((state) => ({ isRefreshing: false, historyTick: state.historyTick + 1 }));
    }
  },
}));

// Module-scoped refresher reference. Kept outside the store so re-registering
// (e.g. when `pdfPath` changes) does not trigger React re-renders for every
// subscriber to the store.
const refresherRef: { current: Refresher } = { current: noopRefresher };
