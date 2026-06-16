import type { PropsWithChildren } from 'react';

import { ensureCvPdfPath, getSelectedCv } from '@/entities/cv';
import { getSession } from '@/entities/user';
import { PreviewStoreProvider, signPdfUrl } from '@/features/cv-preview';

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
      <section className='h-full min-h-0'>{children}</section>
    </PreviewStoreProvider>
  );
}
