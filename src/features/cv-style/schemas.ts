import { z } from 'zod';

export const cvTemplateSchema = z.enum(['single-column', 'two-column']);
export type CvTemplate = z.infer<typeof cvTemplateSchema>;

export const cvDateFormatSchema = z.enum(['year', 'mm_yyyy', 'mon_yyyy', 'mon_d_yyyy']);
export type CvDateFormatInput = z.infer<typeof cvDateFormatSchema>;

export const accentHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #0066CC');

export const updateCvStyleSchema = z.object({
  template: cvTemplateSchema.optional(),
  accentHex: accentHexSchema.optional(),
  educationDateFormat: cvDateFormatSchema.optional(),
  certificationDateFormat: cvDateFormatSchema.optional(),
  experienceDateFormat: cvDateFormatSchema.optional(),
});
export type UpdateCvStyleInput = z.infer<typeof updateCvStyleSchema>;

export const importTexFileSchema = z.object({
  name: z.string().min(1).max(300),
  content: z.string().max(500_000),
});
export type ImportTexFile = z.infer<typeof importTexFileSchema>;

export const importTexSchema = z.object({
  files: z.array(importTexFileSchema).min(1).max(50),
  mode: z.enum(['append', 'replace']).default('append'),
});
export type ImportTexInput = z.infer<typeof importTexSchema>;
