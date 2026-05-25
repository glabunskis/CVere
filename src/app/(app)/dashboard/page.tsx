import { createLoader, parseAsString } from 'nuqs/server';

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
import { listCvs } from '@/features/cv-library/controllers/list-cvs';
import { PreviewerSidebar } from '@/features/previewer/components/previewer-sidebar';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';

type DashboardPageProps = {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const loadDashboardSearchParams = createLoader({
  session: parseAsString,
  prefill: parseAsString,
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
  const { session: requestedSessionId, prefill } = loadDashboardSearchParams(resolvedSearchParams);

  const requestedSession = requestedSessionId
    ? await getSessionById(user.id, requestedSessionId)
    : null;
  const activeSession = requestedSession ?? (await getOrCreateDefaultSession(user.id));
  if (requestedSession && prefs.last_active_session_id !== requestedSession.id) {
    await setLastActiveSession(user.id, requestedSession.id);
  }

  const [achievements, sessions, chatMessages, cvLibrary] = await Promise.all([
    listAchievements({ status: 'pending' }),
    listSessions(user.id),
    loadMessages(activeSession.id),
    listCvs(),
  ]);
  const initialChatMessages = chatMessages as ChatUIMessage[];
  const selectedCv =
    cvLibrary.items.find((item) => item.id === cvLibrary.selectedCvId) ?? cvLibrary.items[0];
  if (!selectedCv) {
    return (
      <section className='py-10 text-center text-sm text-muted-foreground'>
        No CV found. Create one from Profile.
      </section>
    );
  }

  return (
    <PreviewerSidebar
      template={selectedCv.template}
      accentHex={selectedCv.accentHex}
      educationDateFormat={selectedCv.educationDateFormat}
      certificationDateFormat={selectedCv.certificationDateFormat}
      pendingAchievements={achievements.length}
      activeSessionId={activeSession.id}
      sessions={sessions}
      initialChatMessages={initialChatMessages}
      initialPrefill={prefill ?? null}
      cvLibrary={cvLibrary}
    />
  );
}
