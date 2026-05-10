import { Document, Page, View } from '@react-pdf/renderer';

import { Header } from '../primitives';
import { createStyles, pdfTheme } from '../theme';

import {
  applyOrder,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SummaryBlock,
  type TemplateProps,
} from './shared';

export function TwoColumnCv({ snapshot, sections, identityName, contactLine, accent }: TemplateProps) {
  const styles = createStyles(accent);
  const summary = sections.summary ?? snapshot.summary ?? '';
  const experiences = applyOrder(snapshot.experience ?? [], sections.experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], sections.projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], sections.skillsOrder);

  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contactLine} styles={styles} />
        <View style={styles.twoColumnRow}>
          <View style={styles.columnLeft}>
            <SummaryBlock summary={summary} styles={styles} />
            <SkillsSection skills={skills} styles={styles} />
            <ProjectsSection projects={projects} styles={styles} />
            <CertificationsSection certifications={snapshot.certifications ?? []} styles={styles} />
            <LanguagesSection languages={snapshot.languages ?? []} styles={styles} />
          </View>
          <View style={styles.columnRight}>
            <ExperienceSection experiences={experiences} styles={styles} />
            <EducationSection education={snapshot.education ?? []} styles={styles} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
