import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { buildProfileSnapshot } from '@/features/tailored/snapshot';

import { Cv, type CvTemplate } from './Cv';
import type { DateFormats } from './templates/shared';
import { DEFAULT_ACCENT } from './theme';

export type MasterCvProps = {
  summary: string | null;
  profileChildren: ProfileChildren;
  template: CvTemplate;
  accent?: string;
  identityName: string;
  contactLine?: string;
  dateFormats?: DateFormats;
};

export function MasterCv({
  summary,
  profileChildren,
  template,
  accent = DEFAULT_ACCENT,
  identityName,
  contactLine,
  dateFormats,
}: MasterCvProps) {
  const snapshot = buildProfileSnapshot(summary, profileChildren);
  return (
    <Cv
      template={template}
      snapshot={snapshot}
      sections={{}}
      identityName={identityName}
      contactLine={contactLine}
      accent={accent}
      dateFormats={dateFormats}
    />
  );
}
