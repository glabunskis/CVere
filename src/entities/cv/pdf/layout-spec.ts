import { z } from 'zod';

/**
 * The CV sections the layout executor can place. These map 1:1 to the section
 * components in `templates/shared.tsx`.
 */
export const LAYOUT_SECTION_KINDS = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'languages',
] as const;

export const layoutSectionKindSchema = z.enum(LAYOUT_SECTION_KINDS);
export type LayoutSectionKind = z.infer<typeof layoutSectionKindSchema>;

/**
 * A model-produced layout plan, executed deterministically by `LayoutCv`.
 *
 * - `columns`: 'single' stacks every section top-to-bottom across the full
 *   width. 'two' renders an asymmetric sidebar + main: `left` is the narrow
 *   sidebar, `right` is the wider main column.
 * - `density`: scales font sizes and spacing. 'compact' fits more per page.
 * - `leftRatio`: fraction of the content width given to the left column in a
 *   two-column layout (the right column takes the rest). ~0.34 yields a narrow
 *   sidebar + wide main; ignored for 'single'.
 * - `full`: sections rendered full width above the two columns (e.g. summary).
 *   Use for long-form prose that reads poorly in a narrow column.
 * - `left` / `right`: ordered section lists, one per column. Each section kind
 *   should appear at most once across `full`, `left`, and `right`. For
 *   'single', `full` then `left` then `right` are folded into one stack.
 */
export const layoutSpecSchema = z.object({
  columns: z.enum(['single', 'two']).default('single'),
  density: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
  leftRatio: z.number().min(0.25).max(0.6).default(0.34),
  full: z.array(layoutSectionKindSchema).default([]),
  left: z.array(layoutSectionKindSchema).default([]),
  right: z.array(layoutSectionKindSchema).default([]),
});

export type LayoutSpec = z.infer<typeof layoutSpecSchema>;
export type PdfDensity = LayoutSpec['density'];

/**
 * Default layouts used when `cv.layout_json` is null. These reproduce the old
 * SingleColumnCv / TwoColumnCv section placement so there is no separate
 * template-rendering path. `defaultLayoutForTemplate` is the single source of
 * truth for "no AI layout yet".
 */
export const DEFAULT_SINGLE_LAYOUT: LayoutSpec = {
  columns: 'single',
  density: 'normal',
  leftRatio: 0.34,
  full: [],
  left: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'languages'],
  right: [],
};

export const DEFAULT_TWO_COLUMN_LAYOUT: LayoutSpec = {
  columns: 'two',
  density: 'normal',
  leftRatio: 0.34,
  // Summary spans the full width; the narrow sidebar (left) holds short,
  // scannable sections and the wide main (right) holds long-form content.
  full: ['summary'],
  left: ['skills', 'languages', 'education', 'certifications'],
  right: ['experience', 'projects'],
};

export function defaultLayoutForTemplate(template: string | null | undefined): LayoutSpec {
  return template === 'two-column' ? DEFAULT_TWO_COLUMN_LAYOUT : DEFAULT_SINGLE_LAYOUT;
}
