import { z } from 'zod';

import { achievementSectionSchema } from '@/entities/achievement';
import { fontSizesSchema, layoutSpecSchema } from '@/entities/cv';
import {
  accentHexSchema,
  cvDateFormatSchema,
  cvTemplateSchema,
} from '@/features/cv-style';
import { languageProficiencySchema } from '@/features/profile-editor';

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

const optionalCvIdSchema = z
  .uuid()
  .optional()
  .describe(
    'Optional CV id. Omit to target the user\'s selected CV. Pass a specific id only ' +
      'when the user names a different CV explicitly.',
  );

export const setTemplateInputSchema = z.object({
  cvId: optionalCvIdSchema,
  template: cvTemplateSchema.describe(
    'The CV template to apply. "single-column" is the default; "two-column" arranges ' +
      'sections into two equal-width columns.',
  ),
});

export const setAccentHexInputSchema = z.object({
  cvId: optionalCvIdSchema,
  hex: accentHexSchema.describe(
    'A 6-digit hex color (with leading "#"), e.g. "#0066CC". Used for the CV ' +
      'accent (headings, dividers).',
  ),
});

export const setEducationDateFormatInputSchema = z.object({
  cvId: optionalCvIdSchema,
  format: cvDateFormatSchema.describe(
    'Date format used for education entries: "year" (2024), "mm_yyyy" (03/2024), ' +
      '"mon_yyyy" (Mar 2024), or "mon_d_yyyy" (Mar 5, 2024).',
  ),
});

export const setCertificationDateFormatInputSchema = z.object({
  cvId: optionalCvIdSchema,
  format: cvDateFormatSchema.describe(
    'Date format used for certification entries. Same options as the education ' +
      'date format.',
  ),
});

export const setExperienceDateFormatInputSchema = z.object({
  cvId: optionalCvIdSchema,
  format: cvDateFormatSchema.describe(
    'Date format used for experience entries. Same options as the education ' +
      'date format.',
  ),
});

export const setLayoutInputSchema = z.object({
  cvId: optionalCvIdSchema,
  layout: layoutSpecSchema.describe(
    'The layout plan. "columns": "single" stacks every section in one column top ' +
      'to bottom; "two" renders an asymmetric sidebar + main. "density": "compact" ' +
      'fits more per page (prefer it for two-column), "relaxed" adds breathing room. ' +
      '"leftRatio" (0.25–0.6, default 0.34) is the width fraction of the left column; ' +
      '~0.33 gives a narrow sidebar + wide main. "full" sections render full width ' +
      'above the columns — put long-form prose (summary) here. "left" is the narrow ' +
      'sidebar: short, scannable sections (skills, languages, education, ' +
      'certifications). "right" is the wide main: long-form sections (experience, ' +
      'projects). Each kind appears at most once across "full", "left", and "right". ' +
      'For "single", put everything in "left". Keep columns compact and roughly ' +
      'balanced in height. Valid kinds: summary, experience, projects, skills, ' +
      'education, certifications, languages. Omit sections the CV has no data for.',
  ),
});

export const resetLayoutInputSchema = z.object({
  cvId: optionalCvIdSchema,
});

export const setFontSizesInputSchema = z.object({
  cvId: optionalCvIdSchema,
  fontSizes: fontSizesSchema
    .refine((v) => v.header != null || v.sectionTitle != null || v.body != null, {
      message: 'Provide at least one of header, sectionTitle, or body.',
    })
    .describe(
      'Font sizes in points for individual CV elements. Only include the elements ' +
        'you want to change; omitted elements keep their current size. "header" is the ' +
        'name at the top (default 18, range 8–48). "sectionTitle" is section headings ' +
        'like "Professional Experience" (default 14, range 6–36). "body" is the main ' +
        'text — paragraphs, bullets, contact line (default 10, range 6–24); item titles ' +
        'and meta text scale with it. Values are scaled further by the layout density.',
    ),
});

export const resetFontSizesInputSchema = z.object({
  cvId: optionalCvIdSchema,
});

// =============================================================================
// Content tools
// =============================================================================

export const listCvsInputSchema = z.object({});

export const createCvInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe(
      'Title for the new CV. Use a short, descriptive name, e.g. the target role and ' +
        'company ("Backend Engineer at Acme") when tailoring to a vacancy.',
    ),
  sourceCvId: z
    .uuid()
    .optional()
    .describe(
      'CV to copy from. Omit to copy the user\'s currently selected CV. The new CV ' +
        'duplicates the source\'s summary, entries, identity, and style.',
    ),
  sourceVacancyId: z
    .uuid()
    .optional()
    .describe(
      'Optional vacancy id this CV targets. Pass it when creating a copy to tailor to a ' +
        'specific vacancy so the new CV is linked to that job. Get it from `listVacancies`.',
    ),
});

export const readProfileInputSchema = z.object({
  cvId: optionalCvIdSchema,
});

export const rewriteSummaryInputSchema = z.object({
  cvId: optionalCvIdSchema,
  summary: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      'New CV summary (1–3 sentences). English. Concrete language; never invent facts ' +
        'or metrics that the CV does not already include.',
    ),
});

const experienceIdSchema = z
  .uuid()
  .describe('UUID of the target experience entry. Get it from `readProfile`; never invent ids.');

const projectIdSchema = z
  .uuid()
  .describe('UUID of the target project entry. Get it from `readProfile`; never invent ids.');

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

const expectedTextSchema = z
  .string()
  .optional()
  .describe(
    'Optional expected text of the bullet before mutating. Highly recommended ' +
      'to avoid editing the wrong bullet if ordering has changed. If provided, the service ' +
      'verifies that the bullet at the index matches this exactly before executing.',
  );

export const editExperienceBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
  index: bulletIndexSchema,
  text: bulletTextSchema,
  expectedText: expectedTextSchema,
});

export const addExperienceBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
  text: bulletTextSchema,
  index: optionalBulletInsertIndexSchema,
});

export const removeExperienceBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
  index: bulletIndexSchema,
  expectedText: expectedTextSchema,
});

export const editProjectBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
  index: bulletIndexSchema,
  text: bulletTextSchema,
  expectedText: expectedTextSchema,
});

export const addProjectBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
  text: bulletTextSchema,
  index: optionalBulletInsertIndexSchema,
});

export const removeProjectBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
  index: bulletIndexSchema,
  expectedText: expectedTextSchema,
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
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
  fromIndex: fromIndexSchema,
  toIndex: toIndexSchema,
});

export const moveProjectBulletInputSchema = z.object({
  cvId: optionalCvIdSchema,
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
  cvId: optionalCvIdSchema,
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
  cvId: optionalCvIdSchema,
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
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
});

export const moveExperienceInputSchema = z.object({
  cvId: optionalCvIdSchema,
  experienceId: experienceIdSchema,
  toIndex: toIndexSchema,
});

export const addProjectInputSchema = z.object({
  cvId: optionalCvIdSchema,
  name: z.string().min(1).max(200).describe('Project name. Required.'),
  description: optionalShortText(2000),
  link: z.url().max(300).nullable().optional().describe('Optional project URL.'),
  bullets: newEntryBulletsSchema.optional(),
  stack: stackSchema.optional(),
});

export const editProjectInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
  name: z.string().min(1).max(200).optional(),
  description: optionalShortText(2000),
  link: z.url().max(300).nullable().optional(),
  stack: stackSchema.optional(),
});

export const removeProjectInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
});

export const moveProjectInputSchema = z.object({
  cvId: optionalCvIdSchema,
  projectId: projectIdSchema,
  toIndex: toIndexSchema,
});

// =============================================================================
// Skill / education / certification / language CRUD
// =============================================================================

const skillIdSchema = z
  .uuid()
  .describe('UUID of the target skill. Get it from `readProfile`; never invent ids.');

const educationIdSchema = z
  .uuid()
  .describe('UUID of the target education entry. Get it from `readProfile`; never invent ids.');

const certificationIdSchema = z
  .uuid()
  .describe('UUID of the target certification. Get it from `readProfile`; never invent ids.');

const languageIdSchema = z
  .uuid()
  .describe('UUID of the target language. Get it from `readProfile`; never invent ids.');

const chatLanguageProficiencySchema = languageProficiencySchema
  .nullable()
  .optional()
  .describe(
    'Optional proficiency: "beginner", "elementary", "intermediate", "upper_intermediate", "advanced", or "native". Pass null to clear.',
  );

export const addSkillInputSchema = z.object({
  cvId: optionalCvIdSchema,
  name: z.string().min(1).max(120).describe('Skill name (e.g. "PostgreSQL"). Required.'),
  category: optionalShortText(80),
});

export const editSkillInputSchema = z.object({
  cvId: optionalCvIdSchema,
  skillId: skillIdSchema,
  name: z.string().min(1).max(120).optional(),
  category: optionalShortText(80),
});

export const removeSkillInputSchema = z.object({ cvId: optionalCvIdSchema, skillId: skillIdSchema });
export const moveSkillInputSchema = z.object({
  cvId: optionalCvIdSchema,
  skillId: skillIdSchema,
  toIndex: toIndexSchema,
});

export const addEducationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  institution: z.string().min(1).max(200).describe('School / university name. Required.'),
  degree: optionalShortText(200),
  field: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  summary: optionalShortText(2000),
});

export const editEducationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  educationId: educationIdSchema,
  institution: z.string().min(1).max(200).optional(),
  degree: optionalShortText(200),
  field: optionalShortText(200),
  startDate: optionalIsoDateSchema,
  endDate: optionalIsoDateSchema,
  summary: optionalShortText(2000),
});

export const removeEducationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  educationId: educationIdSchema,
});
export const moveEducationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  educationId: educationIdSchema,
  toIndex: toIndexSchema,
});

export const addCertificationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  name: z.string().min(1).max(200).describe('Certification title. Required.'),
  issuer: optionalShortText(200),
  issuedAt: optionalIsoDateSchema,
  expiresAt: optionalIsoDateSchema,
  link: z.url().max(300).nullable().optional().describe('Optional verification URL.'),
});

export const editCertificationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  certificationId: certificationIdSchema,
  name: z.string().min(1).max(200).optional(),
  issuer: optionalShortText(200),
  issuedAt: optionalIsoDateSchema,
  expiresAt: optionalIsoDateSchema,
  link: z.url().max(300).nullable().optional(),
});

export const removeCertificationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  certificationId: certificationIdSchema,
});
export const moveCertificationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  certificationId: certificationIdSchema,
  toIndex: toIndexSchema,
});

export const addLanguageInputSchema = z.object({
  cvId: optionalCvIdSchema,
  name: z.string().min(1).max(120).describe('Language name (e.g. "German"). Required.'),
  proficiency: chatLanguageProficiencySchema,
});

export const editLanguageInputSchema = z.object({
  cvId: optionalCvIdSchema,
  languageId: languageIdSchema,
  name: z.string().min(1).max(120).optional(),
  proficiency: chatLanguageProficiencySchema,
});

export const removeLanguageInputSchema = z.object({
  cvId: optionalCvIdSchema,
  languageId: languageIdSchema,
});
export const moveLanguageInputSchema = z.object({
  cvId: optionalCvIdSchema,
  languageId: languageIdSchema,
  toIndex: toIndexSchema,
});

// =============================================================================
// Identity / contact fields
// =============================================================================

export const setFullNameInputSchema = z.object({
  cvId: optionalCvIdSchema,
  fullName: z
    .string()
    .max(160)
    .nullable()
    .describe('Display name shown at the top of the CV. Pass null or empty to clear.'),
});

export const setLocationInputSchema = z.object({
  cvId: optionalCvIdSchema,
  location: z
    .string()
    .max(160)
    .nullable()
    .describe('City, country, or "Remote — UTC+1". Pass null or empty to clear.'),
});

export const setPhoneInputSchema = z.object({
  cvId: optionalCvIdSchema,
  phone: z
    .string()
    .max(40)
    .nullable()
    .describe('Phone number in any format. Pass null or empty to clear.'),
});

export const setContactEmailInputSchema = z.object({
  cvId: optionalCvIdSchema,
  contactEmail: z
    .email()
    .max(200)
    .nullable()
    .describe('Public contact email shown on the CV. Pass null to clear.'),
});

export const setLinksInputSchema = z
  .object({
    cvId: optionalCvIdSchema,
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
  cvId: optionalCvIdSchema,
  achievementId: z
    .uuid()
    .describe('UUID of the achievement to integrate. Get it from `listPendingAchievements`.'),
  targetSection: z
    .enum(['summary', 'project', 'skill', 'certification', 'language'])
    .describe(
      'Section the achievement should land in: "summary", "project", "skill", "certification", or "language". ' +
        'Experience and education sections are not supported directly; instead, add those entries manually using ' +
        'addExperience or addEducation with the achievement text, then dismiss the achievement.',
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

export const previewErrorDataSchema = z.object({
  cvId: z.uuid(),
  message: z.string(),
});

export type PreviewErrorData = z.infer<typeof previewErrorDataSchema>;

/**
 * Sent on the SSE stream when a chat turn creates a new CV (e.g. a copy made
 * for vacancy tailoring). The client switches the previewer to the new CV so
 * the end-of-turn render is visible, and refreshes server-rendered CV lists.
 */
export const cvCreatedDataSchema = z.object({
  cvId: z.uuid(),
  title: z.string().min(1).max(120),
});

export type CvCreatedData = z.infer<typeof cvCreatedDataSchema>;

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
    })
    .optional(),
});

export type ChatPostBody = z.infer<typeof chatPostBodySchema>;
