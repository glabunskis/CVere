import { z } from 'zod';

export const adviceTargetSchema = z.enum([
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certs',
  'languages',
  'global',
]);

export const adviceSeveritySchema = z.enum(['info', 'weak', 'gap']);
export const adviceStatusSchema = z.enum(['open', 'applied', 'dismissed']);

export const reviewCvSchema = z.object({
  // Optional context: tailored CV id to attach advice to
  tailoredCvId: z.string().uuid().optional(),
});

export const applyAdviceSchema = z.object({
  id: z.string().uuid(),
});

export const dismissAdviceSchema = z.object({
  id: z.string().uuid(),
});
