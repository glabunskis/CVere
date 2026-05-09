import type { AiProfile } from '@/libs/ai/types';
import { Document, Page, Text, View } from '@react-pdf/renderer';

import { Bullet, Header, Section } from './primitives';
import { pdfTheme, styles } from './theme';

type TailoredSections = {
  summary?: string | null;
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
  emphasis?: string[];
};

function applyOrder<T extends { id: string }>(items: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) return items;
  const byId = new Map(items.map((item) => [item.id, item] as const));
  const ordered: T[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  for (const item of byId.values()) ordered.push(item);
  return ordered;
}

export function Cv({
  snapshot,
  sections,
  identityName,
  contactLine,
}: {
  snapshot: AiProfile;
  sections: TailoredSections;
  identityName: string;
  contactLine?: string;
}) {
  const summary = sections.summary ?? snapshot.summary ?? '';
  const experiences = applyOrder(snapshot.experience ?? [], sections.experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], sections.projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], sections.skillsOrder);

  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contactLine} />

        {summary ? (
          <View style={styles.group}>
            <Text style={styles.paragraph}>{summary}</Text>
          </View>
        ) : null}

        {experiences.length ? (
          <Section title='Experience'>
            {experiences.map((exp) => (
              <View key={exp.id} style={styles.group} wrap={false}>
                <Text style={styles.itemTitle}>
                  {exp.role}
                  {' - '}
                  <Text style={styles.inlineMuted}>{exp.company}</Text>
                </Text>
                <Text style={styles.itemMeta}>
                  {exp.startDate ?? '[MISSING]'} - {exp.isCurrent ? 'Present' : (exp.endDate ?? '[MISSING]')}
                  {exp.location ? ` - ${exp.location}` : ''}
                </Text>
                {exp.summary ? <Text style={styles.paragraph}>{exp.summary}</Text> : null}
                {exp.bullets.map((bullet, idx) => (
                  <Bullet key={idx}>{bullet}</Bullet>
                ))}
                {exp.stack.length ? (
                  <Text style={styles.itemMeta}>Stack: {exp.stack.join(', ')}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {projects.length ? (
          <Section title='Projects'>
            {projects.map((project) => (
              <View key={project.id} style={styles.group} wrap={false}>
                <Text style={styles.itemTitle}>{project.name}</Text>
                {project.description ? <Text style={styles.paragraph}>{project.description}</Text> : null}
                {project.bullets.map((bullet, idx) => (
                  <Bullet key={idx}>{bullet}</Bullet>
                ))}
                {project.stack.length ? (
                  <Text style={styles.itemMeta}>Stack: {project.stack.join(', ')}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {skills.length ? (
          <Section title='Skills'>
            <Text style={styles.paragraph}>
              {skills.map((skill) => (skill.level ? `${skill.name} (${skill.level})` : skill.name)).join(', ')}
            </Text>
          </Section>
        ) : null}

        {(snapshot.education ?? []).length ? (
          <Section title='Education'>
            {snapshot.education?.map((edu) => (
              <View key={edu.id} style={styles.group} wrap={false}>
                <Text style={styles.itemTitle}>{edu.institution}</Text>
                <Text style={styles.itemMeta}>
                  {[edu.degree, edu.field].filter(Boolean).join(' - ') || '[MISSING]'}
                  {edu.startDate || edu.endDate ? ` - ${edu.startDate ?? '?'} -> ${edu.endDate ?? '?'}` : ''}
                </Text>
                {edu.summary ? <Text style={styles.paragraph}>{edu.summary}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {(snapshot.certifications ?? []).length ? (
          <Section title='Certifications'>
            {snapshot.certifications?.map((cert) => (
              <View key={cert.id} style={styles.group} wrap={false}>
                <Text style={styles.itemTitle}>{cert.name}</Text>
                <Text style={styles.itemMeta}>
                  {cert.issuer ?? '[MISSING]'}
                  {cert.issuedAt ? ` - ${cert.issuedAt}` : ''}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        {(snapshot.languages ?? []).length ? (
          <Section title='Languages'>
            <Text style={styles.paragraph}>
              {snapshot.languages?.map((lang) => `${lang.name}${lang.proficiency ? ` (${lang.proficiency})` : ''}`).join(', ')}
            </Text>
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
