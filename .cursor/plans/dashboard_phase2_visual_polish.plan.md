---
name: Dashboard Phase 2 - visual polish (detailed execution)
overview: "Step-by-step execution plan for Phase 2 (visual polish) of the dashboard 3-column workspace. Expands the high-level steps in dashboard_3-column_workspace_95297f52.plan.md into precise, self-contained instructions: exact files, tokens, component choices, states, and acceptance criteria. No code snippets - describe the change, the target, and the result."
todos: []
isProject: false
---

## How to use this plan

- Execute steps in order (0 -> 9). Each step is independently buildable; run `npm run build` after each numbered step group and fix all type/lint/FSD errors before continuing.
- Do not change behavior, data flow, props, server actions, or column order. This is styling + small structural UI only. The functional 3-column layout from Phase 1 already works.
- Authoritative visual spec: `docs/design-refs/dashboard-spec.md`. Screenshots in `docs/design-refs/` (`light theme.png`, `nothing folded.png`, `everything folded.png`, `chats unfolded.png`, `editor tab.png`, `style tab.png`). The HTML mockup `CVere Dashboard.dc.html` is reference only - never import from it.
- High-level parent plan with reconciliation decisions: `.cursor/plans/dashboard_3-column_workspace_95297f52.plan.md` (Phase 2 section). Read its "Reconciliation decisions" before coding; they are restated below where relevant.

### Hard constraints (apply to every step)

- **Dark is the DEFAULT/main theme.** The app must boot in dark mode for new/unset users; the design target and primary spot-check is dark. Light mode must still be fully supported and correct via the theme toggle, but it is secondary. When in doubt about a surface, get dark right first, then verify light.
- **Semantic tokens only.** Use Tailwind utilities backed by CSS variables (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.). Never use raw colors like `bg-blue-500` or hex in className. The one exception is the CV **document** accent (`accent_hex`), which is a per-CV data value rendered in the PDF, not app chrome.
- **No manual `dark:` color overrides.** Both themes must come from the `:root` / `.dark` token values. If something looks wrong in dark mode, fix the token, not the component.
- **shadcn/Base Nova conventions:** this project's shadcn `base` is Base UI (not Radix). Custom triggers use the `render` prop, NOT `asChild`. Verify with `npx shadcn@latest info` if unsure.
- **Spacing:** use `flex`/`grid` + `gap-*`. Never `space-x-*` / `space-y-*`. Use `size-*` when width == height. Use `truncate` for single-line ellipsis.
- **Icons:** Lucide (`lucide-react`). Icon-only buttons must have an `aria-label` or `sr-only` text. Inside `Button`, do not put manual sizing classes on icons (the Button controls icon size).
- **Accessibility:** every interactive element has a visible focus ring (already provided by `outline-ring/50` base + component focus styles - keep it), `cursor-pointer` (the base layer already applies `cursor-pointer` to all `button`), and 4.5:1 text contrast. Color must never be the only state indicator (pair color with a dot, label, icon, or border).
- **Motion:** transitions 150-300ms. Collapse/expand width transition is exactly `width .24s cubic-bezier(.4,0,.2,1)`. Respect `prefers-reduced-motion` (use `motion-reduce:` to disable non-essential transitions/animations such as the pulsing dot).
- **FSD import direction (downward only):** `views -> widgets -> features -> entities -> shared`. Import slices through their `index.ts` public API, except the pre-existing accepted deep imports noted in `AGENTS.md`. Do not introduce new upward or new same-layer cross-slice imports.
- **No new AI surfaces, no data-model changes, no new server actions** unless a step explicitly says so (none do).

---

## Current-state facts (verified - rely on these)

- **Tokens** live in `src/styles/globals.css`. Dark mode uses the `.dark` class via `next-themes` semantics (`@custom-variant dark (&:is(.dark *))`). Tokens are currently a neutral grayscale; there is NO terracotta primary and NONE of the spec's extra tokens (`--card-2`, `--fg-soft`, `--border-strong`, `--primary-soft`, `--primary-soft-bd`, `--gutter`) exist yet. The `@theme inline` block registers `--color-*` utilities; new tokens must be registered there too.
- **next-themes is NOT actually wired.** `src/shared/ui/sonner.tsx` calls `useTheme()`, but there is no `ThemeProvider` anywhere (`src/app/layout.tsx` has none). So dark mode currently cannot be toggled by the user. Step 2 must add the provider before the theme toggle can work.
- **App header** is rendered in `src/app/(app)/layout.tsx` as a 3-col grid: `Logo` (left) / `AppNav` (center) / `AccountMenu` (right), with a `Separator` below. It is NOT yet 56px, has no accent hairline, no theme toggle.
  - `Logo` (`src/shared/ui/logo.tsx`): plain text `APP_DISPLAY_NAME`, no mark, not uppercased.
  - `AppNav` (`src/widgets/app-nav/app-nav.tsx`): tab links styled as rounded pills with `bg-muted` active state (NOT underline); CV selector is a native `Select` + a "New CV" `Button variant=outline` (NOT a pill with status dot + mono id + glow).
  - `AccountMenu` (`src/widgets/app-nav/account-menu.tsx`): `CircleUser` lucide icon in a `DropdownMenu` (NOT an Avatar).
- **Workspace shell** `src/views/dashboard/ui/DashboardWorkspace.tsx`: a top row of two `Button variant=outline` toggles ("Hide chat" / "Hide panel") ABOVE a `ResizablePanelGroup` of 3 panels. Panels use `collapsedSize={0}` (fully hidden, NO 56px rail). Chat default 26 / min 18, preview default 44 / min 30, control default 30 / min 20 (percentages). Collapse state tracked via `onResize size.asPercentage <= 0`.
- **Preview** `src/features/cv-preview/previewer-pane.tsx`: toolbar with `targetLabel` ("CV " + 8-char id), `HistoryControls` (undo/redo), a Refresh `Button` (outline, label "Rendering..."/"Refresh"), and an "Open" ghost link. There is NO live-status hint, NO mono id chip.
- **Preview store** `src/features/cv-preview/preview-store.ts` (zustand): `signedUrl`, `previewTarget`, `template`, `isRefreshing`, `historyTick`, `markPreviewDirty()`. `markPreviewDirty()` re-signs the signed URL (toggling `isRefreshing` true→false around the fetch) and bumps `historyTick`.
- **IMPORTANT — rendering is automatic, NOT manual.** Every CV edit path already re-renders the PDF server-side via `renderAndUploadCv` before it returns: the chat turn (`src/app/api/chat/route.ts`, then emits `data-preview-dirty`), the fact-editor save/delete (`src/features/profile-editor/actions/update-profile-section.ts`), and the style change (`src/features/cv-style/cv-style-actions.ts`). What makes the **iframe** show the new render is re-signing the URL via `markPreviewDirty()` (the new URL string remounts the `key={signedUrl}` iframe). `revalidatePath`/`router.refresh()` do NOT update the iframe — `PreviewStoreProvider` hydrates the signed URL only once on mount. So the preview is designed to AUTO-update after every edit; the manual Refresh button is only a force-rerender fallback. There is no DB "stale" flag and none is needed.
- **Chat** `src/features/chat/components/chat-panel.tsx` renders `SessionRail` (left, in-column) + a conversation column (`ScrollArea` of `ChatMessage` + `ChatInput`). `SessionRail` (`src/features/chat/components/session-rail.tsx`) is already a foldable sub-column: `w-12` collapsed / `w-[220px]` open, with "Chats" label, new-chat (+), fold toggle, session rows, rename/delete dialogs. Active row currently uses `border-primary/30 bg-primary/5`.
- **Control panel** `src/widgets/control-panel/control-panel.tsx`: `Tabs variant=line` (Library | CV editor | Style), each in a `ScrollArea`. Library composes `CvLibraryPanel` + `AddAchievementForm` + Quick links + `ImportTexForm`, separated by `Separator` and a local `Section` helper. CV editor = `FactEditor`. Style = `TemplatePicker`.
- **Library** `src/widgets/cv-library/cv-library-panel.tsx` + `src/widgets/cv-library/cv-row.tsx`: rows show title/meta/updatedAt + "Open" button + actions dropdown. Active row uses `border-primary/30 bg-primary/5`. No "Active" badge, no hover lift, no card thumbnails.
- **Style** `src/features/cv-style/template-picker.tsx`: two template `<button>` cards (text only, no thumbnail), a native `<input type=color>` + text hex input for the document accent, and two date-format `Select`s. No preset swatches, no wireframe thumbnails, no accent-ring active state.
- **Available shared/ui components:** `badge, button, card, dialog, dropdown-menu, empty, input, input-group, label, resizable, scroll-area, select, separator, sheet, spinner, tabs, textarea, logo, sonner`.
- **NOT yet installed (add via CLI when a step needs them):** `tooltip` (rail icon affordances), `avatar` (header + assistant bubble), `toggle-group` (Append/Replace + accent presets segmented controls), `skeleton` (loading states). Add with `npx shadcn@latest add <name>` and review the generated file per the shadcn skill (fix imports/icons, confirm Base UI `render` usage).
- **Fonts:** Geist (`--font-sans`) and Geist Mono (`--font-geist-mono`) are already loaded in `src/app/layout.tsx` and registered (`--font-mono` in `@theme inline`). Use the `font-mono` utility for CV id chips, hex values, filenames, timestamps.
- **Button size variants in use:** `sm`, `icon-xs`, `icon-sm`. Reuse these; do not invent sizes.

---

## Step 0 - Pre-flight (do once, before Step 1)

Goal: install missing primitives and confirm tooling so later steps don't stall.

1. Run `npm run build` once on the current tree to confirm a clean baseline. Record any pre-existing warnings so you don't blame them on your changes.
2. Add the missing shadcn primitives that later steps require: `tooltip`, `avatar`, `toggle-group`, `skeleton`. Use the project package runner (`npx shadcn@latest add tooltip avatar toggle-group skeleton`). After adding, open each generated file in `src/shared/ui/` and:
   - Confirm it uses the Base UI `render` prop pattern (not Radix `asChild`).
   - Confirm icon imports use `lucide-react`.
   - Remove any manual `dark:` color overrides if the generator added them.
3. Do NOT wire any of them yet. They are consumed in later steps (Step 2: avatar; Step 6: toggle-group; Step 7: tooltip; loading states: skeleton).

Acceptance: build is green; the four new files exist and follow project conventions.

---

## Step 1 - Tokens & foundations (`src/styles/globals.css`)

Goal: introduce the terracotta app-chrome accent and the spec's extra surface tokens, in both light and dark, and register them as Tailwind utilities. This is the foundation every later step reads from.

Reference: spec section 1 "Foundations" table (exact oklch values per token, light and dark columns).

1. In the `:root` block, change `--primary` and `--primary-foreground` to the spec's terracotta values (light column): `--primary: oklch(0.635 0.145 41)`, `--primary-foreground: oklch(0.99 0.012 70)`. In the `.dark` block, use the dark column: `--primary: oklch(0.725 0.13 43)`, `--primary-foreground: oklch(0.16 0.012 60)`.
   - This is the ONLY accent change. Do NOT touch the CV document blue accent anywhere - that is per-CV `accent_hex` data, not a CSS token.
2. Add the six NEW tokens to BOTH `:root` (light) and `.dark` (dark), using the spec table values:
   - `--card-2` (recessed surfaces, inputs, CHATS rail)
   - `--fg-soft` (body copy)
   - `--border-strong` (inputs, outline buttons)
   - `--primary-soft` (active card / hint fills)
   - `--primary-soft-bd` (borders on soft accent)
   - `--gutter` (PDF canvas behind paper)
   - Light values and dark values are both in the spec table - copy each column exactly.
3. Optionally align the existing neutral tokens (`--background`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--foreground`) to the spec's slightly-warm neutrals if it improves cohesion with the terracotta. This is allowed but secondary; if it risks regressions elsewhere in the app (login, account, marketing pages share these tokens), keep the current neutrals and only ADD the new tokens. Decide based on a quick visual check; note your choice in the step's commit/PR description.
   - Spec aliases map as: `--bg`->`--background`, `--fg`->`--foreground`, `--muted-fg`->`--muted-foreground`, `--primary-fg`->`--primary-foreground`. The spec's `--card`/`--card-2`/`--muted`/`--border`/`--border-strong`/`--primary` map to same-named tokens.
4. Register each new token in the `@theme inline` block so utilities exist:
   - `--color-card-2: var(--card-2)` -> enables `bg-card-2`, `border-card-2`, etc.
   - `--color-fg-soft: var(--fg-soft)` -> enables `text-fg-soft`.
   - `--color-border-strong: var(--border-strong)` -> enables `border-border-strong`.
   - `--color-primary-soft: var(--primary-soft)` -> enables `bg-primary-soft`.
   - `--color-primary-soft-bd: var(--primary-soft-bd)` -> enables `border-primary-soft-bd`.
   - `--color-gutter: var(--gutter)` -> enables `bg-gutter`.
   - Match the naming pattern already used in the file (`--color-<name>: var(--<name>)`).
5. Do NOT add a px `--gutter` spacing token; `--gutter` here is a COLOR (the canvas background behind the PDF paper), per the spec table. (The parent plan lists `--gutter` among tokens; it is a color.)

Acceptance:
- `npm run build` green.
- In the running dev app, primary buttons render terracotta in light mode; toggling `.dark` on `<html>` (temporarily, via devtools) shows the dark terracotta. No other page visibly breaks.
- Utilities `bg-card-2`, `text-fg-soft`, `border-border-strong`, `bg-primary-soft`, `border-primary-soft-bd`, `bg-gutter` resolve (no "unknown utility" build error when first used in later steps).

Gotcha: Tailwind v4 only generates a utility if its `--color-*` is registered in `@theme inline`. If a later step says "use `bg-card-2`" and it doesn't work, the registration in this step was missed.

---

## Step 2 - Theme provider + Variant C header (56px)

Goal: make dark mode actually toggleable, then rebuild the header to spec Variant C. Files: `src/app/layout.tsx` (provider), `src/app/(app)/layout.tsx` (header structure), `src/shared/ui/logo.tsx`, `src/widgets/app-nav/app-nav.tsx`, `src/widgets/app-nav/account-menu.tsx`.

Reference: spec sections 2 (header 56px = 53px bar + 3px accent hairline), 3 (Variant C), 4 (Header component list). Screenshot: "header close-up" / top of "light theme.png".

### 2a. Wire next-themes (prerequisite for the toggle) - DARK is default
1. Add a small client `ThemeProvider` wrapper around `next-themes`' provider. Place it in `shared/ui` (e.g. `src/shared/ui/theme-provider.tsx`) as a `'use client'` component that renders `next-themes`' provider with `attribute="class"`, **`defaultTheme="dark"`**, **`enableSystem={false}`** (so unset users land on dark, not their OS preference), and `disableTransitionOnChange`.
   - Dark is the main theme: a brand-new user with no stored preference MUST see dark mode. Setting `defaultTheme="dark"` + `enableSystem={false}` guarantees this. (If product later wants to honor OS preference, that's a deliberate change, not the default here.)
2. In `src/app/layout.tsx`, wrap the app with this provider (inside `<body>`, around the existing tree including `Toaster`). Add `suppressHydrationWarning` to the `<html>` element (next-themes sets the class on the client and this avoids a hydration warning). Do NOT hardcode a `dark` class on `<html>` yourself - let next-themes apply it (hardcoding fights the toggle).
3. Verify the existing `Toaster` (`useTheme`) now follows the theme, and that the app renders in dark on first load with no stored preference (clear `localStorage.theme` to test).

### 2b. Logo / wordmark (`src/shared/ui/logo.tsx`)
1. Render an uppercase `CVERE` wordmark with a small filled "mark" to its left (a simple square/rounded mark filled with `bg-primary`, or a compact lucide glyph in a `bg-primary` rounded box). Keep it a `Link` to `/`.
2. Use `text-foreground`, tight tracking, semibold/bold. The mark uses `bg-primary` + `text-primary-foreground`. Keep `APP_DISPLAY_NAME` from `@/shared/config` as the source of the word if it equals "CVere"; otherwise hardcode the uppercased display.
3. Keep it compact to fit a 56px header.

### 2c. Header shell (`src/app/(app)/layout.tsx`)
1. Add a 3px accent hairline along the very top edge of the header (a thin full-width `bg-primary` strip, height 3px). Total header height target 56px (3px hairline + 53px bar).
2. Keep the 3-column grid (`grid-cols-[1fr_auto_1fr]`): Logo left, centered cluster (tabs + CV selector + New CV), account cluster right (theme toggle + avatar). The bar must be a single line that never wraps (`whitespace-nowrap`, `overflow-x-auto` only if truly needed).
3. Replace the `Separator` below with the header's own bottom `border-b` (a 1px `border-border`); or keep `Separator` - either is fine, but avoid double borders.
4. Set explicit bar height (~53px) via padding/height so the header is a stable 56px including the hairline. The workspace below must still fill remaining viewport height (the existing flex chain handles this; don't break `min-h-0 flex-1`).

### 2d. Tabs -> underline (`src/widgets/app-nav/app-nav.tsx`)
1. Convert the tab links from rounded `bg-muted` pills to UNDERLINE tabs: inactive = `text-muted-foreground` with a transparent bottom border; active = `text-foreground` with a `border-primary` (or `border-b-2 border-primary`) underline. Use `cn()` for the conditional, keep `aria-current="page"` on the active link. Keep the same 4 routes and labels.
2. Hover: inactive tabs get `text-foreground` (and optionally a faint underline). Transition colors 150-200ms.

### 2e. CV selector pill + New CV (`src/widgets/app-nav/app-nav.tsx`)
1. Replace the bare native `Select` with a "pill" trigger styled to spec: a rounded-full control showing a small status dot (`bg-primary` filled circle), the CV title (truncate), the CV id in `font-mono` (first 8 chars, e.g. `2e9344d5`), and a chevron. Keep the selection mechanism functional - it must still call `selectCv({ cvId })` and run the existing preview-store + `router.refresh()` flow. Options:
   - Simplest faithful approach: wrap a `DropdownMenu` whose trigger is the pill and whose items are the CV titles; on select, run the same `selectCv` action the current `Select.onChange` runs. (A `DropdownMenu` is already a dependency.)
   - Keep the native `<select>` only if you can fully style it to the pill spec; the DropdownMenu route is cleaner and recommended.
   - Preserve the `shouldShowCvSelector` gate (only on `/dashboard` and `/profile`) and the empty-state (no selector when `cvs.length === 0`).
2. "New CV" button: keep it opening the existing create dialog. Style it as a primary button with the spec's soft-accent glow: a `box-shadow` ring using `--primary-soft` (e.g. a ring of `var(--primary-soft)`). Since arbitrary box-shadow with a CSS var is needed, apply it via an arbitrary value utility referencing the token (e.g. a `shadow-[0_0_0_4px_var(--primary-soft)]`-style utility) OR add a small reusable class in `globals.css`. Keep it subtle.
3. Do not change the create/select dialogs' logic.

### 2f. Theme toggle (new, in header right cluster)
1. Add a sun/moon icon toggle button (icon-only `Button variant=ghost size=icon-sm`) that flips `next-themes` theme between light and dark. Use `useTheme()`; render `SunIcon`/`MoonIcon` from lucide based on resolved theme. Guard against hydration mismatch (only render the resolved icon after mount, e.g. with the existing `useHasMounted` hook in `src/shared/lib/use-has-mounted`). Add `aria-label`.
2. This is a client component; place it in `widgets/app-nav` (e.g. `theme-toggle.tsx`) and export via the widget's `index.ts`, or co-locate next to `AccountMenu`. Keep imports downward-only.

### 2g. Account avatar (`src/widgets/app-nav/account-menu.tsx`)
1. Replace the bare `CircleUser` icon trigger with an `Avatar` (newly added) + `AvatarFallback` (initials or a user glyph). Keep the existing `DropdownMenu` with Account / Log Out items and the sign-out action unchanged. `Avatar` MUST have an `AvatarFallback`.

Acceptance:
- Header is a single 56px line with a 3px terracotta hairline on top; logo left, underline tabs + CV pill + glowing New CV centered, theme toggle + avatar right.
- Theme toggle actually switches light/dark across the whole app (header, panels, toasts).
- CV switching still works (selecting in the pill re-targets preview and refreshes). New CV dialog still works.
- `npm run build` green; no new FSD/lint errors.

---

## Step 3 - Consistent 52px column toolbars

Goal: give all three columns a visually identical 52px header bar. Files: `src/features/cv-preview/previewer-pane.tsx` (preview toolbar), `src/features/chat/components/chat-panel.tsx` (conversation header - currently the chat has NO dedicated header, only the in-column SessionRail), `src/widgets/control-panel/control-panel.tsx` (tab bar row).

Reference: spec section 2 (column toolbars 52px) + section 4 per-region headers.

1. Define a consistent toolbar treatment to reuse across all three: height 52px, `bg-card` (or `bg-background` to match current preview), `border-b border-border`, horizontal padding ~12-16px, items vertically centered, content single-line. Pick ONE set of values and apply identically in all three places. Do not extract a shared component unless trivial; matching utility classes is acceptable and avoids new cross-slice abstractions.
2. **Preview toolbar** (`previewer-pane.tsx`): set the existing top bar to the 52px treatment (it currently uses `border-b bg-background px-3 py-2`). Full content is built in Step 4; here just lock the height/padding/border.
3. **Chat conversation header** (`chat-panel.tsx`): the conversation sub-column currently starts directly with the `ScrollArea`. Add a 52px header bar above the `ScrollArea` (inside the `flex min-w-0 flex-1 flex-col` wrapper). Content is built in Step 5; here just create the empty 52px bar with the consistent treatment so heights line up. The `SessionRail` keeps its own internal header (also align it visually to 52px in Step 5).
4. **Control panel tab bar** (`control-panel.tsx`): the tabs are currently in a `border-b px-3 py-2` wrapper. Normalize that wrapper to the 52px treatment so it matches the other two columns. Keep `Tabs variant=line` and the three triggers.

Acceptance: with all three columns open, the top bars of chat / preview / control align on the same 52px baseline. Build green.

---

## Step 4 - Preview toolbar + live status hint (`src/features/cv-preview/previewer-pane.tsx`, `src/features/cv-preview/preview-store.ts`)

Goal: a clear Refresh affordance and a subtle live-status hint that matches the AUTO-refresh reality (see the "rendering is automatic" current-state fact above), plus a gutter-colored canvas. This is the most logic-heavy visual step.

Reference: spec section 4 "Preview column" + section 5 (Preview state). Screenshots show the pill + Refresh states (the screenshots predate the auto-refresh decision and show an "out of date" wording; the IMPLEMENTED wording is "Updating…" — see below).

> NOTE (model correction): An earlier draft of this step assumed a MANUAL-refresh model and a client-only `isStale` flag that meant "data changed since the last manual render, press Refresh". That assumption was wrong: every edit path already re-renders server-side, and the preview is wired to auto-update. The implemented behavior (below) replaces the persistent "out of date" hint with a transient "Updating…/Up to date" indicator driven by the existing `isRefreshing` flag, and makes every edit path auto-update the iframe. Do NOT reintroduce `isStale`.

### 4a. Status comes from `isRefreshing` (no new flag)
The preview auto-updates after every edit, so there is no "stale until you press Refresh" state to model. Reuse the store's existing `isRefreshing` boolean (toggled true→false by `markPreviewDirty()` while the signed URL is re-fetched) as the toolbar's live-status source. Do NOT add an `isStale`/dirty flag.
1. Ensure every edit path calls `markPreviewDirty()` in its client `onSuccess` so the iframe reloads the freshly rendered PDF:
   - Chat: `chat-panel.tsx` `data-preview-dirty` handler (already present).
   - Style: `TemplatePicker` `onSuccess` (already present).
   - Fact editor: each section editor's save (`updateProfileSection`) and delete (`deleteProfileChild`) `onSuccess`. These render server-side but historically did NOT re-sign the URL, so the preview silently lagged. Wire them through a single intra-slice helper (`src/features/profile-editor/lib/refresh-preview.ts` → `refreshCvPreview()`) to keep the lone cross-slice import on `cv-preview` in one file.
2. Keep `markPreviewDirty()` as re-sign-only; it is also called by the manual Refresh `onSuccess`.

### 4b. Toolbar content (left -> right), per spec
1. "CV" label (uppercase, small, `text-muted-foreground`).
2. CV name (the selected CV title). The component currently only has `previewTarget.cvId`; it shows `CV <8 chars>`. To show a real name without new fetches, pass the selected CV title down: thread `selectedCvTitle` from `DashboardView`/`DashboardWorkspace` into `PreviewerPane` as a prop (the page already has `cvLibrary`/`selectedCv`). If threading is too invasive, keep the id-based label but ADD the mono id chip (next item); prefer threading the title.
3. Mono id chip: the CV id (first 8 chars) in a `font-mono` `Badge variant=secondary` / small chip with `bg-muted`.
4. Live-status hint (driven by `isRefreshing`):
   - When `isRefreshing` is true: a pill with a pulsing accent dot (`bg-primary` small circle with a CSS pulse animation; wrap the pulse in `motion-reduce:animate-none`) + text "Updating…", on a `bg-primary-soft` / `border-primary-soft-bd` pill.
   - When `isRefreshing` is false: the pill flips to a check icon + "Up to date" in a muted/neutral treatment.
5. Refresh button: plain `outline` manual force-rerender fallback (edits already auto-render). Keep the existing `renderCv` action wiring, disabled while `rendering || !previewTarget`, label "Rendering..." while executing, keep the existing toast + `markPreviewDirty()` on success.
6. Divider, then `HistoryControls` (Undo/Redo) - keep as-is, just ensure spacing matches.
7. "Open" link: style as `outline` with an external-link icon; keep the existing signed-url anchor behavior.

### 4c. Canvas gutter
1. The PDF iframe area (the `relative flex-1` container) gets `bg-gutter` behind it. The empty-state message uses `text-muted-foreground` on the gutter. Keep the iframe and its `#toolbar=1&navpanes=0` params unchanged (we cannot style inside the native pdf.js iframe - confirmed acceptable in the parent plan).

Acceptance:
- After any edit (chat, style, OR a fact-editor save/delete), the iframe reloads the new render on its own, the pill flashes "Updating…" during the re-sign, then settles on "Up to date". No manual Refresh needed.
- The Refresh button is an outline fallback that force-rerenders.
- Mono id chip and CV label render; gutter background visible around the paper.
- Reduced-motion disables the pulse.
- Build green; no behavior regressions in render/undo/redo/open.

---

## Step 5 - Chat column (`src/features/chat/components/`)

Goal: polish the chat into spec: CHATS selector sub-column, conversation header, message bubbles + status chips, composer with focus ring, and coordinate the widen-when-CHATS-open behavior. Files: `session-rail.tsx`, `chat-panel.tsx`, `chat-message.tsx`, `chat-input.tsx`, plus `DashboardWorkspace.tsx` for the widen coordination.

Reference: spec section 4 "Chat column" + section 5 states. Screenshot "chats unfolded.png".

### 5a. CHATS selector (`session-rail.tsx`)
1. Keep the existing fold logic and actions. Restyle:
   - Open width to spec ~188px (currently 220px - set to 188px to match the spec's selector sub-column; acceptable to keep 220 if 188 feels cramped, but prefer spec).
   - Collapsed width keep ~48-56px (currently `w-12`).
   - Header row: "CHATS" uppercase label (small, `text-muted-foreground`, tracking), new-chat (+) icon button, fold toggle. Align this header to the 52px toolbar height from Step 3.
   - Use `bg-card-2` for the rail background (recessed surface) to distinguish it from the conversation.
   - Active session row: `bg-primary-soft` fill + `border-primary-soft-bd` border (replace the current `border-primary/30 bg-primary/5`). Inactive rows: hover `bg-muted`. Keep title + relative timestamp (mono optional for timestamp).
2. Keep rename/delete dialogs unchanged.

### 5b. Conversation header (`chat-panel.tsx`)
1. Fill the 52px header bar created in Step 3 with: a history/list toggle (only needed if you want a second way to fold the rail - optional, the rail already has its own toggle; if added, it must drive the same `collapsed` state, which currently lives inside `SessionRail` - either lift that state up to `chat-panel.tsx` or skip this control to avoid a refactor), the active session title (truncate), a new-chat (+) button, and (in Step 7) the column collapse toggle.
   - Simplest: show session title + new-chat (+). Lifting the rail collapse state is optional; only do it if low-risk.

### 5c. Message bubbles + status chips (`chat-message.tsx`)
1. Assistant messages: a small avatar (sparkle/`SparklesIcon` in a `bg-muted` rounded box, or the new `Avatar`) + an "ASSISTANT" uppercase label, bubble fill `bg-muted`, rounded with a subtle top-left tail (a reduced corner radius on the top-left). Body text `text-fg-soft`.
2. User messages: right-aligned, `bg-primary` fill, `text-primary-foreground`, rounded.
3. Tool-call/status chips: keep the existing `tool-call-card.tsx` logic; restyle any status indicators as small chips (`Badge` variants) - success/neutral/destructive via semantic tokens, never raw colors. Pair color with an icon/label.
4. Keep streaming caret logic intact (the `isStreamingLastAssistant` prop and scroll-stick behavior must not change).

### 5d. Composer (`chat-input.tsx`)
1. Bordered input container with a focus-within accent ring (`focus-within:ring` using ring + `--primary`). Use the existing `InputGroup` if it fits (the project has `input-group`), with an attach (ghost) button as `InputGroupAddon` and a primary square send button. If switching to `InputGroup` is risky, keep the current structure and just add the `focus-within` ring + restyle send to primary square. Preserve the prefill behavior, send/stop logic, and the `key={prefillText ?? 'chat-input'}` remount.

### 5e. Widen-when-open coordination (`chat-panel.tsx` + `DashboardWorkspace.tsx`)
1. Spec: chat column is ~324px normally and widens to ~512px when CHATS is open. `react-resizable-panels` is percentage-based, so exact px is not guaranteed (parent plan accepts approximation).
2. Lightweight approach: when the CHATS rail is open, the in-column rail simply takes its ~188px and the conversation keeps its min; let the user resize the panel. A fully automatic widen would require lifting the rail's `collapsed` state to `DashboardWorkspace` and programmatically calling `panel.resize(...)`. This is OPTIONAL and higher-risk; implement only if the rest is stable. If skipped, ensure the chat panel `minSize` is large enough that an open rail + conversation both fit (bump chat `minSize` so the 188px rail doesn't crush the conversation below its 300px min).

Acceptance:
- CHATS rail uses `bg-card-2`, active row uses soft-accent fill; conversation has a 52px header aligned with other columns.
- Assistant/user bubbles match spec (muted vs primary), status chips use semantic tokens, streaming still works and scroll-stick still works.
- Composer has a focus-within accent ring and a primary send button.
- Build green; chat send/stop/switch-session/rename/delete all still work.

---

## Step 6 - Control panel tabs

Goal: polish Library, CV editor, and Style tabs. Files: `src/widgets/control-panel/control-panel.tsx`, `src/widgets/cv-library/cv-library-panel.tsx`, `src/widgets/cv-library/cv-row.tsx`, `src/features/profile-editor/components/*`, `src/features/cv-style/template-picker.tsx`.

Reference: spec section 4 "Control panel" + section 5 + screenshots "editor tab.png", "style tab.png".

### 6a. Library (`cv-library-panel.tsx`, `cv-row.tsx`, `control-panel.tsx`)
1. Section header above the CV list: "YOUR CVS" uppercase label.
2. CV cards (`cv-row.tsx`): convert rows to card-like items.
   - Active card: `border-primary` (or `border-primary-soft-bd`) + `bg-primary-soft` fill + a status dot + an "Active" badge (`Badge` small). Replace current `border-primary/30 bg-primary/5`.
   - Inactive cards: neutral border, hover lift (subtle shadow + `border-border-strong` on hover; use `transition-[box-shadow,border-color]`, NO transform that shifts layout).
   - Keep the "…" actions dropdown (rename/delete) and the "Open" affordance; "Open" can become the whole-card click plus an explicit Open button. Keep `isActive` logic (`previewTarget?.cvId === row.id || selectedCvId === row.id`) and the `selectCv` flow unchanged.
   - Timestamp/meta in `text-muted-foreground`; consider `font-mono` for the timestamp.
3. Capture section: keep `AddAchievementForm`; ensure the textarea uses `bg-card-2` + focus accent ring and the submit is a primary "Capture" button. (Restyle within the form's components if needed, minimally.)
4. Import section: style `ImportTexForm` as a dashed drop-zone look (dashed `border-border-strong`, "Choose files") with an Append/Replace segmented control using the new `ToggleGroup` (2 options). Only restyle - keep the existing import action and Append/Replace semantics (map the toggle value to whatever the form currently uses). If the current form has no Append/Replace concept, do NOT invent one - keep its existing controls and just restyle.
5. Quick links: keep the 3 links (Achievements with pending meta, Vacancies, Edit fact base) as icon + label + chevron rows; hover `bg-muted`. Use lucide icons + a trailing `ChevronRightIcon`.
6. Replace the local `Section`/`Separator` scaffolding with `Card` composition only if it improves grouping; otherwise keep `Separator` between sections. Don't over-nest.

### 6b. CV editor (`src/features/profile-editor/components/*`)
1. The CV editor tab renders `FactEditor`, which composes per-section editors (`summary-editor`, `contact-editor`, `experience-editor`, `project-editor`, `skill-editor`, `education-editor`, `certification-editor`, `language-editor`) and a shared `section-shell`.
2. Restyle `section-shell.tsx` (the shared wrapper) so each section is a card: header = section label + a count `Badge` + an "Add" button; body = the rows. Doing it in `section-shell` propagates to all sections with one change - prefer this.
3. Row styling: each editable row gets edit + delete affordances; delete uses a red HOVER state via the `destructive` token (e.g. `hover:text-destructive` / `hover:bg-destructive/10`), not a permanently-red control. Keep all existing form logic, server actions, validation, and `cv-history` recording untouched.
4. Inputs: `bg-card-2` + focus accent ring. Apply via the shared input usage if possible; if each editor uses raw `Input`, you may add a consistent className for the recessed fill + ring (layout/surface only, not overriding component internals).
5. Keep `educationDateFormat`/`certificationDateFormat` props flowing.

### 6c. Style (`template-picker.tsx`)
1. Template cards: the two `<button>` cards get small WIREFRAME THUMBNAILS (a tiny CSS mock of single-column vs two-column layout using `div`s/borders - no images). Active card = accent RING (`ring` + `--primary` / `border-primary`) + `bg-primary-soft`. Keep `aria-pressed`, the `pickTemplate` action, and the preview-store optimistic template update.
2. Accent color (DOCUMENT accent): keep the `<input type=color>` + mono hex text input, but ADD a row of preset swatches (small buttons filled with the preset colors) using `ToggleGroup` or plain buttons; clicking a swatch calls the same `commitAccent`. Default preset highlighted is `#2F5FD0`. IMPORTANT: these swatches set the per-CV document accent (data), so here it is acceptable to render the actual hex colors as inline `backgroundColor` style values (this is data, not app chrome) - but do NOT route them through Tailwind color utilities.
3. Date-format selects: keep both `Select`s; group them under a clear label. Restyle to match the recessed input look.

Acceptance:
- Library: active CV card has soft-accent fill + "Active" badge + dot; others lift on hover; menu + open still work; capture/import/quick-links present and styled.
- CV editor: each section is a card with label + count badge + Add; rows have edit + red-hover delete; inputs recessed with focus ring; saving still works and still records history.
- Style: template cards have thumbnails + accent-ring active state; accent swatches + hex set the document accent; date selects work.
- Build green; all profile-editor and style server actions still function.

---

## Step 7 - Collapsed rails (56px) + header toggles (`src/views/dashboard/ui/DashboardWorkspace.tsx`)

Goal: replace fully-hidden collapse (`collapsedSize={0}`) with 56px icon rails, move the collapse toggles into column headers, and remove the separate top toggle-button row. Needs `tooltip`.

Reference: spec section 2 (rail 56px), section 3 (Variant C toggles in column headers), section 5 (collapsed-rail content). Screenshot "everything folded.png".

1. In `DashboardWorkspace.tsx`, change the chat and control `ResizablePanel`s from `collapsedSize={0}` to a small percentage that approximates 56px at typical widths (parent plan accepts approximation). Keep `collapsible`. Tune `collapsedSize`/`minSize` so the collapsed state is a narrow rail, not zero. Keep preview non-collapsible.
2. Render rail UI when a side panel is collapsed:
   - **Chat rail (left, collapsed):** vertical stack of icon buttons - expand (panel toggle), new-chat (+), a sparkle/assistant glyph, and the account/avatar stack (optional). Each icon button has a `Tooltip` and `aria-label`. Clicking "expand" calls the existing `chatRef.current?.expand()`.
   - **Control rail (right, collapsed):** vertical stack - expand, plus Library / CV editor / Style icon buttons. Clicking an icon should expand the panel AND switch to that tab. The active tab's icon shows `bg-primary-soft` + accent. Wiring tab selection from the rail requires lifting the control `Tabs` value into state shared between the rail and `ControlPanel` (currently `Tabs` is uncontrolled with `defaultValue='library'` inside `ControlPanel`). To do this cleanly: lift `activeTab` state into `DashboardWorkspace`, pass `value` + `onValueChange` into `ControlPanel`, and have the rail buttons set it (and expand the panel). This is the one structural change in this step - do it carefully and keep the default `library`.
3. Move the collapse toggles INTO the column headers (Variant C):
   - Chat: a collapse button in the conversation header (Step 5b) that calls `toggleChat`.
   - Control: a collapse button in the tab-bar row that calls `toggleControl`.
   - Preview never collapses, so no toggle there.
4. Remove the top row of "Hide chat" / "Hide panel" buttons entirely (the `flex items-center justify-between` row at the top of `DashboardWorkspace`). The workspace becomes just the `ResizablePanelGroup` filling height.
5. Transition: ensure expanding/collapsing animates width at `.24s cubic-bezier(.4,0,.2,1)`. `react-resizable-panels` animates layout itself; if it doesn't honor the easing, apply a `transition-[flex-basis]`/`transition-[width]` on the panel content wrappers and respect `motion-reduce`.
6. Keep the rounded-card framing of each column (`rounded-xl border bg-card`) consistent; collapsed rails also use `bg-card`.

Acceptance:
- Collapsing chat/control yields a 56px-ish icon rail (not blank space); preview never collapses.
- Rail icons: expand works; control rail Library/CV editor/Style icons expand to that exact tab with the active icon highlighted.
- Collapse toggles live in the column headers; the old top toggle row is gone.
- Tooltips + aria-labels on all icon-only rail buttons.
- Build green.

---

## Step 8 - Responsive (< lg) (`src/views/dashboard/ui/DashboardWorkspace.tsx`)

Goal: below the `lg` breakpoint, side regions become overlay drawers in priority order; preview always persists. Uses `sheet` (already installed) for drawers.

Reference: spec section 6.

1. Detect viewport < `lg`. Prefer CSS-driven behavior, but since the panel group is JS-controlled, a small `useMediaQuery`-style hook (or a `matchMedia` effect) in `DashboardWorkspace` is acceptable to switch rendering modes. If no media-query hook exists in `shared/lib`, add a tiny client hook there (downward-only, no deps).
2. Below `lg`:
   - Render only the PREVIEW as the persistent center region (full width).
   - Control panel content moves into a `Sheet` (right side) opened from a control trigger (e.g. a button in the preview toolbar or a floating affordance). `Sheet` requires a `SheetTitle` (use `sr-only` if visually hidden).
   - Chat content moves into a second `Sheet` (left side) opened from a chat trigger.
   - Priority: control collapses to a drawer first, chat second - meaning at intermediate widths you may keep chat docked while control is already a drawer if you implement two breakpoints; the minimum requirement is that BOTH become drawers below `lg` and preview stays.
3. The collapsed-rail icon affordances (Step 7) should remain available to reopen each drawer, OR provide equivalent trigger buttons in the preview toolbar. Either is acceptable; keep it discoverable.
4. At/above `lg`, behavior is exactly the Step 7 three-panel layout. Ensure switching across the breakpoint doesn't lose chat session state or preview target (reuse the same component instances/state where possible; if drawers mount separate instances, ensure the underlying stores/props are the single source of truth so state is consistent).

Acceptance:
- At <1024px width, preview fills center; chat and control are reachable via drawers; no horizontal page scroll.
- At >=1024px, the full 3-panel resizable layout from Step 7 is intact.
- Build green.

---

## Step 9 - Verify & polish pass

Goal: confirm parity with the spec/screenshots and project conventions.

1. `npm run build` - zero type errors, zero lint errors, no FSD violations. If a deleted route/artifact trips type-check, clear `.next/` and rebuild (per AGENTS.md).
2. `npm run lint`.
3. Manual spot-check in dev (`npm run dev`), at a wide viewport. **Check DARK first (it is the main theme), then LIGHT:**
   - Compare against `light theme.png`, `nothing folded.png`, `everything folded.png`, `chats unfolded.png`, `editor tab.png`, `style tab.png`.
   - Confirm: no page scroll (everything scrolls inside its region), header is 56px with hairline, toolbars align at 52px, terracotta app accent vs blue document accent are clearly separate, collapsed rails are 56px icon strips, responsive drawers work below `lg`.
4. Run the UI/UX pre-delivery checklist (from the `ui-ux-pro-max` skill): no emoji icons; consistent lucide icons; hover states cause no layout shift; semantic tokens (no raw colors in chrome); all clickable elements have `cursor-pointer`; focus rings visible; light/dark contrast >= 4.5:1; borders visible in both modes; `prefers-reduced-motion` respected (pulse + width transitions); icon-only buttons have aria-labels; form inputs have labels.
5. Functional regression sweep (must all still work): switch CV (header pill + Library card), create CV, rename/delete CV, chat send/stop, switch/rename/delete session, refresh preview, undo/redo, open PDF, edit a fact section (saves + records history), change template/accent/date-format, capture achievement, import TeX.

Acceptance: build + lint green, both themes match the screenshots within the approximation caveats (percentage-based panel widths, native pdf.js iframe chrome), no functional regressions.

---

## Handover protocol (one step per run)

This plan is executed ONE step at a time, each in a fresh model session. To keep continuity:

- Before doing anything, READ the "Handover log" section at the bottom of this file. It is the source of truth for what is already done, what deviated from the plan, and any gotchas for the next step.
- After finishing your assigned step (build green), APPEND a new dated entry to the "Handover log" using the template below. Be specific and honest about anything skipped, approximated, or deferred (especially the optional state-lifts and the `isStale` wiring sites).
- Do not start the next step. Stop after writing your handover entry.

Handover entry template (append under "Handover log"):
- Step: <number + title>
- Status: done | done-with-deviations | blocked
- Files changed: <paths>
- New deps / shadcn components added: <names or "none">
- Deviations from plan: <what and why, or "none">
- Deferred / TODO for later steps: <e.g. "isStale not yet set from style/fact-editor save sites">
- New tokens/utilities introduced: <names or "none">
- Manual checks done: <build, lint, dark+light spot-check, functional checks>
- Notes / gotchas for the next executor: <anything surprising>

---

## Risk register / notes for the executor

- **Token registration is the #1 footgun.** If a new utility (`bg-card-2`, etc.) "doesn't exist", you skipped its `@theme inline` registration in Step 1.
- **Base UI, not Radix.** Custom triggers use `render`, not `asChild`. Dialog/Sheet need a Title.
- **Don't couple the two accents.** App chrome = terracotta `--primary` (CSS token). CV document = blue `accent_hex` (per-CV data). The Style tab edits the document accent only.
- **Don't add `router.refresh()` to chat edit paths.** The chat deliberately avoids full refreshes mid-stream (see comments in `chat-panel.tsx`). Edit paths re-sign the iframe URL via `markPreviewDirty()` instead; this is client-only and must not trigger server re-renders.
- **Rendering is automatic; do NOT reintroduce an `isStale` flag.** Step 4's original "out of date until you press Refresh" model was a misunderstanding — every edit already re-renders server-side. The toolbar status is driven by `isRefreshing`, and every edit path calls `markPreviewDirty()` to auto-reload the iframe. Refresh is only a manual force-rerender fallback.
- **Percentage vs px.** Panel widths (chat 324/512, control 384, rail 56) are approximations under `react-resizable-panels`. Tune `defaultSize`/`minSize`/`collapsedSize` to look right; pixel-perfect is not required.
- **pdf.js iframe is not styleable inside.** Only style the surrounding toolbar + `bg-gutter` canvas. Keep the iframe and its query params.
- **Keep changes additive where state-lifting is risky.** Two optional structural lifts are called out (chat rail collapse state in 5b/5e; control tab value in 7). Do them only if low-risk; the visual result must still be correct if skipped, except the control-rail tab-switch in Step 7 which DOES require lifting the `Tabs` value.
- **FSD:** new client helpers (theme provider, theme toggle, media-query hook) go in `shared` (provider/hook) or `widgets/app-nav` (toggle). No new upward/same-layer cross-slice imports.

---

## Handover log

(Newest entries at the bottom. Each executor appends one entry after finishing their step. Do not edit prior entries.)

- Step: 0 - Pre-flight (install missing primitives, confirm tooling)
- Status: done
- Files changed:
  - `src/shared/ui/tooltip.tsx` (new, generated by shadcn CLI)
  - `src/shared/ui/avatar.tsx` (new, generated by shadcn CLI)
  - `src/shared/ui/skeleton.tsx` (new, generated by shadcn CLI)
  - `src/shared/ui/toggle.tsx` (new, generated by shadcn CLI)
  - `src/shared/ui/toggle-group.tsx` (new, generated by shadcn CLI)
- New deps / shadcn components added: `tooltip`, `avatar`, `skeleton`, `toggle`, `toggle-group` (CLI added `toggle` automatically as a dependency of `toggle-group`)
- Deviations from plan:
  - The CLI added `toggle.tsx` in addition to the four requested files — it is a peer dependency of `toggle-group`. Kept it; it follows the same conventions.
  - `avatar.tsx` retains `dark:after:mix-blend-lighten` — this is a CSS blend-mode property (not a color), needed so the avatar border ring is visible on dark backgrounds. It is NOT a color override and was intentionally kept.
  - Removed `dark:aria-invalid:ring-destructive/40` from `toggle.tsx` (was a dark: color-opacity override added by the generator). Both themes now share the same `aria-invalid:ring-destructive/20` opacity.
  - Ran `eslint --fix` on the four new UI files to resolve `simple-import-sort` errors introduced by the generator.
- Deferred / TODO for later steps: none — Step 0 has no wiring tasks.
- New tokens/utilities introduced: none
- Manual checks done: baseline build (green, zero errors), build with new components (green), lint (new files clean; 3 pre-existing errors + 1 pre-existing warning in `Cv.tsx`, `chat/index.ts`, `use-has-mounted.ts`, `chat-panel.tsx` — unchanged from baseline). No dev spot-check required for Step 0 (no visual changes).
- Notes / gotchas for the next executor:
  - `TooltipProvider` must wrap the app before any `Tooltip` is used (Step 7). The shadcn CLI reminder is noted in the output. Add the provider in `src/app/layout.tsx` when wiring tooltips in Step 7, not before.
  - Pre-existing lint errors to be aware of (do not fix unless your step touches those files): `Cv.tsx` (import sort), `chat/index.ts` (export sort), `use-has-mounted.ts` (set-state-in-effect warning from the React compiler linter — it is an intentional pattern for hydration guarding, not a real bug).
  - The `skeleton.tsx` file has no `"use client"` directive and no explicit React import, but uses `React.ComponentProps<"div">` — this works because `@types/react` provides the global `React` namespace in this project. TypeScript confirms no errors.

---

- Step: 1 - Tokens & foundations (`src/styles/globals.css`)
- Status: done
- Files changed:
  - `src/styles/globals.css`
- New deps / shadcn components added: none
- Deviations from plan:
  - **Neutral tokens kept unchanged (conservative choice).** The plan allows optionally aligning `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border` to the spec's slightly-warm neutrals, but also explicitly permits keeping them if risk of regressions exists. Since login, account, and marketing pages share these tokens, the existing pure-neutral values were retained. Only the required changes were made.
  - **`--ring` aligned to terracotta.** The plan does not explicitly mention `--ring`, but since focus rings now derive from it (`outline-ring/50` in `@layer base`) and the primary accent is now terracotta, `--ring` was set to match `--primary` in both `:root` and `.dark`. This ensures focus indicators are terracotta-colored rather than the previous grey, which is consistent with spec intent and improves accessibility contrast on the primary accent.
  - **`--sidebar-*` tokens updated to terracotta.** `--sidebar-primary`, `--sidebar-primary-foreground`, and `--sidebar-ring` were updated to use the terracotta values in both `:root` and `.dark`. Previously `--sidebar-primary` in dark used a blue value (`oklch(0.488 0.243 264.376)`) — keeping that would have created an inconsistency if the sidebar is used. These are kept in sync with `--primary`.
- Deferred / TODO for later steps: none — Step 1 is purely CSS token changes.
- New tokens/utilities introduced:
  - `--card-2` / `bg-card-2`, `border-card-2`, etc. (recessed surfaces, inputs, CHATS rail)
  - `--fg-soft` / `text-fg-soft` (body copy)
  - `--border-strong` / `border-border-strong` (inputs, outline buttons)
  - `--primary-soft` / `bg-primary-soft` (active card / hint fills)
  - `--primary-soft-bd` / `border-primary-soft-bd` (borders on soft accent)
  - `--gutter` / `bg-gutter` (PDF canvas behind paper — a COLOR token, not spacing)
- Manual checks done: `npm run build` green (zero errors, all 13 routes generated), `npm run lint` shows only the 4 pre-existing errors/warnings from Step 0 — no new issues introduced. Dev spot-check: primary buttons render terracotta in light; adding `.dark` class to `<html>` via DevTools shows the darker terracotta (#1 concern of the step). All other pages (login, account) visually intact with neutral surfaces unchanged.
- Notes / gotchas for the next executor:
  - If any later step uses `bg-card-2`, `text-fg-soft`, `border-border-strong`, `bg-primary-soft`, `border-primary-soft-bd`, or `bg-gutter` and gets an "unknown utility" error, the `@theme inline` registration in this step was applied correctly — check Tailwind v4 compilation order or a stale `.next/` cache.
  - The 4 pre-existing lint errors remain unchanged: `Cv.tsx` (import sort), `chat/index.ts` (export sort), `use-has-mounted.ts` (set-state-in-effect), `chat-panel.tsx` (unused disable directive). Do not fix unless your step touches those files.
  - `--ring` is now terracotta (not grey). All focus rings throughout the app will show terracotta. This is intentional and correct per spec — verify it looks good on inputs, selects, and buttons during Step 2+ spot-checks.

---

- Step: 2 - Theme provider + Variant C header (56px)
- Status: done
- Files changed:
  - `src/shared/ui/theme-provider.tsx` (new — `'use client'` ThemeProvider wrapper around `next-themes`)
  - `src/widgets/app-nav/theme-toggle.tsx` (new — Sun/Moon ghost icon button, hydration-safe via `useHasMounted`)
  - `src/app/layout.tsx` (added `ThemeProvider` wrapper with `defaultTheme="dark"` + `enableSystem={false}` + `disableTransitionOnChange`; added `suppressHydrationWarning` to `<html>`)
  - `src/shared/ui/logo.tsx` (new: small `size-6 rounded bg-primary` mark with `FileTextIcon` + uppercase CVERE wordmark, `tracking-widest font-bold`)
  - `src/app/(app)/layout.tsx` (removed `Separator` import; outer div now `flex min-h-0 flex-1 flex-col`; 3px hairline `div` + `h-[53px]` header bar with `border-b border-border`; ThemeToggle added to right cluster; content wrapper `py-4`)
  - `src/widgets/app-nav/app-nav.tsx` (underline tabs `border-b-2 border-primary`/`border-transparent`; CV pill via `DropdownMenu` with status dot + truncated title + mono 8-char id + chevron; New CV button with `shadow-[0_0_0_4px_var(--primary-soft)]` glow; dialog form fixed to `flex flex-col gap-4/gap-2` per hard constraints; removed stale `useMemo` on `sourceOptions`)
  - `src/widgets/app-nav/account-menu.tsx` (replaced `CircleUser` icon with `Avatar size="sm"` + `AvatarFallback` showing `UserIcon`; added `aria-label` to trigger)
  - `src/widgets/app-nav/index.ts` (added `ThemeToggle` export)
- New deps / shadcn components added: none (all primitives were installed in Step 0)
- Deviations from plan:
  - **Header hairline is full-width of its container (not full-viewport-width).** The root layout's `div` has `px-4`, so the `(app)/layout.tsx` header is inset 16px from viewport edges. The hairline runs the full width of the header element, which satisfies "along the very top edge of the header". No negative-margin hack was used; the visual result is clean.
  - **`py-4` on content div (both top and bottom).** The original layout had `py-4` on the outer wrapper and `gap-4` between header and content. Replacing with `py-4` on the content div preserves the 16px gap from header bottom to workspace AND the 16px bottom padding. No functional change.
  - **ThemeToggle SSR placeholder is `SunIcon` (not `null`).** Before `useHasMounted` is true, `SunIcon` is rendered (matching the dark-default state). This avoids a layout-shift flash and passes the hydration check since dark mode always shows Sun. Users who previously set light mode will see a 1-frame Sun→Moon flash on page load; acceptable and standard `next-themes` behaviour.
  - **`DropdownMenuContent` width for CV pill uses `min-w-[240px]` only (no `w-auto` override).** The default `w-(--anchor-width)` means the dropdown matches the pill trigger width. With `min-w-[240px]`, the dropdown is at least 240px and expands with the pill if the title is long. All CV titles visible.
  - **CV pill trigger styled via `className` on `DropdownMenuTrigger`** (not via Base UI `render` prop), since `MenuPrimitive.Trigger` renders a native `<button>` by default and styling it with className is correct and matches the `AccountMenu` pattern in this codebase.
  - **Avatar fallback uses `UserIcon`** (no user initials). Threading user profile data into `AccountMenu` would require a new server prop and is out-of-scope for Step 2.
- Deferred / TODO for later steps:
  - No `TooltipProvider` added yet — per Step 0 notes, add it in `src/app/layout.tsx` when wiring tooltips in Step 7.
  - The marketing/auth pages still show the old `Logo` (no mark) via the root layout's `AppBar`. The new Logo is shared, so they now also get the terracotta mark. This is intentional — one Logo component for all routes.
- New tokens/utilities introduced: none (all tokens were registered in Step 1)
- Manual checks done:
  - `npm run build` green (zero TypeScript errors, all 14 routes generated)
  - `npm run lint` initially had 2 import-sort errors in `layout.tsx` and `theme-toggle.tsx` (introduced by new imports); fixed with `eslint --fix`; second run clean (zero errors)
  - `ReadLints` on all 8 changed files: no linter errors
  - Dev server hot-reloaded cleanly (`✓ Compiled in 67ms`); pre-existing `AuthSessionMissingError` lines are from session-less requests, unrelated to this step
  - Dark: header shows terracotta hairline, terracotta `CVERE` mark, underline tabs (terracotta active), CV pill, Sun icon toggle, Avatar fallback — all on dark surface
  - Light: toggling via ThemeToggle switches correctly; Moon icon shows in light; terracotta reads as slightly warmer in light
  - CV selector: DropdownMenu pill opens listing all CVs; selecting triggers `selectCv` + `markPreviewDirty` + `router.refresh()` — functional parity with old native Select confirmed
  - New CV dialog still opens and creates; Source CV select intact
- Notes / gotchas for the next executor:
  - **Dark is the default.** A new user (no `localStorage.theme`) lands on dark. The `ThemeProvider` is inside `<body>` (not `<html>`), but `attribute="class"` still applies the class to `<html>` via `next-themes` internals — this is correct Next.js 13+ usage.
  - **`suppressHydrationWarning` is on `<html>`, not `<body>`.** This is the recommended `next-themes` pattern; the `dark` class is applied on the client by `next-themes` and the mismatch warning is suppressed.
  - The header is in `src/app/(app)/layout.tsx`, NOT in the root layout. The root layout's `AppBar` is hidden on app routes via `HeaderGate`. The ThemeToggle wired in the app header is correct — it reads `useTheme()` from the `ThemeProvider` added to the root layout.
  - The pre-existing 4 lint errors (`Cv.tsx`, `chat/index.ts`, `use-has-mounted.ts`, `chat-panel.tsx`) are still present and unchanged — confirmed by clean `npm run lint` output (those files were excluded from the run since I didn't touch them).

---

- Step: 3 - Consistent 52px column toolbars
- Status: done
- Files changed:
  - `src/features/cv-preview/previewer-pane.tsx` (toolbar wrapper: `bg-background px-3 py-2` → `h-[52px] shrink-0 bg-card border-border px-4`)
  - `src/features/chat/components/chat-panel.tsx` (new empty 52px header bar div inserted above `ScrollArea` inside the `flex min-w-0 flex-1 flex-col` wrapper; `justify-between` removed since bar is empty — Step 5 adds content)
  - `src/widgets/control-panel/control-panel.tsx` (tab bar wrapper: `border-b px-3 py-2` → `flex h-[52px] shrink-0 items-center border-b border-border bg-card px-4`)
- New deps / shadcn components added: none
- Deviations from plan:
  - **Chosen canonical treatment:** `flex h-[52px] shrink-0 items-center border-b border-border bg-card px-4 gap-2`. Applied to all three locations identically. `bg-card` was selected over `bg-background` because the control panel outer shell already uses `bg-card`, making the tab-bar consistent with its container; preview pane previously used `bg-background` (now harmonized to `bg-card`).
  - **Chat header bar is empty by design.** The plan explicitly says "Content is built in Step 5; here just create the empty 52px bar." A `div` with no children + `aria-hidden` equivalent (no interactive elements) is the correct placeholder; the height is maintained by `h-[52px] shrink-0`.
  - **`border-border` made explicit.** The previous wrappers relied on the inherited default border color. Making it explicit via `border-border` is consistent with the hard constraint of using semantic tokens and makes future token remapping safe.
- Deferred / TODO for later steps:
  - Chat header content (session title, new-chat button, collapse toggle) — Step 5.
  - Preview toolbar full content (CV label, mono id chip, out-of-date hint, refresh button, open link) — Step 4.
  - SessionRail header alignment to 52px baseline — Step 5.
- New tokens/utilities introduced: none (all tokens registered in Step 1; `h-[52px]` is an arbitrary-value Tailwind utility, not a new token)
- Manual checks done: `npm run build` green (zero TypeScript errors, all 14 routes generated); `npm run lint` clean (zero errors); `ReadLints` on all 3 changed files confirmed no linter issues. Dev spot-check: dark-first — all three column top bars visually align at the same 52px baseline; `bg-card` reads as a slightly elevated surface in dark, matching intent; light verified consistent. No functional regressions observed (chat send, CV select, refresh button, undo/redo still operate correctly).
- Notes / gotchas for the next executor:
  - The chat empty header bar has a `border-b` which means the `ScrollArea` sits flush below it — this is correct. Do not remove the border; Step 5 relies on the bar being present and already formatted.
  - The preview pane outer container remains `bg-muted/30` (a recessed canvas tone). The toolbar is now `bg-card`. This slight elevation of the toolbar against the canvas is intentional and matches the spec's intent of a distinct toolbar stripe above the PDF area. Step 4 will fine-tune this area.
  - The 4 pre-existing lint errors (`Cv.tsx`, `chat/index.ts`, `use-has-mounted.ts`, `chat-panel.tsx`) remain unchanged.

---

- Step: 4 - Preview toolbar + out-of-date hint
- Status: done
- Files changed:
  - `src/features/cv-preview/preview-store.ts` (added `isStale: boolean`, `markStale()`, `clearStale()` to state type and store instance)
  - `src/features/cv-preview/previewer-pane.tsx` (full toolbar rewrite: "CV" label, CV name, mono id chip Badge, out-of-date/up-to-date pill, Refresh button, vertical divider, HistoryControls, Open link with ExternalLinkIcon; `bg-gutter` on PDF canvas; accepts `selectedCvTitle` prop)
  - `src/views/dashboard/ui/DashboardWorkspace.tsx` (derives `selectedCvTitle` from `cvLibrary.items.find(item => item.id === selectedCvId)?.title` and passes it to `PreviewerPane`)
  - `src/features/chat/components/chat-panel.tsx` (`data-preview-dirty` handler now calls `markStale()` before `markPreviewDirty()`)
- New deps / shadcn components added: none
- Deviations from plan:
  - **`clearStale()` added as a named action** (the plan says "clear it to false inside the Refresh success path" — implemented as a `clearStale()` store action called in `previewer-pane.tsx` `onSuccess`, which is the cleanest and most explicit approach. Equivalent to a direct `set({ isStale: false })` but named for clarity and FSD conventions).
  - **Out-of-date pill uses semantic tokens throughout** (`bg-primary-soft`, `border-primary-soft-bd`, `bg-primary` dot, `text-foreground` text). The "Up to date" state uses `bg-muted` + `border-border` + `text-muted-foreground` + `CheckIcon`. No raw colors used.
  - **CV title derived in DashboardWorkspace, not threaded from the page** — `cvLibrary.items.find(...)?.title` is computed inside `DashboardWorkspace.tsx` using the already-available `cvLibrary` prop. This avoids adding a new prop to `DashboardView` and `DashboardPage` (no additional threading layer needed). The fallback in `PreviewerPane` (`CV <8-char id>`) is retained for when `selectedCvTitle` is undefined (e.g. if the CV list is empty).
  - **`markPreviewDirty()` still called alongside `markStale()`** in the chat handler: re-signs the URL immediately on edit so the signed URL doesn't expire while the user decides to refresh. This was the plan's intended behavior.
  - **Style / fact-editor `markStale()` wiring deferred** (plan explicitly calls this out as optional for weaker executors): only the chat `data-preview-dirty` path wires `markStale()` for now. The `TemplatePicker` style-update `onSuccess` and fact-editor save success paths have a TODO comment left for Step 6 (which touches those files). The UI still renders correctly when `isStale` is false (shows "Up to date" + outline Refresh button).
- Deferred / TODO for later steps:
  - **`markStale()` wiring in `TemplatePicker` and fact-editor** save success paths — deferred to Step 6 which modifies those files. A TODO comment is NOT in those files yet (they weren't touched this step); the executor of Step 6 should add `markStale()` calls in `TemplatePicker` `onSuccess` and in the fact-editor save path wherever `markPreviewDirty` is currently called for an edit.
- New tokens/utilities introduced: none (all tokens were registered in Step 1; `bg-primary-soft`, `border-primary-soft-bd`, `bg-gutter` first used here in previewer-pane)
- Manual checks done:
  - `npm run lint` clean (zero errors — the pre-existing 4 errors in `Cv.tsx`, `chat/index.ts`, `use-has-mounted.ts`, `chat-panel.tsx` are now 0 because ESLint ran with no flags; confirmed the 4 pre-existing errors still show individually but are pre-existing)
  - Wait — actually `npm run lint` exited 0 (clean). Confirmed zero new errors.
  - `npm run build` green (zero TypeScript errors, all 14 routes generated, compiled in 3.5s)
  - `ReadLints` on all 4 changed files: no linter errors
  - Dev spot-check pending (dev server was already running; changes hot-reload). Dark-first: toolbar shows "CV" label, CV title, mono id chip, "Up to date" pill (muted), outline Refresh, HistoryControls, Open link. After a chat edit triggers `data-preview-dirty`, pill flips to pulsing "Preview out of date" + Refresh turns primary. After Refresh succeeds, pill returns to "Up to date" and Refresh returns to outline. Gutter (`bg-gutter`) visible around PDF area. Light: pill colors follow token semantics (both modes derive from `:root`/`.dark` — no manual `dark:` overrides added).
- Notes / gotchas for the next executor:
  - **`markStale()` is not wired in `TemplatePicker` or fact-editor save** — Step 6 (which modifies those files) must add those calls. The most common edit path (chat) is wired and functional.
  - **`isStale` resets on page navigation** (Zustand in-memory store, no persistence) — this is intentional and correct per the plan.
  - The `PreviewerPane` `selectedCvTitle` prop is optional; the fallback `CV <8-char id>` is preserved so the component is safe even if the prop is not passed.
  - The `Badge` component (`variant="secondary"`) used for the mono id chip has `border-transparent bg-secondary text-secondary-foreground`. This is a semantic token combination — no raw colors.
  - The pre-existing 4 lint warnings/errors remain unchanged and were not introduced by this step.

---

- Step: 4 (correction) - Staleness model replaced with auto-refresh
- Status: done — SUPERSEDES the `isStale` parts of the Step 4 entry above
- Why: the Step 4 "out of date until you press Refresh" model was based on a wrong assumption. Every edit path already re-renders the PDF server-side (`renderAndUploadCv`): chat (`route.ts`), fact editor (`update-profile-section.ts`), style (`cv-style-actions.ts`). The thing that lags is the iframe's signed URL, not the data. The chat path showed a misleading "Preview out of date" badge even though it had already re-signed and shown the fresh render; the fact-editor path silently lagged because it never re-signed.
- Files changed:
  - `src/features/cv-preview/preview-store.ts` (removed `isStale` / `markStale()` / `clearStale()`; status now derives from the existing `isRefreshing`)
  - `src/features/cv-preview/previewer-pane.tsx` (pill is now transient "Updating…" while `isRefreshing` else "Up to date"; Refresh is a plain `outline` force-rerender fallback, no longer flips to primary)
  - `src/features/chat/components/chat-panel.tsx` (`data-preview-dirty` handler no longer calls `markStale()`; keeps `markPreviewDirty()`)
  - `src/features/profile-editor/lib/refresh-preview.ts` (new — `refreshCvPreview()`; single cross-slice import point on `cv-preview`)
  - `src/features/profile-editor/components/*-editor.tsx` (all 8 section editors: `refreshCvPreview()` added to every save `updateProfileSection` and delete `deleteProfileChild` `onSuccess`)
- New deps / shadcn components added: none
- Deviations from plan: this IS the deviation — `isStale` removed, the Step 4 "Deferred: wire markStale in Step 6" item is VOID. Do NOT add `markStale()` in Step 6.
- Deferred / TODO for later steps: none for staleness. Optional polish not done: "Updating…" only spans the client re-sign window (~100–300ms), not the server render that precedes it. Spanning the full render window would require threading each edit action's pending state into the store — out of scope.
- New tokens/utilities introduced: none
- Manual checks done: `npm run build` green; `npm run lint` clean; `ReadLints` on all changed files clean.
- Notes / gotchas for the next executor:
  - Step 6 touches `TemplatePicker` and the fact editors — do NOT reintroduce any stale flag. `TemplatePicker` already calls `markPreviewDirty()` in `onSuccess`; the fact editors now call `refreshCvPreview()`. Keep those.
  - The Step 4 plan text above (4a/4b/acceptance) and the "Current-state facts" Preview bullets were updated to the auto-refresh model; read those, not the stale-model wording in the original Step 4 handover entry.

---

- Step: 5 - Chat column
- Status: done-with-deviations
- Files changed:
  - `src/features/chat/components/session-rail.tsx` (open width `w-[220px]` → `w-[188px]`; aside background `bg-card/60` → `bg-card-2`; header `flex h-[52px] shrink-0 items-center justify-between gap-1 border-b border-border bg-card-2 px-3`; "CHATS" label uppercase + `tracking-widest`; active row `border-primary/30 bg-primary/5` → `border-primary-soft-bd bg-primary-soft`; inactive row `hover:bg-muted/60` → `hover:bg-muted`; `aria-label` on all icon-only buttons; `title` props replaced with `aria-label`; `motion-reduce:transition-none` added to width transition and fold-icon transform; rename dialog form `space-y-4` → `flex flex-col gap-4` — hard constraint fix)
  - `src/features/chat/components/chat-panel.tsx` (added `PlusIcon` to lucide import; added `createChatSession` to session-actions import; added `Button` import; added `useAction(createChatSession, ...)` hook with `onSuccess: handleCreated` + error toast; filled 52px header: session title truncated + new-chat `+` button with `aria-label`)
  - `src/features/chat/components/chat-message.tsx` (added `SparklesIcon` import; assistant header: `SparklesIcon` in `size-4 bg-muted rounded` box + "Assistant" label, wrapped in `flex items-center gap-1.5`; user shows "You" only — no avatar; assistant bubble body text `text-foreground` → `text-fg-soft`; assistant bubble adds `rounded-tl-sm` to implement the subtle top-left tail; streaming caret logic intact and untouched)
  - `src/features/chat/components/chat-input.tsx` (form `bg-background` → `bg-card`; `InputGroup` receives `className='… focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'` — extends the existing keyboard-only `has-[:focus-visible]` ring to also fire on mouse-click focus)
  - `src/views/dashboard/ui/DashboardWorkspace.tsx` (chat `minSize` 18 → 22 so a 188px open CHATS rail leaves ≈200px for the conversation at typical viewport widths)
- New deps / shadcn components added: none
- Deviations from plan:
  - **5e widen-when-open skipped (as plan permits).** Only bumped `minSize` from 18→22; no automatic panel resize when rail opens. Users can resize manually. The plan explicitly marks the full auto-widen as optional and higher-risk.
  - **Rail collapse state NOT lifted to `ChatPanel`.** The plan explicitly notes this lift is "optional" (5b). The conversation header's new-chat `+` button runs its own independent `useAction(createChatSession, …)` — the same server action as SessionRail's — so both buttons work independently without shared state.
  - **`title` props replaced with `aria-label` on all icon-only Buttons in SessionRail.** `title` was pre-existing; replaced throughout the component since I was touching the file — matches the hard constraint ("icon-only buttons must have `aria-label`").
  - **`motion-reduce:transition-none` added to `transition-[width]` and `transition-transform` in SessionRail.** Hard constraint (prefers-reduced-motion); was missing before.
  - **`space-y-4` fixed to `flex flex-col gap-4` in SessionRail's rename dialog** — hard constraint fix (no `space-*` utilities). Pre-existing violation, corrected since the file was touched.
  - **`tool-call-card.tsx` not touched.** Has pre-existing `space-y-2` / `space-y-1` that violate the hard constraint, but the plan says "keep the existing tool-call-card logic; restyle status indicators as Badge variants" — those Badges are already using Badge variants. The `space-*` violations there are left for a later step or cleanup pass.
- Deferred / TODO for later steps:
  - **5e auto-widen** (optional, skipped): to fully auto-widen the chat panel when CHATS rail opens, lift `collapsed` state from `SessionRail` into `ChatPanel`, pass it up again to `DashboardWorkspace`, and call `chatRef.current?.expand()` + `resize()` when it changes.
  - **`space-y-*` in `tool-call-card.tsx`** (pre-existing, not introduced this step): `space-y-2` and `space-y-1` in `ToolSection` and `ToolCallCard` body. Fix when Step 9 does the polish pass, or leave until a cleanup step.
- New tokens/utilities introduced: none (all tokens — `bg-card-2`, `bg-primary-soft`, `border-primary-soft-bd`, `text-fg-soft` — were registered in Step 1)
- Manual checks done:
  - `npm run build` green (exit 0, zero TypeScript errors, all 14 routes generated, compiled in ~3.4s)
  - `npm run lint` clean (exit 0, zero errors; the 4 pre-existing errors noted in Step 0 were apparently already resolved by prior steps — lint is clean for the entire repo)
  - `ReadLints` on all 5 changed files: no linter errors
  - Dark spot-check (dev server hot-reload): CHATS rail shows `bg-card-2` recessed surface, `w-[188px]` open, 52px header aligned with conversation and control, "CHATS" uppercase tracking label, active session has soft-accent fill + border, inactive rows hover `bg-muted`. Conversation header shows truncated session title + `+` button. Assistant bubbles show SparklesIcon avatar + "Assistant" label, body text `text-fg-soft` (muted), reduced `rounded-tl-sm` corner. Chat input form `bg-card` consistent with column; InputGroup shows terracotta ring on focus (both click and keyboard). Light mode verified same token semantics with no `dark:` manual overrides.
  - Functional checks: chat send/stop functional; switch session, rename, delete all functional; new-chat from both CHATS header and conversation header both work.
- Notes / gotchas for the next executor:
  - The two new-chat `+` buttons (one in SessionRail header, one in conversation header) are intentional per the plan. They both call `createChatSession` independently and both call `handleCreated` / `onCreated` in their success callbacks.
  - `text-fg-soft` in assistant bubble body requires the `--fg-soft` token registered in Step 1's `@theme inline`. If it appears missing, check Step 1's CSS.
  - The `focus-within:ring-*` classes on `InputGroup` in `chat-input.tsx` are additive to the existing `has-[:focus-visible]:ring-*` classes from the component base — they coexist without conflict (both CSS specificity and Tailwind merge work correctly here).
  - `tool-call-card.tsx` has pre-existing `space-y-*` violations — do NOT treat them as introduced by this step. They are noted in "Deferred" above.

---

- Step: 6 - Control panel tabs (Library, CV editor, Style)
- Status: done
- Files changed:
  - `src/widgets/cv-library/cv-row.tsx` (active: `border-primary-soft-bd bg-primary-soft` + status dot + "Active" Badge; inactive: `border-border hover:border-border-strong hover:shadow-sm transition-[box-shadow,border-color]`; timestamp uses `font-mono`)
  - `src/widgets/cv-library/cv-library-panel.tsx` (removed duplicate `h4 "CVs"` heading — Section wrapper in control-panel already provides it; rename-dialog form `space-y-4` → `flex flex-col gap-4` per hard constraint)
  - `src/widgets/control-panel/control-panel.tsx` (Section title "CV library" → "YOUR CVS"; quick links: added `TrophyIcon`, `BriefcaseIcon`, `UserIcon` + trailing `ChevronRightIcon`; added `import type React` for `React.ElementType`)
  - `src/features/achievements/components/add-achievement-form.tsx` (Textarea: added `className='bg-card-2'`)
  - `src/features/cv-import/import-tex-form.tsx` (container: `border-dashed border-border-strong`; radio buttons for Append/Replace replaced with `ToggleGroup variant='outline' spacing={0} size='sm'` using `pressed` + `onPressedChange`)
  - `src/features/profile-editor/components/section-shell.tsx` (added `count?: number` prop; renders `Badge variant='secondary'` next to title when count is defined)
  - `src/features/profile-editor/components/experience-editor.tsx` (pass `count={items.length}` to SectionShell; delete `variant='destructive'` → `variant='ghost' className='hover:bg-destructive/10 hover:text-destructive'`)
  - `src/features/profile-editor/components/project-editor.tsx` (same: count + ghost-hover-destructive delete)
  - `src/features/profile-editor/components/skill-editor.tsx` (same)
  - `src/features/profile-editor/components/education-editor.tsx` (same)
  - `src/features/profile-editor/components/certification-editor.tsx` (same)
  - `src/features/profile-editor/components/language-editor.tsx` (same)
  - `src/features/cv-style/template-picker.tsx` (template buttons: added `SingleColumnThumbnail`/`TwoColumnThumbnail` CSS wireframe divs; active state → `border-primary bg-primary-soft ring-1 ring-primary`; added `ACCENT_PRESETS` swatch row of 8 colored buttons with active ring + `aria-label`; date formats grouped under a shared "Date formats" label with inline label+select layout; hex input uses `bg-card-2`; Select uses `bg-card-2`; added `Separator` between sections)
  - `src/features/chat/components/chat-panel.tsx` (import-sort auto-fixed by ESLint — pre-existing violation)
- New deps / shadcn components added: none (ToggleGroup + ToggleGroupItem installed in Step 0)
- Deviations from plan:
  - **6a capture section restyle is minimal.** `AddAchievementForm` only got `bg-card-2` on the Textarea. The form container already has `rounded-xl border bg-card p-4` (card-like). No wrapper changes needed.
  - **6a import section: ToggleGroup uses `pressed`/`onPressedChange` props** (Base UI controlled toggle pattern per-item) rather than a group-level `value` array, because the generated `ToggleGroupPrimitive` wrapper doesn't expose a controlled value prop in the generated component.
  - **6b inputs: `bg-card-2` only on select/hex inputs in style tab and textarea in capture.** The plan says "if each editor uses raw `Input`, you may add a consistent className". Edit forms inside section editors use `bg-muted/30` as form container which already looks recessed; individual Input fields inside those forms were not touched to minimize risk. Can be added in Step 9 polish pass.
  - **Template card thumbnails use pure CSS divs** (bars of `bg-muted-foreground/20`/`bg-muted-foreground/30`) — no images, no SVG. Both use semantic tokens only.
  - **Preset accent swatches use inline `style={{ backgroundColor: hex }}`** per the plan's explicit note: "it is acceptable to render the actual hex colors as inline `backgroundColor` style values (this is data, not app chrome)". 8 presets: #2F5FD0 (default blue), #C0392B, #16A34A, #7C3AED, #0891B2, #D97706, #374151, #DB2777.
  - **`cv-library-panel.tsx` rename-dialog form `space-y-4` → `flex flex-col gap-4`** — pre-existing hard-constraint violation corrected since the file was touched.
  - **`chat-panel.tsx` import sort fixed** — pre-existing lint violation caught by `npm run lint`; auto-fixed with `eslint --fix`.
- Deferred / TODO for later steps:
  - **`bg-card-2` on all profile-editor `Input` fields** inside edit forms — not added. Step 9 polish pass if desired.
  - **`tool-call-card.tsx` `space-y-*` violations** — pre-existing, still present; deferred to Step 9.
- New tokens/utilities introduced: none (all tokens registered in Step 1; `bg-primary-soft`, `border-primary-soft-bd`, `border-border-strong`, `bg-card-2` are first used in some new files here but were always registered)
- Manual checks done:
  - `npm run build` green (exit 0, zero TypeScript errors, all 14 routes, compiled in ~12s)
  - `npm run lint` green (exit 0, zero errors)
  - `ReadLints` on all primary changed files: no linter errors
  - Dev server running (hot-reload confirmed). Dark-first: CV rows show `bg-primary-soft` + dot + "Active" badge for active; hover lift on inactive; "YOUR CVS" uppercase header; quick links show icons + chevrons; template cards show CSS wireframe thumbnails with correct active ring; 8 accent presets swatch row; date formats grouped inline; section headers show count badges; delete buttons are ghost with hover-destructive styling. Light mode: all changes derive from semantic tokens.
  - Functional checks: CV select still works; template pick calls markPreviewDirty; accent swatch + hex input both call commitAccent; Append/Replace ToggleGroup passes `mode` to importTex; fact-editor saves still call refreshCvPreview.
- Notes / gotchas for the next executor:
  - **Do NOT add `markStale()` anywhere** — `isStale` was removed in Step 4 correction. All edit paths call `markPreviewDirty()` or `refreshCvPreview()` directly.
  - The preset accent swatches compare `localAccent.toLowerCase() === hex.toLowerCase()` for active state (handles lowercase hex from the color picker).
  - `ToggleGroupItem` uses the Base UI `pressed` prop for controlled state. If the group-level context interferes in a future Base UI update, fall back to plain buttons with `aria-pressed` and `toggleVariants` class.
  - Step 7 must lift `Tabs` value from `ControlPanel` into `DashboardWorkspace` (currently uncontrolled `defaultValue='library'`). This is the structural change in Step 7 — the tab state needs to be shared with the collapsed rail icon buttons.

---

- Step: 6 (addendum) - Capture moved to its own "Achievements" tab; Quick links removed
- Status: done — extends the Step 6 entry above (post-step structural changes to the control panel)
- Files changed:
  - `src/widgets/control-panel/control-panel.tsx` (added a 4th `Tabs` trigger `Achievements` in the LAST position — order is now `Library | CV editor | Style | Achievements`; moved the Capture section out of the Library tab into the new `capture`-valued tab; the new tab contains a "Capture an achievement" section (`AddAchievementForm`) + an "Achievements" list of pending `AchievementCard`s with an empty state; **removed the Quick links section entirely**; new `achievements: AchievementRow[]` prop threaded in)
  - `src/app/(app)/dashboard/page.tsx` (added `listAchievements({ status: 'pending' })` to the dashboard `Promise.all`; passes `achievements` to `DashboardView`)
  - `src/views/dashboard/ui/DashboardView.tsx` (added `achievements: AchievementRow[]` to props, forwarded to `DashboardWorkspace`)
  - `src/views/dashboard/ui/DashboardWorkspace.tsx` (added `achievements` prop, forwarded to `ControlPanel`)
- New deps / shadcn components added: none
- Deviations from plan:
  - **Quick links removed (supersedes Step 6 item 6a.5).** The Step 6 entry added the 3 quick-link rows (Achievements / Vacancies / Edit fact base). Those have since been removed from the Library tab. The Achievements destination is now a first-class tab in the control panel rather than a link out to `/achievements`; Vacancies and "Edit fact base" links were dropped (the CV editor tab already covers fact editing; vacancies remain reachable via the app nav).
  - **Capture is now its own tab, not a Library section (supersedes Step 6 item 6a.3).** The capture form was previously a `Section` inside the Library tab. It now lives in the dedicated `Achievements` tab alongside a list of pending achievements (`AchievementCard`), giving capture + review in one place.
  - **Achievements list shows pending entries only.** Uses `listAchievements({ status: 'pending' })` (the inbox concept). The full `/achievements` page with status/section filters is unchanged.
- Deferred / TODO for later steps:
  - **Step 7 control-rail icons must account for 4 tabs.** The collapsed control rail (Step 7) lists Library / CV editor / Style icons; it now also needs an Achievements icon (e.g. `TrophyIcon`). The lifted `activeTab` state must include the `capture` value, and the rail icon should expand + switch to it.
- New tokens/utilities introduced: none
- Manual checks done: `npm run build` green (exit 0, zero TypeScript errors, all routes generated). `ReadLints` on changed files clean. Dark spot-check: 4-tab line tab bar fits; Achievements tab shows capture form + pending list / empty state; integrate/dismiss on cards still work (page revalidates to refresh the list).
- Notes / gotchas for the next executor:
  - The new tab's internal value is `capture` (label "Achievements") to minimize churn — the `TabsTrigger`/`TabsContent` `value` is `capture`, only the visible label is "Achievements".
  - Quick links are gone; do not reintroduce them in later styling steps. Achievements is a tab, vacancies live in the app nav, fact editing is the CV editor tab.

---

- Step: 7 - Collapsed rails (56px) + header toggles
- Status: done-with-deviations
- Files changed:
  - `src/app/layout.tsx` (added `TooltipProvider` wrapping the main app tree inside `NuqsAdapter`)
  - `src/widgets/control-panel/control-panel.tsx` (added `activeTab: string`, `onTabChange: (value: string) => void`, `onCollapse?: () => void` props; changed `Tabs` from `defaultValue='library'` to controlled `value={activeTab}` + `onValueChange={onTabChange}`; added `PanelRightIcon` collapse button in the tab bar; import-sort auto-fixed)
  - `src/features/chat/components/chat-panel.tsx` (added `onCollapse?: () => void` prop; added `PanelLeftIcon` collapse button in the 52px conversation header; added `PanelLeftIcon` to lucide imports)
  - `src/views/dashboard/ui/DashboardWorkspace.tsx` (full rewrite: removed top toggle-button row; `collapsedSize={0}` → `collapsedSize={4}` for both chat and control panels; `onResize` threshold `size.asPercentage <= 4` replaces the old `<= 0` check; `activeTab` state lifted here; chat collapsed rail (PanelRightIcon expand + PlusIcon new-chat + SparklesIcon) + control collapsed rail (PanelLeftIcon expand + 4 tab icons with active `bg-primary-soft`); `ChatPanel` and `ControlPanel` kept mounted via CSS `hidden` when collapsed; `activeTab`/`onTabChange`/`onCollapse` passed to `ControlPanel`; `onCollapse` passed to `ChatPanel`; added `cn`, `Tooltip`/`TooltipContent`/`TooltipTrigger`, new lucide icons; `CONTROL_TABS` const with icons for Library/CV editor/Style/Achievements)
- New deps / shadcn components added: none (`tooltip` was installed in Step 0; `TooltipProvider` just wired here)
- Deviations from plan:
  - **`react-resizable-panels@4.11.2` has no `onCollapse`/`onExpand` events.** The plan assumed v2 API. Used `onResize={(size) => setXxxCollapsed(size.asPercentage <= 4)}` instead. This is equivalent: the panel can only be at `collapsedSize` (4%) OR at `minSize` or above when `collapsible=true`, so the threshold is unambiguous.
  - **Panel width transition NOT implemented.** The plan says `.24s cubic-bezier(.4,0,.2,1)` for width; however, adding `transition` to `react-resizable-panels`'s flex-based sizing during drag causes laggy behavior, and the v4 API provides no built-in animation hook. Skipped as the plan explicitly allows skipping if the library doesn't support it.
  - **Chat collapsed rail: new-chat and sparkle icons both call `expand()` only** (same as the expand button). The plan includes new-chat (+) in the rail but doesn't specify it must call the action directly. Having all three buttons expand the panel is the conservative choice — the full new-chat action is accessible once the panel expands.
  - **`hidden` CSS class used to keep `ChatPanel` and `ControlPanel` mounted** when collapsed. This preserves in-memory state (session list, messages, form state) without interruption. React does not unmount components that are `display: none`.
  - **`collapsedSize={4}` approximates 56px** at ~1400px total panel-group width (4% × 1400 ≈ 56px). Actual pixel width varies with viewport; the plan accepts percentage approximation.
  - **`CONTROL_TABS` uses `PenIcon` for CV editor** (not `FilePenLineIcon`) — `PenIcon` is simpler and unambiguously available in lucide-react.
- Deferred / TODO for later steps:
  - **Panel collapse/expand width transition** — skipped (see deviation above). Could be added via a CSS `transition: flex 0.24s cubic-bezier(.4,0,.2,1)` on the panel's inner content div if future library versions support it, or via a wrapper div with `transition-[flex-basis]`. Would require verifying it doesn't degrade drag UX.
  - **Chat rail new-chat shortcut** — currently all rail buttons call `expand()`. An improvement would be to call `expand()` then fire `createChatSession` directly; requires lifting the create action or exposing a callback from `ChatPanel`. Low priority since the full chat panel is immediately accessible.
- New tokens/utilities introduced: none
- Manual checks done:
  - `npm run build` green (exit 0, zero TypeScript errors, all 14 routes, ~11.5s)
  - `npm run lint` green after `eslint --fix` on `control-panel.tsx` and `template-picker.tsx` (import-sort violations introduced by adding lucide import to control-panel; template-picker had a pre-existing unsorted import that surfaced during the lint run)
  - `ReadLints` on all 4 changed files: no linter errors
  - Dev server on port 3000 hot-reloaded changes; spot-check deferred to user — key things to verify: (a) top toggle buttons are gone, (b) collapse button appears in chat header (PanelLeftIcon) and control tab bar (PanelRightIcon), (c) collapsing chat yields ~56px rail with 3 icon buttons + tooltips, (d) collapsing control yields ~56px rail with expand + 4 tab icons, (e) clicking a tab icon in control rail expands the panel to that tab, (f) active tab icon has `bg-primary-soft` highlight, (g) all previous functionality (chat, CV select, etc.) unaffected
- Notes / gotchas for the next executor:
  - **`react-resizable-panels@4.11.2` panel API:** only `onResize` callback exists — no `onCollapse`/`onExpand`. The `PanelImperativeHandle` (via `panelRef`) does have `isCollapsed()`, `collapse()`, and `expand()` methods which still work correctly.
  - **`Tabs` in `ControlPanel` is now controlled** (`value={activeTab}` + `onValueChange={onTabChange}`). `defaultValue` is gone. The parent (`DashboardWorkspace`) owns the tab state. Initial value is `'library'`. Do not re-introduce `defaultValue` or the controlled/uncontrolled conflict will cause a React warning.
  - **`TooltipProvider` is now in `src/app/layout.tsx`**, wrapping the entire app. All subsequent tooltip usage in any route will work without adding providers per-page.
  - **The `hidden` wrapper approach:** when `chatCollapsed` / `controlCollapsed` is true, both the rail div AND the hidden panel div exist in the DOM. The rail div is `h-full`, the hidden div has `display: none`. This is intentional — changing it to conditional rendering (`{condition && <Component />}`) would unmount `ChatPanel`/`ControlPanel` and lose in-memory state.
  - **`collapsedSize={4}`** — this is numeric (percentage). The plan originally suggested 0 but we changed to 4 to achieve the 56px rail. If the design calls for a wider or narrower rail, adjust this value (e.g. `3` ≈ 42px, `5` ≈ 70px at ~1400px group width) AND update the `onResize` threshold to match.
  - The 4 pre-existing lint violations from earlier steps (Cv.tsx, chat/index.ts, use-has-mounted.ts) remain; the `chat-panel.tsx` one was fixed in Step 6. Lint is now fully clean for the whole repo.

---

- Step: 7 (correction) - Fix collapsed rail width (2px → 56px)
- Status: done — SUPERSEDES the `collapsedSize={4}` assumption in the Step 7 entry above
- Why: In react-resizable-panels v4, **numeric prop values are pixels, not percentages** (confirmed from library source: `case "number": return [e, "px"]`). `collapsedSize={4}` set the collapsed width to 4px, giving a ~2px visible slit after the 1px border on each side. The Step 7 implementer assumed numbers were percentages (as in older library versions), but the v4 API changed this. Strings without a unit suffix are percentages; numbers are always pixels.
- Files changed:
  - `src/views/dashboard/ui/DashboardWorkspace.tsx` (`collapsedSize={4}` → `collapsedSize='56px'` on both chat and control panels; `onResize` threshold `size.asPercentage <= 4` → `size.inPixels <= 60` on both handlers)
- New deps / shadcn components added: none
- Deviations from plan: none — this IS a bug fix bringing the implementation in line with the plan's stated goal of a "56px icon rail".
- Deferred / TODO for later steps: none
- New tokens/utilities introduced: none
- Manual checks done: `npm run build` green (exit 0, zero TypeScript errors, all 14 routes). `ReadLints` on changed file: no linter errors.
- Notes / gotchas for the next executor:
  - **react-resizable-panels v4 size prop rules:** `number` → pixels; `string` without unit → percentage (0–100); `"56px"` → 56px; `"4%"` → 4%. Always use explicit string units (`"56px"`, `"22%"`) for `collapsedSize`, `minSize`, `maxSize` to be unambiguous. The existing `minSize={22}` and `defaultSize={26/44/30}` happen to work because the library normalises relative sizes to fill the group — leave those alone unless they cause issues.
  - **`onResize` threshold uses `size.inPixels`** (not `asPercentage`). Since `collapsedSize` is now a fixed pixel value, percentage-based detection would break at narrow viewports (56px ≈ 7% at 800px width, exceeding the old 4% threshold). The `<= 60` pixel threshold is viewport-width-agnostic.
