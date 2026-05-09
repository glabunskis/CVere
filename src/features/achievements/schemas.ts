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

export const achievementStatusSchema = z.enum(['pending', 'integrated', 'dismissed']);

export const addAchievementSchema = z.object({
  rawText: z.string().min(1, 'Required').max(5000),
});
export type AddAchievementInput = z.infer<typeof addAchievementSchema>;

export const integrateAchievementSchema = z.object({
  id: z.string().uuid(),
  // Optional override for the section the AI suggested.
  targetSection: achievementSectionSchema.optional(),
});

export const dismissAchievementSchema = z.object({
  id: z.string().uuid(),
});
