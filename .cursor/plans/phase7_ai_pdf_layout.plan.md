---
name: ""
overview: ""
todos: []
isProject: false
---

# Phase 7 — AI-generated PDF layout (execution plan)

This plan is written to be executed step by step. Do the steps in order. After each
step, run the verification listed for that step before moving on. Do not skip the
verification. Do not refactor anything not listed here.

## Goal

Let the chat model produce a structured `LayoutSpec` (section order, single vs two
columns, density) that a deterministic react-pdf executor renders. There is exactly
one rendering path: `LayoutCv`. The two hardcoded template components
(`SingleColumnCv`, `TwoColumnCv`) are deleted. The `cv.template` enum survives only as
(a) a selector for a default `LayoutSpec` and (b) a concept the AI reasons about. No new
AI endpoint is added — the existing chat agent gets two new tools (`setLayout`,
`resetLayout`).

We do NOT keep any rendering code purely to preserve already-stored CVs. A CV with
`layout_json = null` resolves to a default `LayoutSpec` derived from `cv.template`
(`defaultLayoutForTemplate`). The same helper drives the default for brand-new CVs, so
existing CVs render correctly as a side effect, not via dedicated back-compat code.

## Key facts about the codebase (read before starting)

- The CV PDF is rendered by `src/entities/cv/pdf/Cv.tsx`. Today it routes to
  `SingleColumnCv` or `TwoColumnCv` based on `cv.template`; after this phase it always
  renders `LayoutCv` and those two template components are deleted.
- Section components (`SummaryBlock`, `ExperienceSection`, `ProjectsSection`,
  `SkillsSection`, `EducationSection`, `CertificationsSection`, `LanguagesSection`)
  and `TemplateProps` live in `src/entities/cv/pdf/templates/shared.tsx`.
- Styles come from `createStyles(accent)` in `src/entities/cv/pdf/theme.ts`.
- The render pipeline is `renderAndUploadCv` in `src/entities/cv/render.tsx`. It loads
  the `cv` row, builds the snapshot, and renders `<Cv .../>`.
- Chat tools are built in `src/app/api/chat/route.ts` from `build*Tools` functions in
  `src/features/chat/tools/`. A tool only triggers an end-of-turn PDF re-render if its
  name is in `MUTATING_TOOLS` (derived from `TOOL_REGISTRY` in
  `src/features/chat/tools/tool-registry.ts`).
- Tool input Zod schemas live in `src/features/chat/schemas.ts`.
- Style mutators (`setTemplate`, `setAccentHex`, `setDateFormat`) live in
  `src/entities/cv/cv-service.ts` and are re-exported from `src/entities/cv/index.ts`.
- The Supabase generated types file is `src/shared/api/supabase/types.ts`. IMPORTANT:
  the `npm run generate-types` script writes to the WRONG path
  (`src/libs/supabase/types.ts`). Do NOT run it. Edit `src/shared/api/supabase/types.ts`
  by hand (Step 2).

## Design decisions (already made — do not change)

- New nullable column `cv.layout_json jsonb`. `null` is resolved at render time to a
  default `LayoutSpec` derived from `cv.template` via `defaultLayoutForTemplate`. There
  is no separate template-rendering code path; `LayoutCv` renders everything.
- Existing CVs are NOT special-cased. They render correctly only because the
  template-derived default reproduces their previous appearance. No code is retained
  solely to preserve stored rows. The `single-column.tsx` / `two-column.tsx` components
  are deleted in this phase.
- `LayoutSpec` is style metadata. It is NOT part of the `AiProfile` snapshot and NOT
  part of `cv_version` undo/redo content. Undo/redo will not revert layout. This is
  intentional and acceptable.
- `setLayout` and manual/chat `setTemplate` are mutually exclusive: writing a template
  clears `layout_json` (so the CV reverts to that template's default layout); writing a
  layout sets `layout_json`. Last writer wins.
- No page-length constraint. The model allocates across as many pages as needed.

## Step 1 — Create the migration for `cv.layout_json`

Create a new migration file. Pick a timestamp newer than the latest existing
migration (the newest today is `20260609130000_...`). Use filename:

`supabase/migrations/20260615120000_cv_layout_json.sql`

With contents:

```sql
-- =============================================================================
-- AI-generated PDF layout
--
-- Adds a nullable jsonb column holding a structured LayoutSpec produced by the
-- chat agent. NULL means "no AI layout" -> fall back to the cv.template enum.
-- Layout is style metadata, not part of cv_version content diffs.
-- =============================================================================

alter table cv
  add column if not exists layout_json jsonb null;
```

Do NOT run the migration here (it requires DB credentials). The column is added to the
TypeScript types manually in Step 2 so the build passes regardless.

Verification: the file exists at the path above and contains the `alter table` statement.

## Step 2 — Add `layout_json` to the generated Supabase types

Edit `src/shared/api/supabase/types.ts`. In the `cv` table definition there are three
blocks: `Row`, `Insert`, `Update` (around lines 187–261). Add a `layout_json` field to
each, keeping alphabetical-ish ordering next to the existing keys.

In `Row` (values are required, nullable):

```ts
          history_seq: number
          id: string
          is_default: boolean
          layout_json: Json | null
          linkedin_url: string | null
```

In `Insert`:

```ts
          history_seq?: number
          id?: string
          is_default?: boolean
          layout_json?: Json | null
          linkedin_url?: string | null
```

In `Update`:

```ts
          history_seq?: number
          id?: string
          is_default?: boolean
          layout_json?: Json | null
          linkedin_url?: string | null
```

`Json` is already imported/defined at the top of this file; do not add an import.

Verification: run `npx tsc --noEmit` is not required yet, but the file must still be
valid TypeScript. The full build runs in Step 9.

## Step 3 — Create the `LayoutSpec` schema

Create `src/entities/cv/pdf/layout-spec.ts`:

```ts
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
 * - `columns`: 'single' renders `main` top-to-bottom across the full width.
 *   'two' renders `sidebar` in a narrow left column and `main` in the wider
 *   right column.
 * - `density`: scales font sizes and spacing. 'compact' fits more per page.
 * - `main` / `sidebar`: ordered section lists. Each section kind should appear
 *   at most once across both arrays. For 'single', `sidebar` is ignored.
 */
export const layoutSpecSchema = z.object({
  columns: z.enum(['single', 'two']).default('single'),
  density: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
  main: z.array(layoutSectionKindSchema).min(1),
  sidebar: z.array(layoutSectionKindSchema).default([]),
});

export type LayoutSpec = z.infer<typeof layoutSpecSchema>;
export type PdfDensity = LayoutSpec['density'];
```

Verification: file compiles (checked in Step 9 build). No other code imports it yet.

### Step 3b — Default layouts derived from the template enum (amendment)

Step 3 already created `layout-spec.ts` exactly as above. Now APPEND the following to
the bottom of that same file. These are the defaults used when `cv.layout_json` is
`null`; they reproduce the old `SingleColumnCv` / `TwoColumnCv` placement so existing
CVs look unchanged, and they give brand-new CVs a sensible starting layout. This is what
lets us delete the two template components in Step 6.

```ts
/**
 * Default layouts used when `cv.layout_json` is null. These reproduce the old
 * SingleColumnCv / TwoColumnCv section placement so there is no separate
 * template-rendering path. `defaultLayoutForTemplate` is the single source of
 * truth for "no AI layout yet".
 */
export const DEFAULT_SINGLE_LAYOUT: LayoutSpec = {
  columns: 'single',
  density: 'normal',
  main: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'languages'],
  sidebar: [],
};

export const DEFAULT_TWO_COLUMN_LAYOUT: LayoutSpec = {
  columns: 'two',
  density: 'normal',
  // Narrow left column (sidebar) then wide right column (main), matching the old
  // TwoColumnCv: summary/skills/projects/certs/languages on the left, experience/
  // education on the right.
  sidebar: ['summary', 'skills', 'projects', 'certifications', 'languages'],
  main: ['experience', 'education'],
};

export function defaultLayoutForTemplate(template: string | null | undefined): LayoutSpec {
  return template === 'two-column' ? DEFAULT_TWO_COLUMN_LAYOUT : DEFAULT_SINGLE_LAYOUT;
}
```

The param is typed `string | null | undefined` on purpose, to avoid importing the
Supabase `Database` type into the pdf layer; the only meaningful value is `'two-column'`.

Verification: file compiles (checked in Step 9 build).

## Step 4 — Make `createStyles` density-aware

Edit `src/entities/cv/pdf/theme.ts`. Replace the existing `createStyles` function (and
the `PdfStyles` type just above it) with the version below. This adds an optional second
`density` parameter that scales font sizes and vertical spacing. The default is
`'normal'`, so every existing caller (`createStyles(accent)`) behaves exactly as before.

Replace this:

```ts
export type PdfStyles = ReturnType<typeof createStyles>;

export function createStyles(accent: string = DEFAULT_ACCENT) {
  return StyleSheet.create({
```

with:

```ts
export type PdfDensity = 'compact' | 'normal' | 'relaxed';

const DENSITY_SCALE: Record<PdfDensity, number> = {
  compact: 0.9,
  normal: 1,
  relaxed: 1.12,
};

export type PdfStyles = ReturnType<typeof createStyles>;

export function createStyles(accent: string = DEFAULT_ACCENT, density: PdfDensity = 'normal') {
  const scale = DENSITY_SCALE[density];
  const fs = (n: number) => Math.round(n * scale * 100) / 100;
  return StyleSheet.create({
```

Then, inside the returned object, swap the hardcoded font sizes for scaled ones. Change
ONLY the `fontSize` values that currently read `pdfTheme.type.sizes.X` to
`fs(pdfTheme.type.sizes.X)`. Concretely:

- `title.fontSize: pdfTheme.type.sizes.title` -> `fs(pdfTheme.type.sizes.title)`
- `subtitle.fontSize: pdfTheme.type.sizes.small` -> `fs(pdfTheme.type.sizes.small)`
- `headerContactText.fontSize: pdfTheme.type.sizes.small` -> `fs(...)`
- `headerContactLink.fontSize: pdfTheme.type.sizes.small` -> `fs(...)`
- `headerContactSeparator.fontSize: pdfTheme.type.sizes.small` -> `fs(...)`
- `sectionTitle.fontSize: pdfTheme.type.sizes.h1` -> `fs(pdfTheme.type.sizes.h1)`
- `itemTitle.fontSize: pdfTheme.type.sizes.h2` -> `fs(pdfTheme.type.sizes.h2)`
- `itemMeta.fontSize: pdfTheme.type.sizes.small` -> `fs(...)`
- `bulletDot.fontSize: pdfTheme.type.sizes.body` -> `fs(...)`
- `page.fontSize: pdfTheme.type.sizes.body` -> `fs(pdfTheme.type.sizes.body)`

Leave everything else (colors, margins, borders, flex props) unchanged. Do NOT touch the
`styles` constant exported at the bottom of the file (it calls `createStyles()` with the
default density, which is correct).

Verification: open the file and confirm the function signature is
`createStyles(accent: string = DEFAULT_ACCENT, density: PdfDensity = 'normal')` and that
`fs(...)` wraps the font sizes listed above. Build is checked in Step 9.

## Step 5 — Create the layout executor component

This becomes the ONLY CV renderer. Create `src/entities/cv/pdf/templates/layout-executor.tsx`:

```tsx
import { Document, Page, View } from '@react-pdf/renderer';

import type { LayoutSectionKind, LayoutSpec } from '../layout-spec';
import { Header } from '../primitives';
import { createStyles, type PdfStyles, pdfTheme } from '../theme';

import {
  applyOrder,
  CertificationsSection,
  DEFAULT_DATE_FORMATS,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SummaryBlock,
  type TemplateProps,
} from './shared';

type LayoutCvProps = TemplateProps & { layout: LayoutSpec };

export function LayoutCv({
  snapshot,
  sections,
  identityName,
  contact,
  contactLine,
  accent,
  dateFormats = DEFAULT_DATE_FORMATS,
  layout,
}: LayoutCvProps) {
  const styles = createStyles(accent, layout.density);
  const summary = sections.summary ?? snapshot.summary ?? '';
  const experiences = applyOrder(snapshot.experience ?? [], sections.experienceOrder);
  const projects = applyOrder(snapshot.projects ?? [], sections.projectsOrder);
  const skills = applyOrder(snapshot.skills ?? [], sections.skillsOrder);

  const renderSection = (kind: LayoutSectionKind) => {
    switch (kind) {
      case 'summary':
        return <SummaryBlock key='summary' summary={summary} styles={styles} />;
      case 'experience':
        return <ExperienceSection key='experience' experiences={experiences} styles={styles} />;
      case 'projects':
        return <ProjectsSection key='projects' projects={projects} styles={styles} />;
      case 'skills':
        return <SkillsSection key='skills' skills={skills} styles={styles} />;
      case 'education':
        return (
          <EducationSection
            key='education'
            education={snapshot.education ?? []}
            styles={styles}
            dateFormat={dateFormats.education}
          />
        );
      case 'certifications':
        return (
          <CertificationsSection
            key='certifications'
            certifications={snapshot.certifications ?? []}
            styles={styles}
            dateFormat={dateFormats.certification}
          />
        );
      case 'languages':
        return <LanguagesSection key='languages' languages={snapshot.languages ?? []} styles={styles} />;
      default:
        return null;
    }
  };

  // Dedupe: a section kind may appear at most once. If the model put the same
  // kind in both arrays, keep the first occurrence (sidebar wins for two-column).
  const seen = new Set<LayoutSectionKind>();
  const take = (kinds: LayoutSectionKind[]) =>
    kinds.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));

  const sidebarKinds = layout.columns === 'two' ? take(layout.sidebar) : [];
  const mainKinds = take(layout.main);

  const body =
    layout.columns === 'two' ? (
      <View style={styles.twoColumnRow}>
        <View style={styles.columnLeft}>{sidebarKinds.map(renderSection)}</View>
        <View style={styles.columnRight}>{mainKinds.map(renderSection)}</View>
      </View>
    ) : (
      mainKinds.map(renderSection)
    );

  return (
    <Document>
      <Page size={pdfTheme.page.size} style={styles.page}>
        <Header name={identityName} contact={contact} contactLine={contactLine} accent={accent} styles={styles} />
        {body}
      </Page>
    </Document>
  );
}

// Re-exported for callers that only need the styles type.
export type { PdfStyles };
```

Note: this mirrors how the old `single-column.tsx` derived `summary`, `experiences`,
`projects`, `skills` (that file is deleted in Step 6, so `LayoutCv` is the only place
this derivation now lives). The `take`/`seen` logic prevents a section appearing twice.

Verification: build is checked in Step 9. Confirm imports resolve (the section
components and `applyOrder` are exported from `./shared`; `createStyles`/`pdfTheme` from
`../theme`; `Header` from `../primitives`).

## Step 6 — Make `Cv.tsx` always render `LayoutCv`, and delete the template components

`Cv.tsx` no longer routes to two template components. It resolves the layout (explicit
`layout` prop if present, otherwise the template-derived default) and renders `LayoutCv`
unconditionally.

Replace the whole `src/entities/cv/pdf/Cv.tsx` file with:

```tsx
import type { Database } from '@/shared/api/supabase/types';

import { defaultLayoutForTemplate, type LayoutSpec } from './layout-spec';
import type { TemplateProps } from './templates/shared';
import { LayoutCv } from './templates/layout-executor';

export type CvTemplate = Database['public']['Enums']['cv_template'];

export function Cv({
  template = 'single-column',
  layout = null,
  ...props
}: TemplateProps & { template?: CvTemplate; layout?: LayoutSpec | null }) {
  const resolved = layout ?? defaultLayoutForTemplate(template);
  return <LayoutCv layout={resolved} {...props} />;
}
```

Then DELETE the two now-unused template files:

- `src/entities/cv/pdf/templates/single-column.tsx`
- `src/entities/cv/pdf/templates/two-column.tsx`

Before deleting, confirm nothing else imports them:

```bash
rg "single-column|two-column|SingleColumnCv|TwoColumnCv" src
```

The only references should be in `Cv.tsx` (which you just rewrote) and the deleted files
themselves. `cv.template` string values (`'single-column'` / `'two-column'`) still exist
in the DB enum and `setTemplate` — that is expected and fine; they now only select a
default layout. If `rg` shows any other importer of the component files, update it to go
through `Cv` / `LayoutCv` before deleting.

Verification: when `layout` is passed it wins; otherwise the template-derived default is
used, which reproduces the old per-template appearance. `rg` shows no remaining importers
of the deleted files. Build checked in Step 9.

## Step 7 — Add a `setLayout` / `clearLayout` service + wire the render path

### 7a. Service functions in `cv-service.ts`

In `src/entities/cv/cv-service.ts`, find the existing `setTemplate` function (around
line 820). Two changes:

1. Make `setTemplate` ALSO clear the layout (mutual exclusivity). Change its `.update`
   call from `{ template }` to `{ template, layout_json: null }`.

2. Add two new exported functions right after `setTemplate`:

```ts
export async function setLayout({
  userId,
  cvId,
  layoutJson,
}: {
  userId: string;
  cvId: string;
  layoutJson: unknown;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ layout_json: layoutJson as never })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to update layout');
  return data;
}

export async function clearLayout({
  userId,
  cvId,
}: {
  userId: string;
  cvId: string;
}): Promise<CvRow> {
  await getOwnedCv(userId, cvId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cv')
    .update({ layout_json: null })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to clear layout');
  return data;
}
```

`getOwnedCv` and `createSupabaseServerClient` are already used by `setTemplate` in this
file, so no new imports are needed.

`setLayout`/`clearLayout` are exported via `export * from './cv-service'` in
`src/entities/cv/index.ts` already — no index edit needed for these.

### 7b. Parse and pass `layout_json` in `render.tsx`

Edit `src/entities/cv/render.tsx`. Add an import near the other pdf imports:

```ts
import { layoutSpecSchema } from './pdf/layout-spec';
```

Inside `renderAndUploadCv`, after the `snapshot` is built and before `renderToBuffer`,
parse the column:

```ts
  const parsedLayout = cv.layout_json ? layoutSpecSchema.safeParse(cv.layout_json) : null;
  const layout = parsedLayout?.success ? parsedLayout.data : null;
```

Then pass it into `<Cv>` by adding the `layout` prop:

```tsx
    <Cv
      template={cv.template}
      layout={layout}
      snapshot={snapshot}
      sections={{}}
      identityName={identity}
      contact={contact}
      accent={cv.accent_hex || DEFAULT_ACCENT}
      dateFormats={{
        education: cv.education_date_format,
        certification: cv.certification_date_format,
      }}
    />,
```

`Cv` is imported in this file already. Passing `layout={null}` is fine: `Cv` resolves it
to `defaultLayoutForTemplate(cv.template)` (Step 6), so a missing or invalid stored
layout renders the template's default layout — nothing breaks. No `defaultLayoutForTemplate`
call is needed in `render.tsx`; keep that logic centralized in `Cv`.

Verification: build checked in Step 9.

## Step 8 — Add the `setLayout` / `resetLayout` chat tools

### 8a. Input schemas in `schemas.ts`

In `src/features/chat/schemas.ts`, add an import at the top (with the other imports):

```ts
import { layoutSpecSchema } from '@/entities/cv';
```

IMPORTANT: `layoutSpecSchema` must be exported from `src/entities/cv/index.ts`. It is
NOT yet. Add this line to `src/entities/cv/index.ts` (near the other pdf exports):

```ts
export type { LayoutSpec } from './pdf/layout-spec';
export { LAYOUT_SECTION_KINDS, layoutSpecSchema } from './pdf/layout-spec';
```

Then, in `schemas.ts`, in the "Style tools" section (after
`setCertificationDateFormatInputSchema`), add:

```ts
export const setLayoutInputSchema = z.object({
  cvId: optionalCvIdSchema,
  layout: layoutSpecSchema.describe(
    'The layout plan. "columns": "single" stacks every section in "main" top to ' +
      'bottom; "two" renders "sidebar" in a narrow left column and "main" in the wider ' +
      'right column. "density": "compact" fits more per page, "relaxed" adds breathing ' +
      'room. "main" and "sidebar" are ordered lists of section kinds; each kind appears ' +
      'at most once across both. Valid kinds: summary, experience, projects, skills, ' +
      'education, certifications, languages. Omit sections the CV has no data for.',
  ),
});

export const resetLayoutInputSchema = z.object({
  cvId: optionalCvIdSchema,
});
```

### 8b. New tool module `layout-tools.ts`

Create `src/features/chat/tools/layout-tools.ts`:

```ts
import { tool } from 'ai';

import { clearLayout, setLayout } from '@/entities/cv';
import { logger } from '@/shared/lib/logger';
import type { User } from '@supabase/supabase-js';

import { resetLayoutInputSchema, setLayoutInputSchema } from '../schemas';

import type { ActiveCvRef } from './active-cv';

import 'server-only';

/**
 * Layout tools: the model emits a structured LayoutSpec which is persisted to
 * cv.layout_json and rendered by the deterministic executor. Tools never render
 * the PDF — the route does that once per assistant turn.
 */
export function buildLayoutTools(user: User, activeCv: ActiveCvRef) {
  return {
    setLayout: tool({
      description:
        'Set an AI-designed page layout for the CV: section order, single vs two ' +
        'columns, and density. Use when the user asks to lay out, restructure, make ' +
        'denser, or make multi-column. Reason about good CV layout from the content ' +
        'volume. This overrides any manual template choice. Omit cvId for the selected CV.',
      inputSchema: setLayoutInputSchema,
      execute: async ({ cvId, layout }) => {
        const targetCvId = cvId ?? activeCv.current;
        await setLayout({ userId: user.id, cvId: targetCvId, layoutJson: layout });
        logger.info({ userId: user.id, columns: layout.columns, density: layout.density }, 'chat-tool setLayout');
        return `Applied a ${layout.columns}-column ${layout.density} layout.`;
      },
    }),

    resetLayout: tool({
      description:
        'Remove the AI layout and revert the CV to its standard template (single-column ' +
        'or two-column). Use when the user wants the default layout back. Omit cvId for ' +
        'the selected CV.',
      inputSchema: resetLayoutInputSchema,
      execute: async ({ cvId }) => {
        const targetCvId = cvId ?? activeCv.current;
        await clearLayout({ userId: user.id, cvId: targetCvId });
        logger.info({ userId: user.id }, 'chat-tool resetLayout');
        return 'Reset to the standard template layout.';
      },
    }),
  } as const;
}

export const LAYOUT_TOOL_NAMES = ['setLayout', 'resetLayout'] as const;
```

### 8c. Export from the chat feature barrel

In `src/features/chat/index.ts`, add (next to the other `build*Tools` exports):

```ts
export { buildLayoutTools, LAYOUT_TOOL_NAMES } from './tools/layout-tools';
```

### 8d. Register the tools as mutating

In `src/features/chat/tools/tool-registry.ts`, add two entries to the `TOOL_REGISTRY`
array (put them in the `// Style` group at the end):

```ts
  { name: 'setLayout', mutates: true, label: 'Set layout' },
  { name: 'resetLayout', mutates: true, label: 'Reset layout' },
```

Because `MUTATING_TOOLS` is derived from `TOOL_REGISTRY`, this is what makes
`setLayout`/`resetLayout` trigger the end-of-turn PDF re-render. No other change is
needed for re-rendering.

### 8e. Wire the tools into the route

In `src/app/api/chat/route.ts`:

1. Add `buildLayoutTools` to the import from `@/features/chat` (the big import block
   that already lists `buildStyleTools`, `buildVacancyTools`, etc.).

2. In the `tools` object inside `createUIMessageStream`'s `execute`, add the spread:

```ts
        ...buildStyleTools(user, activeCvRef),
        ...buildLayoutTools(user, activeCvRef),
```

(Place it right after the `buildStyleTools` spread.)

Verification: build checked in Step 9. The route already marks dirty CVs and re-renders
based on `MUTATING_TOOLS`, so no render wiring is needed here.

## Step 9 — System prompt: describe the layout tools

Edit `src/features/chat/system-prompt.ts`. In the "Tool groups you have available"
list, change the `Style:` line to also mention layout, and add a new dedicated section.

Change:

```
- Style: setTemplate, setAccentHex, setEducationDateFormat,
  setCertificationDateFormat.
```

to:

```
- Style: setTemplate, setAccentHex, setEducationDateFormat,
  setCertificationDateFormat.
- Layout: setLayout (AI-designed page layout), resetLayout (back to the
  standard template).
```

Then add this block right before the final "If the user is vague" paragraph:

```
AI page layout (setLayout / resetLayout):
- Use setLayout when the user asks to lay the CV out better, reorder sections,
  use one or two columns, or make it denser or roomier. Emit a complete
  LayoutSpec: columns ("single" or "two"), density ("compact", "normal", or
  "relaxed"), and ordered "main"/"sidebar" section lists.
- Allocation heuristics: lead with summary, then the highest-signal sections
  for the target role (usually experience, then projects/skills). For a
  two-column layout, put short, scannable sections (skills, education,
  certifications, languages) in the sidebar and long-form sections (experience,
  projects, summary) in main. Only include sections the CV actually has data
  for; call readProfile first if unsure what exists.
- setLayout overrides the manual template, and setTemplate clears any AI layout.
  They are mutually exclusive — pick one based on the user's intent.
- Use resetLayout to drop the AI layout and return to the standard template.
- Never invent content while laying out; layout only reorders and reshapes
  existing sections.
```

Verification: the prompt now lists `setLayout`/`resetLayout` and the section
descriptions match the registered tools exactly.

## Step 10 — Build and verify

Run the full build:

```bash
npm run build
```

Fix any type errors it surfaces. Common things to check if it fails:

- `layout_json` missing from `src/shared/api/supabase/types.ts` (Step 2).
- `layoutSpecSchema` / `LayoutSpec` not exported from `src/entities/cv/index.ts`
  (Step 8a).
- `createStyles` density param typo in `theme.ts` (Step 4).
- Tool not wired in `route.ts` import + spread (Step 8e).

If the build trips on stale `.next/dev` route artifacts, delete the `.next/` directory
and rebuild.

## Step 11 — Apply the migration (requires DB access)

When DB credentials are available, apply the migration. Per project convention this is:

```bash
npm run migration:up
```

WARNING: `migration:up` also runs `generate-types`, which writes to the WRONG path
(`src/libs/supabase/types.ts`, see package.json). After running it, verify
`src/shared/api/supabase/types.ts` still contains the `layout_json` field from Step 2
(it should be untouched, since `generate-types` writes elsewhere). If a stray
`src/libs/supabase/types.ts` is created, delete it — it is not the file the app uses.

If you cannot run migrations, leave the migration file in place for the user to apply
and note that the column does not exist in the live DB yet (the app still builds because
the column is in the TS types from Step 2; runtime `setLayout` will fail until the
column exists).

## Done when

- In a chat session, asking "lay this CV out in two columns" or "make it denser"
  produces a `setLayout` tool call (visible as a tool card), the PDF re-renders with the
  new allocation, and the preview updates.
- Asking "go back to the normal template" calls `resetLayout`, which clears
  `layout_json`; the CV then renders via the template-derived default layout
  (`defaultLayoutForTemplate(cv.template)`).
- `single-column.tsx` and `two-column.tsx` are deleted; `LayoutCv` is the only renderer.
- CVs with `layout_json = null` (existing or new) render via the template-derived
  default, which reproduces the old per-template appearance.
- `npm run build` passes.

## Out of scope (do not do)

- No measured/pre-computed text height (react-pdf is flexbox-only; allocation stays
  heuristic). Escalation to headless-chrome HTML rendering is deferred.
- Do NOT add layout to the `AiProfile` snapshot or `cv_version` diffs. Undo/redo not
  reverting layout is intentional.
- Do NOT add any new AI endpoint or safe-action. The chat agent is the only AI surface.
- Do NOT add a manual layout UI; this phase is chat-driven only.

## Handover notes

### 2026-06-14 — Step 1

**Step run:** Step 1 — Create the migration for `cv.layout_json`

**Files changed:**
- `supabase/migrations/20260615120000_cv_layout_json.sql` — created (new file)

**Deviations:** None. File contents match the plan exactly.

**Verification:** File exists at the specified path and contains the `alter table cv add column if not exists layout_json jsonb null;` statement. Migration has not been applied to the DB (requires credentials; Step 11 handles that).

**Next step needs to know:** Step 2 must edit `src/shared/api/supabase/types.ts` by hand to add `layout_json: Json | null` to the `cv` table's `Row`, `Insert`, and `Update` blocks. Do NOT run `npm run generate-types`.

### 2026-06-14 — Step 2

**Step run:** Step 2 — Add `layout_json` to the generated Supabase types

**Files changed:**
- `src/shared/api/supabase/types.ts` — added `layout_json: Json | null` to `Row` (line 198), `layout_json?: Json | null` to `Insert` (line 224), and `layout_json?: Json | null` to `Update` (line 250), all within the `cv` table definition, between `is_default` and `linkedin_url`.

**Deviations:** None. Fields added exactly as specified in the plan. `Json` type was already defined in the file; no new imports added.

**Verification:** `grep layout_json src/shared/api/supabase/types.ts` returns three hits at lines 198, 224, 250 — one per block. File is valid TypeScript (full build deferred to Step 9).

**Next step needs to know:** Step 3 creates `src/entities/cv/pdf/layout-spec.ts` with the `LayoutSpec` Zod schema. No prior state needed from Steps 1–2 beyond what the plan already describes.


### 2026-06-15 — Step 3

**Step run:** Step 3 — Create the `LayoutSpec` schema

**Files changed:**
- `src/entities/cv/pdf/layout-spec.ts` — created (new file)
- `.cursor/plans/phase7_ai_pdf_layout.plan.md` — appended this handover note

**Deviations:** None. File contents match the plan exactly.

**Verification:** `ReadLints` reports no linter errors for `src/entities/cv/pdf/layout-spec.ts`. `rg layoutSpecSchema|LayoutSpec|layout-spec src` only finds the new schema file, so no other code imports it yet. Full compile/build remains deferred to Step 9 as written.

**Next step needs to know:** Step 4 should make `createStyles` density-aware in `src/entities/cv/pdf/theme.ts`. `layout-spec.ts` is not exported from `src/entities/cv/index.ts` yet; that is intentionally deferred until Step 8.

### 2026-06-15 — Step 3b

**Step run:** Step 3b — Default layouts derived from the template enum (amendment)

**Files changed:**
- `src/entities/cv/pdf/layout-spec.ts` — appended `DEFAULT_SINGLE_LAYOUT`, `DEFAULT_TWO_COLUMN_LAYOUT`, and `defaultLayoutForTemplate(template)` to the bottom of the existing file.
- `.cursor/plans/phase7_ai_pdf_layout.plan.md` — appended this handover note.

**Deviations:** None. Code appended verbatim from the plan.

**Verification:** `ReadLints` reports no linter errors for `src/entities/cv/pdf/layout-spec.ts`. The two default-layout consts type-check against `LayoutSpec` (TS would flag a mismatch). Full compile/build remains deferred to Step 9 as written.

**Next step needs to know:** `defaultLayoutForTemplate` is now available but not yet imported anywhere. Step 4 makes `createStyles` density-aware in `src/entities/cv/pdf/theme.ts`. `layout-spec.ts` is still not exported from `src/entities/cv/index.ts`; that export is deferred until Step 8.

### 2026-06-15 — Step 4

**Step run:** Step 4 — Make `createStyles` density-aware

**Files changed:**
- `src/entities/cv/pdf/theme.ts` — added `PdfDensity` type, `DENSITY_SCALE` constant, updated `createStyles` signature to `(accent: string = DEFAULT_ACCENT, density: PdfDensity = 'normal')`, added `scale`/`fs` helpers inside the function body, and wrapped all 10 listed `fontSize` values with `fs(...)`: `page`, `title`, `subtitle`, `headerContactText`, `headerContactLink`, `headerContactSeparator`, `sectionTitle`, `itemTitle`, `itemMeta`, `bulletDot`.

**Deviations:** None. Changes match the plan exactly.

**Verification:** `ReadLints` reports no linter errors for `src/entities/cv/pdf/theme.ts`. Function signature is `createStyles(accent: string = DEFAULT_ACCENT, density: PdfDensity = 'normal')`. All 10 font sizes are wrapped with `fs(...)`. The `styles = createStyles()` export at the bottom is untouched (calls with default density, correct). Full build deferred to Step 9/10 as written.

**Next step needs to know:** Step 5 creates `src/entities/cv/pdf/templates/layout-executor.tsx` — the new `LayoutCv` component that calls `createStyles(accent, layout.density)`. The `density` parameter is now ready to receive `layout.density` from the `LayoutSpec`.

### 2026-06-15 — Step 5

**Step run:** Step 5 — Create the layout executor component

**Files changed:**
- `src/entities/cv/pdf/templates/layout-executor.tsx` — created (new file). Contains `LayoutCv` component and re-exports `PdfStyles`. Matches plan verbatim.

**Deviations:** None. All imports confirmed before writing:
- `Header` exported from `../primitives` ✓
- `createStyles`, `PdfStyles`, `pdfTheme` exported from `../theme` ✓
- `applyOrder`, `CertificationsSection`, `DEFAULT_DATE_FORMATS`, `EducationSection`, `ExperienceSection`, `LanguagesSection`, `ProjectsSection`, `SkillsSection`, `SummaryBlock`, `TemplateProps` exported from `./shared` ✓
- `twoColumnRow`, `columnLeft`, `columnRight` styles already present in `createStyles` in `theme.ts` ✓

**Verification:** `ReadLints` reports no linter errors for the new file. Full build deferred to Step 9/10 as written.

**Next step needs to know:** Step 6 replaces `src/entities/cv/pdf/Cv.tsx` to always render `LayoutCv` (imported from `./templates/layout-executor`), then deletes `single-column.tsx` and `two-column.tsx`. Before deleting, run `rg "single-column|two-column|SingleColumnCv|TwoColumnCv" src` to confirm no other importers remain.

### 2026-06-15 — Step 6

**Step run:** Step 6 — Make `Cv.tsx` always render `LayoutCv`, and delete the template components

**Files changed:**
- `src/entities/cv/pdf/Cv.tsx` — replaced in full. Now imports `defaultLayoutForTemplate` and `LayoutSpec` from `./layout-spec` and `LayoutCv` from `./templates/layout-executor`. Resolves layout via `layout ?? defaultLayoutForTemplate(template)` and renders `<LayoutCv layout={resolved} {...props} />`. Old routing to `SingleColumnCv`/`TwoColumnCv` removed.
- `src/entities/cv/pdf/templates/single-column.tsx` — deleted.
- `src/entities/cv/pdf/templates/two-column.tsx` — deleted.

**Deviations:** None. File content matches the plan verbatim.

**Verification:** `rg "SingleColumnCv|TwoColumnCv" src` returns only two comment lines in `layout-spec.ts` — no remaining code imports of the deleted files. `ReadLints` reports no linter errors on the new `Cv.tsx`. Build deferred to Step 9/10 as written.

**Next step needs to know:** Step 7 adds `setLayout`/`clearLayout` service functions to `src/entities/cv/cv-service.ts` (including making `setTemplate` clear `layout_json`), then edits `src/entities/cv/render.tsx` to parse `cv.layout_json` and pass a `layout` prop to `<Cv>`. No additional state from this step is needed beyond what the plan describes.

### 2026-06-15 — Step 7

**Step run:** Step 7 — Add a `setLayout` / `clearLayout` service + wire the render path

**Files changed:**
- `src/entities/cv/cv-service.ts` — (7a) changed `setTemplate`'s `.update({ template })` to `.update({ template, layout_json: null })` for mutual exclusivity; added `setLayout` and `clearLayout` exported functions directly after `setTemplate` (lines 842–882). No new imports needed — `CvRow`, `getOwnedCv`, and `createSupabaseServerClient` were already present.
- `src/entities/cv/render.tsx` — (7b) added `import { layoutSpecSchema } from './pdf/layout-spec'`; added `parsedLayout`/`layout` derivation after `buildCvSnapshot`; passed `layout={layout}` prop to `<Cv>`.

**Deviations:** None. Both files match the plan verbatim.

**Verification:** `ReadLints` reports no linter errors on either changed file. `CvRow` is exported from `cv-service.ts` at line 7; `getOwnedCv` and `createSupabaseServerClient` confirmed present. Build is deferred to Step 9/10 as written.

**Next step needs to know:** Step 8 adds `setLayoutInputSchema`/`resetLayoutInputSchema` to `src/features/chat/schemas.ts`, exports `layoutSpecSchema`/`LayoutSpec` from `src/entities/cv/index.ts`, creates `src/features/chat/tools/layout-tools.ts`, exports from `src/features/chat/index.ts`, registers the tools as mutating in `tool-registry.ts`, and wires `buildLayoutTools` into `src/app/api/chat/route.ts`.

### 2026-06-15 — Step 8

**Step run:** Step 8 — Add the `setLayout` / `resetLayout` chat tools

**Files changed:**
- `src/entities/cv/index.ts` — added `export type { LayoutSpec } from './pdf/layout-spec'` and `export { LAYOUT_SECTION_KINDS, layoutSpecSchema } from './pdf/layout-spec'` (8a prerequisite).
- `src/features/chat/schemas.ts` — added `import { layoutSpecSchema } from '@/entities/cv'` at the top; added `setLayoutInputSchema` and `resetLayoutInputSchema` after `setCertificationDateFormatInputSchema` (8a).
- `src/features/chat/tools/layout-tools.ts` — created (new file); exports `buildLayoutTools` and `LAYOUT_TOOL_NAMES` (8b).
- `src/features/chat/index.ts` — added `export { buildLayoutTools, LAYOUT_TOOL_NAMES } from './tools/layout-tools'` next to the other `build*Tools` exports (8c).
- `src/features/chat/tools/tool-registry.ts` — appended `setLayout` and `resetLayout` entries (both `mutates: true`) to the Style group at the end of `TOOL_REGISTRY` (8d).
- `src/app/api/chat/route.ts` — added `buildLayoutTools` to the import from `@/features/chat`; added `...buildLayoutTools(user, activeCvRef)` spread immediately after `...buildStyleTools(user, activeCvRef)` inside the `tools` object (8e).

**Deviations:** None. All code matches the plan verbatim.

**Verification:** `ReadLints` reports no linter errors on any of the six changed files. Build is deferred to Step 9/10 as written.

**Next step needs to know:** Step 9 edits `src/features/chat/system-prompt.ts` to list `setLayout`/`resetLayout` in the tool groups and add the AI page layout guidance block. Step 10 runs the full build.

### 2026-06-15 — Step 9

**Step run:** Step 9 — System prompt: describe the layout tools

**Files changed:**
- `src/features/chat/system-prompt.ts` — (1) added `- Layout: setLayout (AI-designed page layout), resetLayout (back to the standard template).` as a new bullet after the `Style:` line in the "Tool groups you have available" section; (2) added the full "AI page layout (setLayout / resetLayout):" guidance block (5 bullets) immediately before the final "If the user is vague" paragraph.

**Deviations:** None. Both edits match the plan verbatim.

**Verification:** `ReadLints` reports no linter errors. The prompt now lists `setLayout`/`resetLayout` in the tool groups and the guidance block descriptions match the registered tools exactly.

**Next step needs to know:** Step 10 runs `npm run build` and treats the phase as done only when the build is green. If the build fails, consult the failure checklist in the plan (missing `layout_json` in types, missing `layoutSpecSchema` export, `createStyles` signature typo, or missing tool wiring in `route.ts`). If `.next/` has stale artifacts, delete it before rebuilding.

### 2026-06-15 — Step 10

**Step run:** Step 10 — Build and verify

**Files changed:** None (build-only step).

**Deviations:** Initial `npm run build` reported "Another next build process is already running" — a stale lock, not a live build (no Next build process was running; only Cursor helper node processes). Per the plan's stale-artifact guidance, deleted `.next/` and rebuilt.

**Verification:** `npm run build` exits 0. "Compiled successfully", "Finished TypeScript" with no type errors, all 13 routes generated. Phase build gate is green.

**Next step needs to know:** Step 11 applies the migration to the linked Supabase project. `generate-types` (chained after `migration up`) writes to the wrong path and will fail harmlessly; verify `src/shared/api/supabase/types.ts` keeps its hand-added `layout_json` fields and that no stray `src/libs/supabase/types.ts` is created.

### 2026-06-15 — Step 11

**Step run:** Step 11 — Apply the migration

**Files changed:** None.

**Deviations:** The remote `supabase_migrations.schema_migrations` table already lists version `20260615120000`, and `supabase migration up --linked` reported "Local database is up to date" — the `layout_json` column is already present on the remote DB, so there was nothing new to apply. The chained `generate-types` failed with "The system cannot find the path specified" because its target dir `src/libs/supabase/` does not exist (the wrong-path behavior the plan warned about). This is harmless: no file was written, so nothing was overwritten.

**Verification:** `src/shared/api/supabase/types.ts` still has `layout_json` in `Row`/`Insert`/`Update` (lines 198/224/250). No stray `src/libs/supabase/types.ts` and no `src/libs` directory were created. Remote migration version `20260615120000` confirmed recorded.

**Phase status:** Complete. All 11 steps done; build green; `layout_json` column live; `setLayout`/`resetLayout` tools wired. See the assessment notes below for follow-up improvements (not part of this phase's scope).

### 2026-06-15 — Step 10

**Step run:** Step 10 — Build and verify

**Files changed:** None.

**Deviations:** None.

**Verification:** `npm run build` exits 0. Output: "Compiled successfully in 3.5s", "Finished TypeScript", all 13 static pages generated, all routes (incl. `/api/chat`) built. No type errors. No stale `.next/` artifacts.

**Next step needs to know:** Step 11 applies the migration to the linked remote DB via `npm run migration:up`.

### 2026-06-15 — Step 11

**Step run:** Step 11 — Apply the migration (requires DB access)

**Files changed:** None in the repo. Remote DB altered: `cv.layout_json jsonb null` column added; migration `20260615120000` recorded in `supabase_migrations.schema_migrations`.

**Deviations:** Initial `npm run migration:up` failed with ENOENT because the shell cwd had drifted to the `terminals` folder; re-ran with the project root as the working directory and it applied cleanly ("Applying migration 20260615120000_cv_layout_json.sql...", "INSERT 0 1"). As the plan warned, the chained `generate-types` step failed ("The system cannot find the path specified") because the wrong target dir `src/libs/supabase/` does not exist — this is expected and harmless: no stray file was created.

**Verification:** Migration row present in `schema_migrations`. `Glob src/libs/**` returns 0 files (no stray types file). `src/shared/api/supabase/types.ts` still has `layout_json` at lines 198/224/250. The column now exists in the live DB, so `setLayout` works at runtime.

**Phase status:** COMPLETE. All "Done when" criteria met except live chat smoke-test, which requires a running session.