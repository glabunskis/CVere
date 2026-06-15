import { z } from 'zod';

/**
 * Per-element font size overrides (in points). Each key is optional; a missing
 * key falls back to the template default for that element. These are applied as
 * base sizes in `createStyles`, then scaled by the layout density.
 *
 * - `header`: the name/title at the top of the CV.
 * - `sectionTitle`: section headings (e.g. "Professional Experience").
 * - `body`: body text (paragraphs, bullets, contact line). Item titles and meta
 *   text derive from this so the type hierarchy stays consistent.
 */
export const fontSizesSchema = z.object({
  header: z.number().min(8).max(48).optional(),
  sectionTitle: z.number().min(6).max(36).optional(),
  body: z.number().min(6).max(24).optional(),
});

export type FontSizes = z.infer<typeof fontSizesSchema>;
