import { getSession } from '@/features/account/controllers/get-session';
import { listAchievements } from '@/features/achievements/controllers/list-achievements';
import { listAdvice } from '@/features/advice/controllers/list-advice';
import { loadMessages } from '@/features/chat/storage/chat-message-store';
import type { ChatUIMessage } from '@/features/chat/types';
import { listCoverLetters } from '@/features/letters/controllers/get-letters';
import { PreviewStoreProvider } from '@/features/previewer/components/preview-store-provider';
import { PreviewerPane } from '@/features/previewer/components/previewer-pane';
import { PreviewerSidebar } from '@/features/previewer/components/previewer-sidebar';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { signMasterUrl } from '@/features/previewer/controllers/sign-master-url';
import { ensureMasterPdfPath } from '@/features/previewer/render';
import { listTailoredCvs } from '@/features/tailored/controllers/get-tailored';

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

  const [pdfPath, achievements, openAdvice, recentTailored, recentLetters, chatMessages] = await Promise.all([
    ensureMasterPdfPath(user, prefs.master_pdf_path),
    listAchievements({ status: 'pending' }),
    listAdvice({ status: 'open' }),
    listTailoredCvs(),
    listCoverLetters(),
    loadMessages(user.id),
  ]);
  const initialChatMessages = chatMessages as ChatUIMessage[];

  const signedUrl = await signMasterUrl(pdfPath);

  const pinnedTailored = prefs.pinned_tailored_cv_id
    ? recentTailored.find((row) => row.id === prefs.pinned_tailored_cv_id) ?? null
    : null;
  const pinnedLabel = pinnedTailored
    ? `${pinnedTailored.job?.role ?? 'Tailored'}${pinnedTailored.job?.company ? ` @ ${pinnedTailored.job.company}` : ''}`
    : null;

  return (
    <PreviewStoreProvider initialSignedUrl={signedUrl} pdfPath={pdfPath}>
      <section className='grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <PreviewerPane pinnedLabel={pinnedLabel} />
        <PreviewerSidebar
          template={prefs.template}
          accentHex={prefs.accent_hex}
          educationDateFormat={prefs.education_date_format}
          certificationDateFormat={prefs.certification_date_format}
          pinnedTailoredCvId={prefs.pinned_tailored_cv_id}
          pendingAchievements={achievements.length}
          openAdvice={openAdvice.length}
          recentTailored={recentTailored.map((row) => ({
            id: row.id,
            label: `${row.job?.role ?? '[MISSING] role'}${row.job?.company ? ` - ${row.job.company}` : ''}`,
          }))}
          recentLetters={recentLetters.map((row) => ({
            id: row.id,
            label: `${row.job?.role ?? '[MISSING] role'}${row.job?.company ? ` - ${row.job.company}` : ''}`,
          }))}
          initialChatMessages={initialChatMessages}
        />
      </section>
    </PreviewStoreProvider>
  );
}
