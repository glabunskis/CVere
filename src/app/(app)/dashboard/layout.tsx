import type { PropsWithChildren } from 'react';

import { getSession } from '@/features/account/controllers/get-session';
import { PreviewStoreProvider } from '@/features/previewer/components/preview-store-provider';
import { PreviewerPane } from '@/features/previewer/components/previewer-pane';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { resolveInitialPreviewTarget } from '@/features/previewer/controllers/resolve-preview-target';
import { signPdfUrl } from '@/features/previewer/controllers/sign-master-url';
import { ensureCvPdfPath } from '@/features/previewer/render';

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const user = await getSession();
  if (!user) {
    return <>{children}</>;
  }

  const prefs = await getOrCreateCvPreferences();
  const initialPreviewTarget = await resolveInitialPreviewTarget({
    userId: user.id,
    preferences: prefs,
  });
  const pdfPath = await ensureCvPdfPath({
    user,
    target: initialPreviewTarget,
    existingMasterPath: prefs?.master_pdf_path ?? null,
  });
  const signedUrl = await signPdfUrl(pdfPath);

  return (
    <PreviewStoreProvider initialSignedUrl={signedUrl} initialPreviewTarget={initialPreviewTarget}>
      <section className='grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <PreviewerPane />
        {children}
      </section>
    </PreviewStoreProvider>
  );
}
