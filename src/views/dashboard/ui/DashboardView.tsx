import type { AchievementRow } from '@/entities/achievement';
import type { CvLibraryData, CvRow, ProfileChildren } from '@/entities/cv';
import type { ChatSessionListItem, ChatUIMessage } from '@/features/chat';
import type { CvTemplate } from '@/features/cv-style';
import type { CvDateFormat } from '@/shared/lib/format-date';

import { DashboardWorkspace } from './DashboardWorkspace';

type DashboardViewProps = {
  selectedCvId: string;
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  activeSessionId: string;
  sessions: ChatSessionListItem[];
  initialChatMessages: ChatUIMessage[];
  initialPrefill: string | null;
  cvLibrary: CvLibraryData;
  achievements: AchievementRow[];
  summary: string | null;
  contact: CvRow;
  fallbackEmail: string | null;
  fallbackFullName: string | null;
  sections: ProfileChildren;
};

export function DashboardView(props: DashboardViewProps) {
  return <DashboardWorkspace {...props} />;
}
