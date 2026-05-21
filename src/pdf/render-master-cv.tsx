import { buildProfileSnapshot } from '@/features/chat/profile-snapshot';
import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';

import type { DateFormats } from './templates/shared';
import { Cv, type CvTemplate } from './Cv';
import type { ProfileContact } from './primitives';
import { DEFAULT_ACCENT } from './theme';

export type MasterCvProps = {
  summary: string | null;
  profileChildren: ProfileChildren;
  template: CvTemplate;
  accent?: string;
  identityName: string;
  contact?: ProfileContact;
  contactLine?: string;
  dateFormats?: DateFormats;
};

export function MasterCv({
  summary,
  profileChildren,
  template,
  accent = DEFAULT_ACCENT,
  identityName,
  contact,
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
      contact={contact}
      contactLine={contactLine}
      accent={accent}
      dateFormats={dateFormats}
    />
  );
}
