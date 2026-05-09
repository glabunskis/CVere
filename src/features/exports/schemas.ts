import { z } from 'zod';

export const exportPdfSchema = z.object({
  kind: z.enum(['tailored_cv', 'cover_letter']),
  id: z.string().uuid(),
});

export type ExportPdfInput = z.infer<typeof exportPdfSchema>;
