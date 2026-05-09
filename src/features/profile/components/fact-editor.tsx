import type { ProfileChildren } from '../controllers/get-profile-children';

import { CertificationEditor } from './certification-editor';
import { EducationEditor } from './education-editor';
import { ExperienceEditor } from './experience-editor';
import { LanguageEditor } from './language-editor';
import { ProjectEditor } from './project-editor';
import { SkillEditor } from './skill-editor';
import { SummaryEditor } from './summary-editor';

type Props = {
  summary: string | null;
  sections: ProfileChildren;
  mode?: 'edit' | 'read';
};

export function FactEditor({ summary, sections, mode = 'edit' }: Props) {
  const readOnly = mode === 'read';

  return (
    <div className='flex flex-col gap-6'>
      <div className='rounded-xl border bg-card p-4'>
        <SummaryEditor initialSummary={summary} readOnly={readOnly} />
      </div>
      <ExperienceEditor items={sections.experience} readOnly={readOnly} />
      <ProjectEditor items={sections.project} readOnly={readOnly} />
      <SkillEditor items={sections.skill} readOnly={readOnly} />
      <EducationEditor items={sections.education} readOnly={readOnly} />
      <CertificationEditor items={sections.certification} readOnly={readOnly} />
      <LanguageEditor items={sections.language} readOnly={readOnly} />
    </div>
  );
}
