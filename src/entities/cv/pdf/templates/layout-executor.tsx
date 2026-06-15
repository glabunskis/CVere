import { Document, Page, View } from '@react-pdf/renderer';

import { LAYOUT_SECTION_KINDS, type LayoutSectionKind, type LayoutSpec } from '../layout-spec';
import { Header } from '../primitives';
import { createStyles, type PdfStyles, pdfTheme } from '../theme';

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

type LayoutCvProps = TemplateProps & { layout: LayoutSpec };

export function LayoutCv({
  snapshot,
  sections,
  identityName,
  contact,
  contactLine,
  accent,
  dateFormats = DEFAULT_DATE_FORMATS,
  fontSizes,
  layout,
}: LayoutCvProps) {
  const styles = createStyles(accent, layout.density, fontSizes);
  const summary = sections.summary ?? snapshot.summary ?? '';
  const experiences = applyOrder(snapshot.experience ?? [], sections.experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], sections.projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], sections.skillsOrder);

  const renderSection = (kind: LayoutSectionKind) => {
    switch (kind) {
      case 'summary':
        return <SummaryBlock key='summary' summary={summary} styles={styles} />;
      case 'experience':
        return <ExperienceSection key='experience' experiences={experiences} styles={styles} />;
      case 'projects':
        return <ProjectsSection key='projects' projects={projects} styles={styles} />;
      case 'skills':
        return <SkillsSection key='skills' skills={skills} styles={styles} />;
      case 'education':
        return (
          <EducationSection
            key='education'
            education={snapshot.education ?? []}
            styles={styles}
            dateFormat={dateFormats.education}
          />
        );
      case 'certifications':
        return (
          <CertificationsSection
            key='certifications'
            certifications={snapshot.certifications ?? []}
            styles={styles}
            dateFormat={dateFormats.certification}
          />
        );
      case 'languages':
        return <LanguagesSection key='languages' languages={snapshot.languages ?? []} styles={styles} />;
      default:
        return null;
    }
  };

  // Which section kinds actually have content. Layout only reorders/reshapes
  // existing sections; it must never silently drop a populated one.
  const hasData: Record<LayoutSectionKind, boolean> = {
    summary: summary.trim().length > 0,
    experience: experiences.length > 0,
    projects: projects.length > 0,
    skills: skills.length > 0,
    education: (snapshot.education ?? []).length > 0,
    certifications: (snapshot.certifications ?? []).length > 0,
    languages: (snapshot.languages ?? []).length > 0,
  };

  // Dedupe: a section kind may appear at most once across full/left/right.
  // Keep the first occurrence (full band wins, then left, then right).
  const seen = new Set<LayoutSectionKind>();
  const take = (kinds: LayoutSectionKind[]) =>
    kinds.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));

  const isTwo = layout.columns === 'two';

  // Full-width band above the columns (single-column renders the band as the
  // top of the single stack). Order: full, then left, then right.
  const fullKinds = take(layout.full ?? []);
  const leftKinds = isTwo ? take(layout.left) : take([...layout.left, ...layout.right]);
  const rightKinds = isTwo ? take(layout.right) : [];

  // Safety net: append any populated section the model left out so layout can
  // never delete content. Long-form leftovers go to the wide main (right) in a
  // two-column layout; otherwise they extend the single stack.
  const missing = LAYOUT_SECTION_KINDS.filter((k) => hasData[k] && !seen.has(k));
  for (const k of missing) seen.add(k);
  (isTwo ? rightKinds : leftKinds).push(...missing);

  const leftRatio = layout.leftRatio ?? 0.34;
  const columns = (
    <View style={styles.twoColumnRow}>
      <View style={[styles.column, { flexGrow: leftRatio }]}>{leftKinds.map(renderSection)}</View>
      <View style={[styles.column, { flexGrow: 1 - leftRatio }]}>{rightKinds.map(renderSection)}</View>
    </View>
  );

  const body = isTwo ? (
    <>
      {fullKinds.map(renderSection)}
      {columns}
    </>
  ) : (
    [...fullKinds, ...leftKinds].map(renderSection)
  );

  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contact} contactLine={contactLine} accent={accent} styles={styles} />
        {body}
      </Page>
    </Document>
  );
}

// Re-exported for callers that only need the styles type.
export type { PdfStyles };
