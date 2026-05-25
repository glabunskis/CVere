import { z } from 'zod';

import { achievementSectionSchema } from '@/features/achievements/schemas';
import {
  accentHexSchema,
  cvDateFormatSchema,
  cvTemplateSchema,
} from '@/features/previewer/schemas';
import {
  languageProficiencySchema,
  skillLevelSchema,
} from '@/features/profile/schemas';

/**
 * Zod schemas for chat tool inputs (consumed by `streamText`'s `tools` map)
 * and the data part the route writes after a mutating turn.
 *
 * Every field carries `.describe()` metadata so the model gets a clean,
 * self-documenting JSON Schema.
 */

// =============================================================================
// Style tools
// =============================================================================

export const setTemplateInputSchema = z.object({
  template: cvTemplateSchema.describe(
    'The CV template to apply. "single-column" is the default; "two-column" splits ' +
      'sidebar content (skills, education, certifications) from the main column.',
  ),
});

export const setAccentHexInputSchema = z.object({
  hex: accentHexSchema.describe(
    'A 6-digit hex color (with leading "#"), e.g. "#0066CC". Used for the CV ' +
      'accent (headings, dividers).',
  ),
});

export const setEducationDateFormatInputSchema = z.object({
  format: cvDateFormatSchema.describe(
    'Date format used for education entries: "year" (2024), "mm_yyyy" (03/2024), ' +
      '"mon_yyyy" (Mar 2024), or "mon_d_yyyy" (Mar 5, 2024).',
  ),
});

export const setCertificationDateFormatInputSchema = z.object({
  format: cvDateFormatSchema.describe(
    'Date format used for certification entries. Same options as the education ' +
      'date format.',
  ),
});

// =============================================================================
// Content tools
// =============================================================================

export const readProfileInputSchema = z.object({});

export const rewriteSummaryInputSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      'New profile summary (1–3 sentences). English. Concrete language; never ' +
        'invent facts or metrics that the profile does not include.',
    ),
});

const experienceIdSchema = z
  .uuid()
  .describe(
    'The UUID of the target experience entry. Get this from `readProfile`; never ' +
      'invent an id.',
  );

const projectIdSchema = z
  .uuid()
  .describe(
    'The UUID of the target project entry. Get this from `readProfile`; never ' +
      'invent an id.',
  );

const bulletIndexSchema = z
  .int()
  .min(0)
  .describe('0-based bullet index within the entry. Out-of-range values fail.');

const bulletTextSchema = z
  .string()
  .min(1)
  .max(500)
  .describe(
    'Bullet text. English. Strong verb (past tense for past roles). Quantify ' +
      'only when the user provided numbers; never invent metrics. Keep under ~22 words.',
  );

const optionalBulletInsertIndexSchema = z
  .int()
  .min(0)
  .optional()
  .describe(
    'Optional 0-based insert position. Omit to append. Values past the end ' +
      'append; values before 0 are clamped.',
  );

export const editExperienceBulletInputSchema = z.object({
  experienceId: experienceIdSchema,
  index: bulletIndexSchema,
  text: bulletTextSchema,
});

export const addExperienceBulletInputSchema = z.object({
  experienceId: experienceIdSchema,
  text: bulletTextSchema,
  index: optionalBulletInsertIndexSchema,
});

export const removeExperienceBulletInputSchema = z.object({
  experienceId: experienceIdSchema,
  index: bulletIndexSchema,
});

export const editProjectBulletInputSchema = z.object({
  projectId: projectIdSchema,
  index: bulletIndexSchema,
  text: bulletTextSchema,
});

export const addProjectBulletInputSchema = z.object({
  projectId: projectIdSchema,
  text: bulletTextSchema,
  index: optionalBulletInsertIndexSchema,
});

export const removeProjectBulletInputSchema = z.object({
  projectId: projectIdSchema,
  index: bulletIndexSchema,
});

const fromIndexSchema = z
  .int()
  .min(0)
  .describe('0-based source position. Out-of-range values fail.');

const toIndexSchema = z
  .int()
  .min(0)
  .describe(
    '0-based destination position. Values past the end clamp to the last slot.',
  );

export const moveExperienceBulletInputSchema = z.object({
  experienceId: experienceIdSchema,
  fromIndex: fromIndexSchema,
  toIndex: toIndexSchema,
});

export const moveProjectBulletInputSchema = z.object({
  projectId: projectIdSchema,
  fromIndex: fromIndexSchema,
  toIndex: toIndexSchema,
});

// =============================================================================
// Experience / project entry lifecycle
// =============================================================================

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .nullable()
  .describe('ISO date (YYYY-MM-DD) or null to clear.');

const optionalIsoDateSchema = isoDateSchema.optional();

const optionalShortText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .describe(`Optional free text, at most ${max} characters. Pass null to clear.`);

const stackSchema = z
  .array(z.string().min(1).max(80))
  .max(40)
  .describe('Tech stack tags (lowercase, short). Max 40 items.');

const newEntryBulletsSchema = z
  .array(bulletTextSchema)
  .max(50)
  .describe('Optional initial bullets. Add more later via addExperienceBullet/addProjectBullet.');

export const addExperienceInputSchema = z.object({
  company: z.string().min(1).max(200).describe('Employer name. Required.'),
  role: z.string().min(1).max(200).describe('Job title. Required.'),
  location: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  isCurrent: z
    .boolean()
    .optional()
    .describe('True if this is the user\'s current role. Defaults to false.'),
  summary: optionalShortText(2000),
  bullets: newEntryBulletsSchema.optional(),
  stack: stackSchema.optional(),
});

export const editExperienceInputSchema = z.object({
  experienceId: experienceIdSchema,
  company: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(200).optional(),
  location: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  isCurrent: z.boolean().optional(),
  summary: optionalShortText(2000),
  stack: stackSchema.optional(),
});

export const removeExperienceInputSchema = z.object({
  experienceId: experienceIdSchema,
});

export const moveExperienceInputSchema = z.object({
  experienceId: experienceIdSchema,
  toIndex: toIndexSchema,
});

export const addProjectInputSchema = z.object({
  name: z.string().min(1).max(200).describe('Project name. Required.'),
  description: optionalShortText(2000),
  link: z.url().max(300).nullable().optional().describe('Optional project URL.'),
  bullets: newEntryBulletsSchema.optional(),
  stack: stackSchema.optional(),
});

export const editProjectInputSchema = z.object({
  projectId: projectIdSchema,
  name: z.string().min(1).max(200).optional(),
  description: optionalShortText(2000),
  link: z.url().max(300).nullable().optional(),
  stack: stackSchema.optional(),
});

export const removeProjectInputSchema = z.object({
  projectId: projectIdSchema,
});

export const moveProjectInputSchema = z.object({
  projectId: projectIdSchema,
  toIndex: toIndexSchema,
});

// =============================================================================
// Skill / education / certification / language CRUD
// =============================================================================

const skillIdSchema = z
  .uuid()
  .describe('The UUID of the target skill. Get this from `readProfile`; never invent an id.');

const educationIdSchema = z
  .uuid()
  .describe('The UUID of the target education entry. Get this from `readProfile`; never invent an id.');

const certificationIdSchema = z
  .uuid()
  .describe('The UUID of the target certification. Get this from `readProfile`; never invent an id.');

const languageIdSchema = z
  .uuid()
  .describe('The UUID of the target language. Get this from `readProfile`; never invent an id.');

const chatSkillLevelSchema = skillLevelSchema
  .nullable()
  .optional()
  .describe(
    'Optional skill level: "beginner", "intermediate", "advanced", or "expert". Pass null to clear.',
  );

const chatLanguageProficiencySchema = languageProficiencySchema
  .nullable()
  .optional()
  .describe(
    'Optional proficiency: "beginner", "elementary", "intermediate", "upper_intermediate", "advanced", or "native". Pass null to clear.',
  );

export const addSkillInputSchema = z.object({
  name: z.string().min(1).max(120).describe('Skill name (e.g. "PostgreSQL"). Required.'),
  category: optionalShortText(80),
  level: chatSkillLevelSchema,
});

export const editSkillInputSchema = z.object({
  skillId: skillIdSchema,
  name: z.string().min(1).max(120).optional(),
  category: optionalShortText(80),
  level: chatSkillLevelSchema,
});

export const removeSkillInputSchema = z.object({ skillId: skillIdSchema });
export const moveSkillInputSchema = z.object({
  skillId: skillIdSchema,
  toIndex: toIndexSchema,
});

export const addEducationInputSchema = z.object({
  institution: z.string().min(1).max(200).describe('School / university name. Required.'),
  degree: optionalShortText(200),
  field: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  summary: optionalShortText(2000),
});

export const editEducationInputSchema = z.object({
  educationId: educationIdSchema,
  institution: z.string().min(1).max(200).optional(),
  degree: optionalShortText(200),
  field: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  summary: optionalShortText(2000),
});

export const removeEducationInputSchema = z.object({ educationId: educationIdSchema });
export const moveEducationInputSchema = z.object({
  educationId: educationIdSchema,
  toIndex: toIndexSchema,
});

export const addCertificationInputSchema = z.object({
  name: z.string().min(1).max(200).describe('Certification title. Required.'),
  issuer: optionalShortText(200),
  issuedAt: optionalIsoDateSchema,
  expiresAt: optionalIsoDateSchema,
  link: z.url().max(300).nullable().optional().describe('Optional verification URL.'),
});

export const editCertificationInputSchema = z.object({
  certificationId: certificationIdSchema,
  name: z.string().min(1).max(200).optional(),
  issuer: optionalShortText(200),
  issuedAt: optionalIsoDateSchema,
  expiresAt: optionalIsoDateSchema,
  link: z.url().max(300).nullable().optional(),
});

export const removeCertificationInputSchema = z.object({
  certificationId: certificationIdSchema,
});
export const moveCertificationInputSchema = z.object({
  certificationId: certificationIdSchema,
  toIndex: toIndexSchema,
});

export const addLanguageInputSchema = z.object({
  name: z.string().min(1).max(120).describe('Language name (e.g. "German"). Required.'),
  proficiency: chatLanguageProficiencySchema,
});

export const editLanguageInputSchema = z.object({
  languageId: languageIdSchema,
  name: z.string().min(1).max(120).optional(),
  proficiency: chatLanguageProficiencySchema,
});

export const removeLanguageInputSchema = z.object({ languageId: languageIdSchema });
export const moveLanguageInputSchema = z.object({
  languageId: languageIdSchema,
  toIndex: toIndexSchema,
});

// =============================================================================
// Identity / contact fields
// =============================================================================

export const setFullNameInputSchema = z.object({
  fullName: z
    .string()
    .max(160)
    .nullable()
    .describe('Display name shown at the top of the CV. Pass null or empty to clear.'),
});

export const setLocationInputSchema = z.object({
  location: z
    .string()
    .max(160)
    .nullable()
    .describe('City, country, or "Remote — UTC+1". Pass null or empty to clear.'),
});

export const setPhoneInputSchema = z.object({
  phone: z
    .string()
    .max(40)
    .nullable()
    .describe('Phone number in any format. Pass null or empty to clear.'),
});

export const setContactEmailInputSchema = z.object({
  contactEmail: z
    .email()
    .max(200)
    .nullable()
    .describe('Public contact email shown on the CV. Pass null to clear.'),
});

export const setLinksInputSchema = z
  .object({
    linkedinUrl: z
      .url()
      .max(300)
      .nullable()
      .optional()
      .describe('LinkedIn profile URL. Pass null to clear; omit to leave unchanged.'),
    githubUrl: z
      .url()
      .max(300)
      .nullable()
      .optional()
      .describe('GitHub profile URL. Pass null to clear; omit to leave unchanged.'),
    websiteUrl: z
      .url()
      .max(300)
      .nullable()
      .optional()
      .describe(
        'Personal website / portfolio URL. Pass null to clear; omit to leave unchanged.',
      ),
  })
  .refine(
    (value) =>
      value.linkedinUrl !== undefined ||
      value.githubUrl !== undefined ||
      value.websiteUrl !== undefined,
    { message: 'Provide at least one of linkedinUrl, githubUrl, or websiteUrl.' },
  );

// =============================================================================
// Achievement integration
// =============================================================================

export const listPendingAchievementsInputSchema = z.object({});

export const integrateAchievementInputSchema = z.object({
  achievementId: z
    .uuid()
    .describe('UUID of the achievement to integrate. Get it from `listPendingAchievements`.'),
  targetSection: achievementSectionSchema.describe(
    'Section the achievement should land in: "summary", "experience", "project", "skill", ' +
      '"education", "certification", or "language". The user must confirm the target before you call this.',
  ),
});

export const dismissAchievementInputSchema = z.object({
  achievementId: z
    .uuid()
    .describe('UUID of the achievement to dismiss. Get it from `listPendingAchievements`.'),
});

// =============================================================================
// Vacancy reading
// =============================================================================

export const listVacanciesInputSchema = z.object({});

export const readVacancyInputSchema = z.object({
  vacancyId: z
    .uuid()
    .describe('UUID of the vacancy to read. Get it from `listVacancies`.'),
});

// =============================================================================
// Stream data parts
// =============================================================================

/**
 * Sent on the SSE stream after a mutating turn finishes, signalling the
 * client to re-sign the active preview target URL via `usePreviewStore`.
 */
export const previewDirtyDataSchema = z.object({
  cvId: z.uuid(),
  renderedAt: z.iso.datetime(),
});

export type PreviewDirtyData = z.infer<typeof previewDirtyDataSchema>;

export const previewSwitchDataSchema = z.object({
  cvId: z.uuid(),
});

export type PreviewSwitchData = z.infer<typeof previewSwitchDataSchema>;

export const sessionTitleDataSchema = z.object({
  sessionId: z.uuid(),
  title: z.string().min(1).max(80),
});

export type SessionTitleData = z.infer<typeof sessionTitleDataSchema>;

// =============================================================================
// Chat message persistence
// =============================================================================

export const chatMessageRoleSchema = z.enum(['system', 'user', 'assistant']);

export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;

/**
 * Validates the request body shape that the `useChat` hook sends to
 * `/api/chat`. We only check the message envelope here; `parts` are validated
 * by `convertToModelMessages` / the AI SDK downstream.
 */
export const chatPostBodySchema = z.object({
  sessionId: z.uuid().optional(),
  messages: z
    .array(
      z.object({
        id: z.string().min(1),
        role: chatMessageRoleSchema,
        parts: z.array(z.unknown()),
      }),
    )
    .min(1),
  context: z
    .object({
      cv: z
        .object({
          id: z.uuid(),
        })
        .nullable()
        .optional(),
      workspace: z
        .object({
          kind: z.literal('interview'),
          refId: z.uuid(),
        })
        .nullable()
        .optional(),
      recentVacancyId: z.uuid().optional(),
    })
    .optional(),
});

export type ChatPostBody = z.infer<typeof chatPostBodySchema>;
