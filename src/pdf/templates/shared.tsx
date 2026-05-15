import type { AiProfile } from '@/libs/ai/types';
import { type CvDateFormat, DEFAULT_CV_DATE_FORMAT, formatCvDate } from '@/utils/format-date';
import { Text, View } from '@react-pdf/renderer';

import { Bullet, type ProfileContact, Section } from '../primitives';
import type { PdfStyles } from '../theme';

export type TailoredSections = {
  summary?: string | null;
  experienceOrder?: string[];
  projectsOrder?: string[];
  skillsOrder?: string[];
  emphasis?: string[];
};

export type DateFormats = {
  education: CvDateFormat;
  certification: CvDateFormat;
};

export const DEFAULT_DATE_FORMATS: DateFormats = {
  education: DEFAULT_CV_DATE_FORMAT,
  certification: DEFAULT_CV_DATE_FORMAT,
};

export type TemplateProps = {
  snapshot: AiProfile;
  sections: TailoredSections;
  identityName: string;
  contact?: ProfileContact;
  contactLine?: string;
  accent: string;
  dateFormats?: DateFormats;
};

export function applyOrder<T extends { id: string }>(items: T[], order: string[] | undefined): T[] {
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

export function ExperienceSection({
  experiences,
  styles,
}: {
  experiences: AiProfile['experience'];
  styles: PdfStyles;
}) {
  if (!experiences.length) return null;
  return (
    <Section title='Professional Experience' styles={styles}>
      {experiences.map((exp) => (
        <View key={exp.id} style={styles.itemGroup} wrap={false}>
          <Text style={styles.itemTitle}>
            {exp.role}
            {' - '}
            <Text style={styles.inlineMuted}>{exp.company}</Text>
          </Text>
          <Text style={styles.itemMeta}>
            <Text style={styles.dateMeta}>
              {exp.startDate ?? '[MISSING]'} - {exp.isCurrent ? 'Present' : (exp.endDate ?? '[MISSING]')}
            </Text>
            {exp.location ? ` - ${exp.location}` : ''}
          </Text>
          {exp.summary ? <Text style={styles.paragraph}>{exp.summary}</Text> : null}
          {exp.bullets.map((bullet, idx) => (
            <Bullet key={idx} styles={styles}>
              {bullet}
            </Bullet>
          ))}
          {exp.stack.length ? <Text style={styles.itemMeta}>Stack: {exp.stack.join(', ')}</Text> : null}
        </View>
      ))}
    </Section>
  );
}

export function ProjectsSection({
  projects,
  styles,
}: {
  projects: AiProfile['projects'];
  styles: PdfStyles;
}) {
  if (!projects.length) return null;
  return (
    <Section title='Key Projects' styles={styles}>
      {projects.map((project) => (
        <View key={project.id} style={styles.itemGroup} wrap={false}>
          <Text style={styles.itemTitle}>{project.name}</Text>
          {project.description ? <Text style={styles.paragraph}>{project.description}</Text> : null}
          {project.bullets.map((bullet, idx) => (
            <Bullet key={idx} styles={styles}>
              {bullet}
            </Bullet>
          ))}
          {project.stack.length ? (
            <Text style={styles.itemMeta}>Stack: {project.stack.join(', ')}</Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}

export function SkillsSection({
  skills,
  styles,
}: {
  skills: AiProfile['skills'];
  styles: PdfStyles;
}) {
  if (!skills.length) return null;

  // Group skills by category when categories exist; otherwise fall back to a flat list.
  const grouped = new Map<string, typeof skills>();
  for (const skill of skills) {
    const key = skill.category && skill.category.trim().length > 0 ? skill.category : '';
    const bucket = grouped.get(key) ?? [];
    bucket.push(skill);
    grouped.set(key, bucket);
  }

  const hasCategories = Array.from(grouped.keys()).some((key) => key.length > 0);

  return (
    <Section title='Technical Skills' styles={styles}>
      {hasCategories ? (
        Array.from(grouped.entries()).map(([category, items]) => (
          <Text key={category || 'misc'} style={styles.paragraph}>
            <Text style={styles.itemTitle}>{category || 'Other'}: </Text>
            {items.map((s) => s.name).join(', ')}
          </Text>
        ))
      ) : (
        <Text style={styles.paragraph}>
          {skills.map((s) => (s.level ? `${s.name} (${s.level})` : s.name)).join(', ')}
        </Text>
      )}
    </Section>
  );
}

export function EducationSection({
  education,
  styles,
  dateFormat = DEFAULT_CV_DATE_FORMAT,
}: {
  education: AiProfile['education'];
  styles: PdfStyles;
  dateFormat?: CvDateFormat;
}) {
  if (!education.length) return null;
  return (
    <Section title='Education' styles={styles}>
      {education.map((edu) => {
        const start = formatCvDate(edu.startDate, dateFormat);
        const end = formatCvDate(edu.endDate, dateFormat);
        const range = start && end ? `${start} -> ${end}` : (start ?? end ?? null);
        return (
          <View key={edu.id} style={styles.itemGroup} wrap={false}>
            <Text style={styles.itemTitle}>{edu.institution}</Text>
            <Text style={styles.itemMeta}>
              {[edu.degree, edu.field].filter(Boolean).join(' - ') || '[MISSING]'}
              {range ? (
                <Text style={styles.dateMeta}>
                  {' - '}
                  {range}
                </Text>
              ) : ''}
            </Text>
            {edu.summary ? <Text style={styles.paragraph}>{edu.summary}</Text> : null}
          </View>
        );
      })}
    </Section>
  );
}

export function CertificationsSection({
  certifications,
  styles,
  dateFormat = DEFAULT_CV_DATE_FORMAT,
}: {
  certifications: AiProfile['certifications'];
  styles: PdfStyles;
  dateFormat?: CvDateFormat;
}) {
  if (!certifications.length) return null;
  return (
    <Section title='Certifications' styles={styles}>
      {certifications.map((cert) => {
        const issued = formatCvDate(cert.issuedAt, dateFormat) ?? cert.issuedAt;
        return (
          <View key={cert.id} style={styles.itemGroup} wrap={false}>
            <Text style={styles.itemTitle}>{cert.name}</Text>
            <Text style={styles.itemMeta}>
              {cert.issuer ?? '[MISSING]'}
              {issued ? <Text style={styles.dateMeta}> - {issued}</Text> : ''}
            </Text>
          </View>
        );
      })}
    </Section>
  );
}

export function LanguagesSection({
  languages,
  styles,
}: {
  languages: AiProfile['languages'];
  styles: PdfStyles;
}) {
  if (!languages.length) return null;
  return (
    <Section title='Languages' styles={styles}>
      <Text style={styles.paragraph}>
        {languages.map((lang) => `${lang.name}${lang.proficiency ? ` (${lang.proficiency})` : ''}`).join(', ')}
      </Text>
    </Section>
  );
}

export function SummaryBlock({ summary, styles }: { summary: string; styles: PdfStyles }) {
  if (!summary) return null;
  return (
    <Section title='Professional Summary' styles={styles}>
      <Text style={styles.paragraph}>{summary}</Text>
    </Section>
  );
}
