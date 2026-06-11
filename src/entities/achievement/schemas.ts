import { z } from 'zod';

export const achievementSectionSchema = z.enum([
  'summary',
  'experience',
  'project',
  'skill',
  'education',
  'certification',
  'language',
]);

/**
 * Sections an achievement can be integrated into directly. Excludes
 * `experience` and `education`, which require structured fields (company/role,
 * institution) that a free-text achievement does not provide — integrating
 * into those would create rows with placeholder values. The agent/user adds
 * those entries manually instead.
 */
export const integrableSectionSchema = z.enum([
  'summary',
  'project',
  'skill',
  'certification',
  'language',
]);

export const achievementStatusSchema = z.enum(['pending', 'integrated', 'dismissed']);

export const addAchievementSchema = z.object({
  rawText: z.string().min(1, 'Required').max(5000),
});
export type AddAchievementInput = z.infer<typeof addAchievementSchema>;

export const integrateAchievementSchema = z.object({
  id: z.string().uuid(),
  // Optional override for the section the AI suggested. Restricted to sections
  // that don't require placeholder fields.
  targetSection: integrableSectionSchema.optional(),
});

export const dismissAchievementSchema = z.object({
  id: z.string().uuid(),
});
