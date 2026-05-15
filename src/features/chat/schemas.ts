import { z } from 'zod';

import {
  accentHexSchema,
  cvDateFormatSchema,
  cvTemplateSchema,
} from '@/features/previewer/schemas';

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

// =============================================================================
// Stream data parts
// =============================================================================

/**
 * Sent on the SSE stream after a mutating turn finishes, signalling the
 * client to re-sign the master CV preview URL via `usePreviewStore`.
 */
export const previewDirtyDataSchema = z.object({
  renderedAt: z.iso.datetime(),
});

export type PreviewDirtyData = z.infer<typeof previewDirtyDataSchema>;

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
  messages: z
    .array(
      z.object({
        id: z.string().min(1),
        role: chatMessageRoleSchema,
        parts: z.array(z.unknown()),
      }),
    )
    .min(1),
});

export type ChatPostBody = z.infer<typeof chatPostBodySchema>;
