import type { PropsWithChildren } from 'react';

import { getSession } from '@/features/account/controllers/get-session';
import { getSelectedCv } from '@/features/cv/services/cv-service';
import { PreviewStoreProvider } from '@/features/previewer/components/preview-store-provider';
import { PreviewerPane } from '@/features/previewer/components/previewer-pane';
import { signPdfUrl } from '@/features/previewer/controllers/sign-pdf-url';
import { ensureCvPdfPath } from '@/features/previewer/render';

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const user = await getSession();
  if (!user) {
    return <>{children}</>;
  }

  const selectedCv = await getSelectedCv(user.id);
  const initialPreviewTarget = { cvId: selectedCv.id };
  const pdfPath = await ensureCvPdfPath({
    user,
    cvId: selectedCv.id,
    existingPath: selectedCv.pdf_path ?? null,
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
