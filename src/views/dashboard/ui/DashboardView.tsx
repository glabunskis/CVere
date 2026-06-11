import type { CvLibraryData } from '@/entities/cv';
import type { ChatSessionListItem, ChatUIMessage } from '@/features/chat';
import type { CvTemplate } from '@/features/cv-style';
import type { CvDateFormat } from '@/shared/lib/format-date';
import { PreviewerSidebar } from '@/widgets/previewer-sidebar';

type DashboardViewProps = {
  selectedCvId: string;
  template: CvTemplate;
  accentHex: string;
  educationDateFormat: CvDateFormat;
  certificationDateFormat: CvDateFormat;
  pendingAchievements: number;
  activeSessionId: string;
  sessions: ChatSessionListItem[];
  initialChatMessages: ChatUIMessage[];
  initialPrefill: string | null;
  cvLibrary: CvLibraryData;
};

export function DashboardView(props: DashboardViewProps) {
  return <PreviewerSidebar {...props} />;
}
