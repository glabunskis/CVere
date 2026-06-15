import type { PropsWithChildren } from 'react';

import { ensureCvPdfPath, getSelectedCv } from '@/entities/cv';
import { getSession } from '@/entities/user';
import { PreviewerPane, PreviewStoreProvider, signPdfUrl } from '@/features/cv-preview';

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
    <PreviewStoreProvider
      initialSignedUrl={signedUrl}
      initialPreviewTarget={initialPreviewTarget}
      initialTemplate={selectedCv.template}
    >
      <section className='grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <PreviewerPane />
        {children}
      </section>
    </PreviewStoreProvider>
  );
}
