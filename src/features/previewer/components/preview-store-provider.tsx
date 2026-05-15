'use client';

import { useEffect } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { createSignedDownload } from '@/features/exports/actions/export-pdf';

import { usePreviewStore } from '../stores/preview-store';

type Props = {
  initialSignedUrl: string | null;
  pdfPath: string | null;
  children: React.ReactNode;
};

/**
 * Hydrates {@link usePreviewStore} on mount and registers a refresher that
 * re-signs the master CV's storage path. The refresher is the seam through
 * which the chat's `data-preview-dirty` part (P5) and any other client-side
 * "preview is stale" signal can ask the iframe to reload.
 */
export function PreviewStoreProvider({ initialSignedUrl, pdfPath, children }: Props) {
  const setSignedUrl = usePreviewStore((s) => s.setSignedUrl);
  const setRefresher = usePreviewStore((s) => s.setRefresher);
  const { executeAsync } = useAction(createSignedDownload);

  useEffect(() => {
    setSignedUrl(initialSignedUrl);
  }, [initialSignedUrl, setSignedUrl]);

  useEffect(() => {
    if (!pdfPath) {
      setRefresher(async () => null);
      return;
    }
    setRefresher(async () => {
      const result = await executeAsync({ path: pdfPath });
      return result?.data?.url ?? null;
    });
  }, [pdfPath, executeAsync, setRefresher]);

  return <>{children}</>;
}
