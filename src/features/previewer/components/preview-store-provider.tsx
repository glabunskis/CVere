'use client';

import { useEffect, useRef } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { setLastPreviewed } from '@/features/previewer/actions/set-last-previewed';
import { createSignedPreviewUrl } from '@/features/previewer/actions/sign-pdf-url';
import type { PreviewTarget } from '@/features/previewer/preview-target';

import { usePreviewStore } from '../stores/preview-store';

type Props = {
  initialSignedUrl: string | null;
  initialPreviewTarget: PreviewTarget;
  children: React.ReactNode;
};

function isSamePreviewTarget(a: PreviewTarget, b: PreviewTarget): boolean {
  if (a.kind === 'master' && b.kind === 'master') return true;
  if (a.kind === 'tailored_cv' && b.kind === 'tailored_cv') return a.refId === b.refId;
  return false;
}

/**
 * Hydrates {@link usePreviewStore} on mount and registers a refresher that
 * re-signs the currently selected preview target's storage path. The refresher is the seam through
 * which the chat's `data-preview-dirty` part (P5) and any other client-side
 * "preview is stale" signal can ask the iframe to reload.
 */
export function PreviewStoreProvider({ initialSignedUrl, initialPreviewTarget, children }: Props) {
  const setRefresher = usePreviewStore((s) => s.setRefresher);
  const hasHydratedRef = useRef(false);
  const { executeAsync: signPreview } = useAction(createSignedPreviewUrl);
  const { executeAsync: persistLastPreviewed } = useAction(setLastPreviewed);

  if (!hasHydratedRef.current) {
    usePreviewStore.setState({
      signedUrl: initialSignedUrl,
      previewTarget: initialPreviewTarget,
    });
    hasHydratedRef.current = true;
  }

  useEffect(() => {
    setRefresher(async () => {
      const current = usePreviewStore.getState().previewTarget;
      const result = await signPreview(current.kind === 'master' ? { kind: 'master' } : current);
      return result?.data?.url ?? null;
    });
  }, [setRefresher, signPreview]);

  useEffect(
    () =>
      usePreviewStore.subscribe((state, prevState) => {
        if (!hasHydratedRef.current) return;
        const next = state.previewTarget;
        const prev = prevState.previewTarget;
        if (isSamePreviewTarget(next, prev)) return;
        void persistLastPreviewed(next.kind === 'master' ? { kind: 'master' } : next);
      }),
    [persistLastPreviewed],
  );

  return <>{children}</>;
}
