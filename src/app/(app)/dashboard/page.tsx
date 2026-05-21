import { getSession } from '@/features/account/controllers/get-session';
import { listAchievements } from '@/features/achievements/controllers/list-achievements';
import { loadMessages } from '@/features/chat/storage/chat-message-store';
import type { ChatUIMessage } from '@/features/chat/types';
import { PreviewStoreProvider } from '@/features/previewer/components/preview-store-provider';
import { PreviewerPane } from '@/features/previewer/components/previewer-pane';
import { PreviewerSidebar } from '@/features/previewer/components/previewer-sidebar';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { signMasterUrl } from '@/features/previewer/controllers/sign-master-url';
import { ensureMasterPdfPath } from '@/features/previewer/render';

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        Sign in to use the previewer.
      </section>
    );
  }

  const prefs = await getOrCreateCvPreferences();
  if (!prefs) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        We couldn&apos;t initialize your CV preferences. Please refresh.
      </section>
    );
  }

  const [pdfPath, achievements, chatMessages] = await Promise.all([
    ensureMasterPdfPath(user, prefs.master_pdf_path),
    listAchievements({ status: 'pending' }),
    loadMessages(user.id),
  ]);
  const initialChatMessages = chatMessages as ChatUIMessage[];

  const signedUrl = await signMasterUrl(pdfPath);

  return (
    <PreviewStoreProvider initialSignedUrl={signedUrl} pdfPath={pdfPath}>
      <section className='grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <PreviewerPane />
        <PreviewerSidebar
          template={prefs.template}
          accentHex={prefs.accent_hex}
          educationDateFormat={prefs.education_date_format}
          certificationDateFormat={prefs.certification_date_format}
          pendingAchievements={achievements.length}
          initialChatMessages={initialChatMessages}
        />
      </section>
    </PreviewStoreProvider>
  );
}
