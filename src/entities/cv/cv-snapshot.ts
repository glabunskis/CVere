import { z } from 'zod';

import type { CvRow } from '@/entities/cv/cv-service';
import type { ProfileChildren } from '@/entities/cv/get-cv-children';
import { jsonToStringArray } from '@/shared/lib/cv-json';

import { layoutSpecSchema } from './pdf/layout-spec';

export const aiProfileSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  identity: z.object({
    fullName: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    githubUrl: z.string().nullable().optional(),
    websiteUrl: z.string().nullable().optional(),
  }),
  style: z.object({
    template: z.string(),
    accentHex: z.string(),
    educationDateFormat: z.string(),
    certificationDateFormat: z.string(),
  }),
  // Raw persisted AI layout (cv.layout_json). null means "no AI layout — use
  // the template-derived default". Included in the snapshot so undo/redo
  // reverts layout changes exactly as stored.
  layout: layoutSpecSchema.nullable().default(null),
  // Ordered, persisted list of skill category names (cv.skill_categories).
  // Grouping/order in the PDF and editor follows this list; skills whose
  // `category` is null or not in the list render under "Uncategorised".
  skillCategories: z.array(z.string()).default([]),
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

export function buildCvSnapshot(cv: CvRow, children: ProfileChildren): AiProfile {
  const parsedLayout = cv.layout_json ? layoutSpecSchema.safeParse(cv.layout_json) : null;
  return {
    id: cv.id,
    title: cv.title,
    summary: cv.summary,
    layout: parsedLayout?.success ? parsedLayout.data : null,
    skillCategories: jsonToStringArray(cv.skill_categories),
    identity: {
      fullName: cv.full_name,
      location: cv.location,
      phone: cv.phone,
      contactEmail: cv.contact_email,
      linkedinUrl: cv.linkedin_url,
      githubUrl: cv.github_url,
      websiteUrl: cv.website_url,
    },
    style: {
      template: cv.template,
      accentHex: cv.accent_hex,
      educationDateFormat: cv.education_date_format,
      certificationDateFormat: cv.certification_date_format,
    },
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
