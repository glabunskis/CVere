import { createLoader, parseAsString } from 'nuqs/server';

import { listAchievements } from '@/entities/achievement';
import { listCvs } from '@/entities/cv';
import { getSession } from '@/entities/user';
import type { ChatUIMessage } from '@/features/chat';
import {
  getOrCreateDefaultSession,
  getSessionById,
  listSessions,
  loadMessages,
  setLastActiveSession,
} from '@/features/chat';
import { DashboardView } from '@/views/dashboard';

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

  const resolvedSearchParams = await searchParams;
  const { session: requestedSessionId, prefill } = loadDashboardSearchParams(resolvedSearchParams);

  const requestedSession = requestedSessionId
    ? await getSessionById(user.id, requestedSessionId)
    : null;
  const activeSession = requestedSession ?? (await getOrCreateDefaultSession(user.id));
  if (requestedSession) {
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
    <DashboardView
      selectedCvId={selectedCv.id}
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
