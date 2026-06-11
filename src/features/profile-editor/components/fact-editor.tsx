import type { ProfileChildren } from '@/entities/cv';
import type { CvRow } from '@/entities/cv';
import { type CvDateFormat, DEFAULT_CV_DATE_FORMAT } from '@/shared/lib/format-date';

import { CertificationEditor } from './certification-editor';
import { ContactEditor } from './contact-editor';
import { EducationEditor } from './education-editor';
import { ExperienceEditor } from './experience-editor';
import { LanguageEditor } from './language-editor';
import { ProjectEditor } from './project-editor';
import { SkillEditor } from './skill-editor';
import { SummaryEditor } from './summary-editor';

type ContactProfile = Pick<
  CvRow,
  'full_name' | 'location' | 'phone' | 'contact_email' | 'linkedin_url' | 'github_url' | 'website_url'
>;

type Props = {
  summary: string | null;
  contact: ContactProfile;
  fallbackEmail?: string | null;
  fallbackFullName?: string | null;
  sections: ProfileChildren;
  mode?: 'edit' | 'read';
  educationDateFormat?: CvDateFormat;
  certificationDateFormat?: CvDateFormat;
};

export function FactEditor({
  summary,
  contact,
  fallbackEmail,
  fallbackFullName,
  sections,
  mode = 'edit',
  educationDateFormat = DEFAULT_CV_DATE_FORMAT,
  certificationDateFormat = DEFAULT_CV_DATE_FORMAT,
}: Props) {
  const readOnly = mode === 'read';

  return (
    <div className='flex flex-col gap-6'>
      <div className='rounded-xl border bg-card p-4'>
        <SummaryEditor initialSummary={summary} readOnly={readOnly} />
      </div>
      <ContactEditor
        profile={contact}
        fallbackEmail={fallbackEmail}
        fallbackFullName={fallbackFullName}
        readOnly={readOnly}
      />
      <ExperienceEditor items={sections.experience} readOnly={readOnly} />
      <ProjectEditor items={sections.project} readOnly={readOnly} />
      <SkillEditor items={sections.skill} readOnly={readOnly} />
      <EducationEditor items={sections.education} readOnly={readOnly} dateFormat={educationDateFormat} />
      <CertificationEditor
        items={sections.certification}
        readOnly={readOnly}
        dateFormat={certificationDateFormat}
      />
      <LanguageEditor items={sections.language} readOnly={readOnly} />
    </div>
  );
}
