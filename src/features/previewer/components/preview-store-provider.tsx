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

/**
 * Hydrates {@link usePreviewStore} on mount and registers a refresher that
 * re-signs the currently selected preview target's storage path. The refresher is the seam through
 * which the chat's `data-preview-dirty` part (P5) and any other client-side
 * "preview is stale" signal can ask the iframe to reload.
 */
export function PreviewStoreProvider({ initialSignedUrl, initialPreviewTarget, children }: Props) {
  const setSignedUrl = usePreviewStore((s) => s.setSignedUrl);
  const setRefresher = usePreviewStore((s) => s.setRefresher);
  const setPreviewTarget = usePreviewStore((s) => s.setPreviewTarget);
  const previewTarget = usePreviewStore((s) => s.previewTarget);
  const hasHydratedRef = useRef(false);
  const { executeAsync: signPreview } = useAction(createSignedPreviewUrl);
  const { executeAsync: persistLastPreviewed } = useAction(setLastPreviewed);

  useEffect(() => {
    setSignedUrl(initialSignedUrl);
    setPreviewTarget(initialPreviewTarget);
    hasHydratedRef.current = true;
  }, [initialPreviewTarget, initialSignedUrl, setPreviewTarget, setSignedUrl]);

  useEffect(() => {
    setRefresher(async () => {
      const current = usePreviewStore.getState().previewTarget;
      const result = await signPreview(current.kind === 'master' ? { kind: 'master' } : current);
      return result?.data?.url ?? null;
    });
  }, [setRefresher, signPreview]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    void persistLastPreviewed(
      previewTarget.kind === 'master' ? { kind: 'master' } : previewTarget,
    );
  }, [persistLastPreviewed, previewTarget]);

  return <>{children}</>;
}
