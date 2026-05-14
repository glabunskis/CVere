import { Document, Page } from '@react-pdf/renderer';

import { Header } from '../primitives';
import { createStyles, pdfTheme } from '../theme';

import {
  applyOrder,
  CertificationsSection,
  DEFAULT_DATE_FORMATS,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SummaryBlock,
  type TemplateProps,
} from './shared';

export function SingleColumnCv({
  snapshot,
  sections,
  identityName,
  contactLine,
  accent,
  dateFormats = DEFAULT_DATE_FORMATS,
}: TemplateProps) {
  const styles = createStyles(accent);
  const summary = sections.summary ?? snapshot.summary ?? '';
  const experiences = applyOrder(snapshot.experience ?? [], sections.experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], sections.projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], sections.skillsOrder);

  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contactLine} styles={styles} />
        <SummaryBlock summary={summary} styles={styles} />
        <ExperienceSection experiences={experiences} styles={styles} />
        <ProjectsSection projects={projects} styles={styles} />
        <SkillsSection skills={skills} styles={styles} />
        <EducationSection education={snapshot.education ?? []} styles={styles} dateFormat={dateFormats.education} />
        <CertificationsSection
          certifications={snapshot.certifications ?? []}
          styles={styles}
          dateFormat={dateFormats.certification}
        />
        <LanguagesSection languages={snapshot.languages ?? []} styles={styles} />
      </Page>
    </Document>
  );
}
