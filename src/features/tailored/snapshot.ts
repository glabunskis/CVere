import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { jsonToStringArray } from '@/features/profile/utils';
import type { AiProfile } from '@/libs/ai/types';

export function buildProfileSnapshot(summary: string | null, children: ProfileChildren): AiProfile {
  return {
    summary,
    experience: children.experience.map((row) => ({
      id: row.id,
      company: row.company,
      role: row.role,
      location: row.location,
      startDate: row.start_date,
      endDate: row.end_date,
      isCurrent: row.is_current,
      summary: row.summary,
      bullets: jsonToStringArray(row.bullets),
      stack: jsonToStringArray(row.stack),
    })),
    projects: children.project.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      link: row.link,
      bullets: jsonToStringArray(row.bullets),
      stack: jsonToStringArray(row.stack),
    })),
    skills: children.skill.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      level: row.level,
    })),
    education: children.education.map((row) => ({
      id: row.id,
      institution: row.institution,
      degree: row.degree,
      field: row.field,
      startDate: row.start_date,
      endDate: row.end_date,
      summary: row.summary,
    })),
    certifications: children.certification.map((row) => ({
      id: row.id,
      name: row.name,
      issuer: row.issuer,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      link: row.link,
    })),
    languages: children.language.map((row) => ({
      id: row.id,
      name: row.name,
      proficiency: row.proficiency,
    })),
  };
}

export function slugify(input: string, fallback: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}
