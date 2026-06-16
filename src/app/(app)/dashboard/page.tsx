import { createLoader, parseAsString } from 'nuqs/server';

import { listAchievements } from '@/entities/achievement';
import { getCvChildren, getSelectedCv, listCvs } from '@/entities/cv';
import { getSession } from '@/entities/user';
import type { ChatUIMessage } from '@/features/chat';
import {
  getOrCreateDefaultSession,
  getSessionById,
  listSessions,
  loadMessages,
  setLastActiveSession,
} from '@/features/chat';
import { DEFAULT_CV_DATE_FORMAT } from '@/shared/lib/format-date';
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

  const [sessions, chatMessages, cvLibrary, selectedCv, achievements] = await Promise.all([
    listSessions(user.id),
    loadMessages(activeSession.id),
    listCvs(),
    getSelectedCv(user.id),
    listAchievements({ status: 'pending' }),
  ]);
  const initialChatMessages = chatMessages as ChatUIMessage[];

  const sections = await getCvChildren(selectedCv.id);
  const userMetadata = (user.user_metadata ?? {}) as { full_name?: string };

  return (
    <DashboardView
      selectedCvId={selectedCv.id}
      template={selectedCv.template}
      accentHex={selectedCv.accent_hex}
      educationDateFormat={selectedCv.education_date_format ?? DEFAULT_CV_DATE_FORMAT}
      certificationDateFormat={selectedCv.certification_date_format ?? DEFAULT_CV_DATE_FORMAT}
      activeSessionId={activeSession.id}
      sessions={sessions}
      initialChatMessages={initialChatMessages}
      initialPrefill={prefill ?? null}
      cvLibrary={cvLibrary}
      achievements={achievements}
      summary={selectedCv.summary}
      contact={selectedCv}
      fallbackEmail={user.email ?? null}
      fallbackFullName={userMetadata.full_name ?? null}
      sections={sections}
    />
  );
}
