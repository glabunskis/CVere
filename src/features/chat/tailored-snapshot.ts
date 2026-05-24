import { z } from 'zod';

import type { ProfileRow } from '@/features/profile/controllers/get-profile';
import type { ProfileChildren } from '@/features/profile/controllers/get-profile-children';
import type { ProfileContact } from '@/pdf/primitives';

import { type AiProfile,aiProfileSchema, buildProfileSnapshot } from './profile-snapshot';

const MAX_BULLETS = 50;
const MAX_SUMMARY_LENGTH = 2000;
const SNAPSHOT_SCHEMA_VERSION = 1;

const profileContactSchema = z.object({
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
});

const tailoredExperienceOverrideSchema = z.object({
  id: z.uuid(),
  bullets: z.array(z.string()).max(MAX_BULLETS),
  summary: z.string().max(MAX_SUMMARY_LENGTH).nullable().optional(),
});

const tailoredProjectOverrideSchema = z.object({
  id: z.uuid(),
  bullets: z.array(z.string()).max(MAX_BULLETS),
});

export const tailoredSectionsSchema = z.object({
  experience: z.array(tailoredExperienceOverrideSchema).optional(),
  projects: z.array(tailoredProjectOverrideSchema).optional(),
});

export type TailoredSections = z.infer<typeof tailoredSectionsSchema>;

export const tailoredSnapshotSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  identity: z.object({
    fullName: z.string(),
    contact: profileContactSchema,
  }),
  profile: aiProfileSchema,
});

export type TailoredSnapshot = z.infer<typeof tailoredSnapshotSchema>;

function buildSnapshotContact(profile: ProfileRow, fallbackEmail: string | null): ProfileContact {
  return {
    location: profile.location,
    phone: profile.phone,
    email: profile.contact_email ?? fallbackEmail,
    linkedinUrl: profile.linkedin_url,
    githubUrl: profile.github_url,
    websiteUrl: profile.website_url,
  };
}

export function buildTailoredSnapshot({
  profile,
  children,
  identityName,
  fallbackEmail,
}: {
  profile: ProfileRow;
  children: ProfileChildren;
  identityName: string;
  fallbackEmail: string | null;
}): TailoredSnapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    identity: {
      fullName: identityName,
      contact: buildSnapshotContact(profile, fallbackEmail),
    },
    profile: buildProfileSnapshot(profile.summary, children),
  };
}

export function readTailoredSnapshot(raw: unknown): TailoredSnapshot {
  const parsed = tailoredSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid tailored CV snapshot.');
  }
  return parsed.data;
}

export function applySectionsToSnapshot({
  snapshot,
  sections,
  summary,
}: {
  snapshot: TailoredSnapshot;
  sections: TailoredSections;
  summary: string | null;
}): AiProfile {
  const next: AiProfile = {
    ...snapshot.profile,
    experience: snapshot.profile.experience.map((item) => ({ ...item, bullets: [...item.bullets] })),
    projects: snapshot.profile.projects.map((item) => ({ ...item, bullets: [...item.bullets] })),
    skills: [...snapshot.profile.skills],
    education: [...snapshot.profile.education],
    certifications: [...snapshot.profile.certifications],
    languages: [...snapshot.profile.languages],
    summary: summary ?? snapshot.profile.summary,
  };

  for (const override of sections.experience ?? []) {
    const target = next.experience.find((item) => item.id === override.id);
    if (!target) continue;
    target.bullets = [...override.bullets];
    if (override.summary !== undefined) {
      target.summary = override.summary;
    }
  }

  for (const override of sections.projects ?? []) {
    const target = next.projects.find((item) => item.id === override.id);
    if (!target) continue;
    target.bullets = [...override.bullets];
  }

  return next;
}
