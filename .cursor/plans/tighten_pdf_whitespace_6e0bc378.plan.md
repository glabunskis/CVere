---
name: Tighten PDF whitespace globally
overview: Tighten the React-PDF spacing tokens in src/pdf/theme.ts to match the compact LaTeX baseline (line-height ~1.15, smaller section/group/bullet spacing). Differentiate intra-section item spacing from inter-section spacing in src/pdf/templates/shared.tsx so density tightens uniformly without flattening visual hierarchy.
todos:
  - id: theme
    content: Tighten spacing tokens and add itemGroup in src/pdf/theme.ts
    status: completed
  - id: shared
    content: Switch item wrappers in src/pdf/templates/shared.tsx to use itemGroup
    status: completed
  - id: verify
    content: Run npm run build, regenerate master CV from previewer, compare against Examples PDFs
    status: completed
isProject: false
---

# Tighten PDF whitespace globally

## Files touched

- [src/pdf/theme.ts](src/pdf/theme.ts) - adjust spacing tokens, add `itemGroup`.
- [src/pdf/templates/shared.tsx](src/pdf/templates/shared.tsx) - use `itemGroup` for items inside a section instead of reusing `group` (which is also used between sections).

No DB, no UI, no schema, no new preference. Defaults change for everyone; existing `cv_preferences` rows keep working unchanged.

## Changes in `src/pdf/theme.ts`

Match the LaTeX example (`baselinestretch=1.1`, `titlespacing{section}{0pt}{6pt}{4pt}`, `itemsep=1pt, topsep=1pt`, collapsed `parskip`). Page margin stays at 36pt (already tighter than the LaTeX 1.5cm = ~42.5pt).

- `page.lineHeight`: `1.4` -> `1.15`
- `subtitle.marginBottom`: `12` -> `6`
- `sectionTitle.marginTop`: `14` -> `6`
- `sectionTitle.paddingBottom`: `2` -> `1`
- `itemMeta.marginBottom`: `3` -> `1`
- `paragraph.marginBottom`: `4` -> `2`
- `bulletRow.marginBottom`: `2` -> `1`
- `group.marginBottom`: `8` -> `6` (used between sections via the `Section` primitive)
- new `itemGroup.marginBottom`: `3` (used between items inside a section)
- `twoColumnRow.gap`: `16` -> `12`

## Changes in `src/pdf/templates/shared.tsx`

Today every `<View>` wrapping an item (experience, project, education, certification) uses `styles.group`, which is the same wrapper the `Section` primitive uses. That makes inter-item spacing equal inter-section spacing. Switch the per-item wrappers to the new `styles.itemGroup`:

- `ExperienceSection`: `<View key={exp.id} style={styles.group} ...>` -> `style={styles.itemGroup}`
- `ProjectsSection`: same swap on the project wrapper.
- `EducationSection`: same swap on the edu wrapper.
- `CertificationsSection`: same swap on the cert wrapper.
- `SummaryBlock`: keep `styles.group` (sits at section level under the header).

`Section` / `Bullet` / `Header` in [src/pdf/primitives.tsx](src/pdf/primitives.tsx) stay as-is.

## Verification

1. `npm run build` to catch type/build errors.
2. From the previewer, regenerate the master CV (changing template or accent triggers `renderAndUploadMasterCv` in [src/features/previewer/actions/update-cv-preferences.ts](src/features/previewer/actions/update-cv-preferences.ts)) and visually compare against `Examples/2-column.pdf` and `Examples/1-column.pdf`.
3. Re-export an existing tailored CV via [src/features/exports/actions/export-pdf.tsx](src/features/exports/actions/export-pdf.tsx) to confirm the same tightening applies.

## Out of scope (flagged for later)

- The `Section` primitive uses `wrap={false}`, which can push a long Experience section to the next page and create a large blank tail. If compactness still isn't enough after this change, the next lever is removing `wrap={false}` on Section (keep it only on individual items).
- Per-user density picker - explicitly declined.
- LaTeX backend - explicitly declined.
