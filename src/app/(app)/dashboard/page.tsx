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
import { PreviewerSidebar } from '@/features/previewer/components/previewer-sidebar';
import { getOrCreateCvPreferences } from '@/features/previewer/controllers/get-cv-preferences';

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
  if (requestedSession && prefs.last_active_session_id !== requestedSession.id) {
    await setLastActiveSession(user.id, requestedSession.id);
  }

  const [achievements, sessions, chatMessages] = await Promise.all([
    listAchievements({ status: 'pending' }),
    listSessions(user.id),
    loadMessages(activeSession.id),
  ]);
  const initialChatMessages = chatMessages as ChatUIMessage[];

  return (
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
  );
}
