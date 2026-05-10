import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .or(z.literal(''))
  .nullable()
  .optional()
  .transform((value) => (value === '' ? null : value));

export const summarySchema = z.object({
  summary: z.string().max(2000).nullable().optional(),
});
export type SummaryInput = z.infer<typeof summarySchema>;

export const experienceSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  company: z.string().min(1, 'Company is required').max(200),
  role: z.string().min(1, 'Role is required').max(200),
  location: z.string().max(200).nullable().optional(),
  startDate: isoDate,
  endDate: isoDate,
  isCurrent: z.boolean().default(false),
  summary: z.string().max(2000).nullable().optional(),
  bullets: z.array(z.string().max(500)).default([]),
  stack: z.array(z.string().max(80)).default([]),
});
export type ExperienceInput = z.infer<typeof experienceSchema>;

export const projectSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  link: z.string().url().or(z.literal('')).nullable().optional(),
  bullets: z.array(z.string().max(500)).default([]),
  stack: z.array(z.string().max(80)).default([]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

export const skillSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  name: z.string().min(1, 'Name is required').max(120),
  category: z.string().max(80).nullable().optional(),
  level: skillLevelSchema.nullable().optional(),
});
export type SkillInput = z.infer<typeof skillSchema>;

export const educationSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  institution: z.string().min(1, 'Institution is required').max(200),
  degree: z.string().max(200).nullable().optional(),
  field: z.string().max(200).nullable().optional(),
  startDate: isoDate,
  endDate: isoDate,
  summary: z.string().max(2000).nullable().optional(),
});
export type EducationInput = z.infer<typeof educationSchema>;

export const certificationSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  name: z.string().min(1, 'Name is required').max(200),
  issuer: z.string().max(200).nullable().optional(),
  issuedAt: isoDate,
  expiresAt: isoDate,
  link: z.string().url().or(z.literal('')).nullable().optional(),
});
export type CertificationInput = z.infer<typeof certificationSchema>;

export const languageProficiencySchema = z.enum([
  'beginner',
  'elementary',
  'intermediate',
  'upper_intermediate',
  'advanced',
  'native',
]);

export const languageSchema = z.object({
  id: z.uuid().optional(),
  position: z.number().int().min(0).default(0),
  name: z.string().min(1, 'Name is required').max(120),
  proficiency: languageProficiencySchema.nullable().optional(),
});
export type LanguageInput = z.infer<typeof languageSchema>;

export const profileSectionInputSchema = z.discriminatedUnion('section', [
  z.object({ section: z.literal('summary'), payload: summarySchema }),
  z.object({ section: z.literal('experience'), payload: experienceSchema }),
  z.object({ section: z.literal('project'), payload: projectSchema }),
  z.object({ section: z.literal('skill'), payload: skillSchema }),
  z.object({ section: z.literal('education'), payload: educationSchema }),
  z.object({ section: z.literal('certification'), payload: certificationSchema }),
  z.object({ section: z.literal('language'), payload: languageSchema }),
]);

export type ProfileSectionInput = z.infer<typeof profileSectionInputSchema>;

export const deleteProfileChildSchema = z.object({
  section: z.enum(['experience', 'project', 'skill', 'education', 'certification', 'language']),
  id: z.uuid(),
});

export type DeleteProfileChildInput = z.infer<typeof deleteProfileChildSchema>;

export type ProfileSectionKind = ProfileSectionInput['section'];
