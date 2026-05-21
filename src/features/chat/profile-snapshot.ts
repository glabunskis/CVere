import { z } from 'zod';

import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';
import { jsonToStringArray } from '@/features/profile/utils';

export const aiProfileSchema = z.object({
  summary: z.string().nullable().optional(),
  experience: z
    .array(
      z.object({
        id: z.uuid(),
        company: z.string(),
        role: z.string(),
        location: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        summary: z.string().nullable().optional(),
        bullets: z.array(z.string()).default([]),
        stack: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        description: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
        bullets: z.array(z.string()).default([]),
        stack: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        category: z.string().nullable().optional(),
        level: z.string().nullable().optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        id: z.uuid(),
        institution: z.string(),
        degree: z.string().nullable().optional(),
        field: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        issuer: z.string().nullable().optional(),
        issuedAt: z.string().nullable().optional(),
        expiresAt: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
      }),
    )
    .default([]),
  languages: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        proficiency: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export type AiProfile = z.infer<typeof aiProfileSchema>;

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
