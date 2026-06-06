'use client';

import { useEffect, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';

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
  const setRefresher = usePreviewStore((s) => s.setRefresher);
  const { executeAsync: signPreview } = useAction(createSignedPreviewUrl);

  useState(() => {
    usePreviewStore.setState({
      signedUrl: initialSignedUrl,
      previewTarget: initialPreviewTarget,
    });
  });

  useEffect(() => {
    setRefresher(async () => {
      const current = usePreviewStore.getState().previewTarget;
      if (!current) return null;
      const result = await signPreview({ cvId: current.cvId });
      return result?.data?.url ?? null;
    });
  }, [setRefresher, signPreview]);

  return <>{children}</>;
}
