import { getSession } from '@/features/account/controllers/get-session';
import { listAchievements } from '@/features/achievements/controllers/list-achievements';
import { loadMessages } from '@/features/chat/storage/chat-message-store';
import {
  getOrCreateDefaultSession,
  getSessionById,
  listSessions,
  setLastActiveSession,
} from '@/features/chat/storage/chat-session-store';
import type { ChatUIMessage } from '@/features/chat/types';
import { PreviewStoreProvider } from '@/features/previewer/components/preview-store-provider';
import { PreviewerPane } from '@/features/previewer/components/previewer-pane';
import { PreviewerSidebar } from '@/features/previewer/components/previewer-sidebar';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';
import { signMasterUrl } from '@/features/previewer/controllers/sign-master-url';
import { ensureMasterPdfPath } from '@/features/previewer/render';
import { createLoader, parseAsString } from 'nuqs/server';

type DashboardPageProps = {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const loadDashboardSearchParams = createLoader({
  session: parseAsString,
});

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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

  const resolvedSearchParams = await searchParams;
  const { session: requestedSessionId } = loadDashboardSearchParams(resolvedSearchParams);

  const requestedSession = requestedSessionId
    ? await getSessionById(user.id, requestedSessionId)
    : null;
  const activeSession = requestedSession ?? (await getOrCreateDefaultSession(user.id));
  await setLastActiveSession(user.id, activeSession.id);

  const [pdfPath, achievements, sessions, chatMessages] = await Promise.all([
    ensureMasterPdfPath(user, prefs.master_pdf_path),
    listAchievements({ status: 'pending' }),
    listSessions(user.id),
    loadMessages(activeSession.id),
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
          activeSessionId={activeSession.id}
          sessions={sessions}
          initialChatMessages={initialChatMessages}
        />
      </section>
    </PreviewStoreProvider>
  );
}
