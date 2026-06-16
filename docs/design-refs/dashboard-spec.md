# CVere Dashboard — Visual Spec

Polish spec for the CV editor workspace. Structure, column order, tabs, and the single-header
layout are unchanged from the original; this document covers the refined styling, dimensions, and
states. Reference implementation: `CVere Dashboard.dc.html`.

---

## 1. Foundations

### Theme tokens (oklch semantic)
Defined once on `:root` (light) and `:root[data-theme="dark"]`; every surface reads from these.
The **app chrome accent is a muted terracotta**; the **CV document keeps its own blue accent**
(`#2F5FD0`, editable in Style) — the two are intentionally separate.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `oklch(0.985 0.003 70)` | `oklch(0.165 0.008 60)` | App background, preview gutter base |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0.009 60)` | Header, columns, cards |
| `--card-2` | `oklch(0.978 0.004 70)` | `oklch(0.238 0.01 60)` | Recessed surfaces, inputs, CHATS rail |
| `--muted` | `oklch(0.955 0.006 65)` | `oklch(0.262 0.011 60)` | Hover fills, chips, segmented track |
| `--muted-fg` | `oklch(0.53 0.012 60)` | `oklch(0.68 0.012 65)` | Secondary text, icons |
| `--fg` | `oklch(0.22 0.012 60)` | `oklch(0.955 0.005 75)` | Primary text |
| `--fg-soft` | `oklch(0.38 0.012 60)` | `oklch(0.80 0.008 70)` | Body copy |
| `--border` | `oklch(0.905 0.006 65)` | `oklch(0.305 0.012 60)` | Dividers, card borders |
| `--border-strong` | `oklch(0.85 0.008 65)` | `oklch(0.39 0.014 60)` | Inputs, outline buttons |
| `--primary` | `oklch(0.635 0.145 41)` | `oklch(0.725 0.13 43)` | Accent: active, primary buttons |
| `--primary-fg` | `oklch(0.99 0.012 70)` | `oklch(0.16 0.012 60)` | Text on accent |
| `--primary-soft` | `oklch(0.966 0.026 49)` | `oklch(0.31 0.038 43)` | Active card / hint fills |
| `--primary-soft-bd` | `oklch(0.89 0.048 45)` | `oklch(0.42 0.062 43)` | Borders on soft accent |
| `--gutter` | `oklch(0.93 0.005 65)` | `oklch(0.13 0.006 60)` | PDF canvas behind paper |

### Type
- UI: **Geist** (400/500/600/700). Mono: **Geist Mono** (CV id chips, hex, filename, timestamps).
- CV document: **Georgia / serif** (mimics the rendered LaTeX CV).
- Sizes: section labels 10.5–11px uppercase `letter-spacing .07em`; body 13–14px; tab labels 14px;
  card titles 14px; meta 11–12px.

### Spacing & radii
- **Spacing scale:** `4 · 8 · 12 · 16 · 20 · 24` px.
- **Radii:** controls/inputs `6` · buttons `7–8` · cards `10–11` · pills/badges `999`.
- **Shadows:** `--shadow` (resting cards/segmented active) · `--shadow-pop` (floating review control).

---

## 2. Layout dimensions

Full-viewport, no page scroll. Vertical stack: header → workspace row. Each region scrolls internally.

| Region | Height / Width | Min | Collapsed | Notes |
|---|---|---|---|---|
| **Header** | 56px (Variant C: 53px bar + 3px accent hairline = 56px) | — | n/a | Single line, never wraps |
| **Column toolbars** (chat header, preview toolbar, panel tab bar) | 52px | — | — | Consistent across all three columns |
| **Embedded PDF chrome** (in preview) | 38px | — | — | Dark strip mimicking the pdf.js toolbar |
| **Chat column** | 324px | 320px | **56px** rail | Widens to **512px** when CHATS selector is open |
| ↳ CHATS selector sub-column | 188px | — | folds away | Lives inside the chat column, left of the conversation |
| ↳ Conversation sub-column | flex | 300px | — | — |
| **Preview column** | flex (fills remainder) | ~480px | **never collapses** | Widest region |
| **Control panel** | 384px | 320px | **56px** rail | — |

Collapse/expand transition: `width .24s cubic-bezier(.4,0,.2,1)`.

---

## 3. Chrome variants (header + collapse affordance)

Three explorations share the same body; only the header bar and toggle placement differ.
**Default: Variant C.**

- **A · Segmented** — tabs in a pill segmented control; CV selector pill + status dot; collapse
  toggles live inside each column's header.
- **B · Global** — underline tabs; collapse toggles surfaced at the header's far-left (chat) and
  far-right (panel) edges, so they're reachable even when a column is collapsed; column headers omit
  their own toggle.
- **C · Command** *(default)* — 3px accent hairline along the top edge; uppercase `CVERE` wordmark
  with filled mark; underline tabs; prominent CV selector pill (status dot + monospace id
  `2e9344d5`); New CV button with a soft accent glow (`box-shadow: 0 0 0 4px var(--primary-soft)`).
  Collapse toggles in column headers.

The bottom-left **review control** (meta, not product) switches chrome A/B/C and toggles theme.

---

## 4. Component list per region

### Header
Logo / wordmark · primary tab bar (Previewer · CV editor · Achievements · Vacancies) · CV selector
(name + status dot + mono id + chevron) · New CV (primary) · theme toggle (sun/moon) · account avatar.
Variant B also: edge collapse toggles.

### Chat column
- **CHATS selector** (foldable): "CHATS" label · new-chat (+) · fold toggle · session list rows
  (title + timestamp, active row = `--primary-soft` fill + accent border).
- **Conversation header** (52px): history/list toggle · session title (truncates) · new-chat (+) ·
  collapse toggle.
- **Message list**: assistant bubbles (sparkle avatar + "ASSISTANT" label, `--muted` fill, tail
  top-left) · user bubbles (right-aligned, `--primary` fill) · inline status chips.
- **Composer** (pinned bottom): bordered input (focus-within accent ring) · attach (ghost) · send
  (primary square).

### Preview column (never collapses)
- **Toolbar** (52px): "CV" label · CV name · mono id chip · **out-of-date hint** (pulsing accent dot
  + "Preview out of date" pill; flips to a check + "Up to date" after refresh) · **Refresh**
  (primary when dirty, outline when clean) · divider · Undo · Redo (disabled-look) · Open (outline,
  external-link icon).
- **Embedded PDF chrome** (38px, dark): hamburger · mono filename · page `1 / 2` · zoom −/125%/+ ·
  download · print.
- **Canvas**: `--gutter` background, centered white paper (max 660px) with serif CV content and the
  document's blue accent rules.

### Control panel — tabs: Library · CV editor · Style
- **Library** *(default tab)*: "YOUR CVS" list (active card = accent border + soft fill + dot +
  "Active"; others = neutral, hover lift, "…" menu, "Open") · **Capture an achievement** (textarea +
  Capture primary) · **Import** (dashed drop-zone, Choose files, Append/Replace segmented) ·
  **Quick links** (Achievements · Vacancies · Edit fact base, icon + chevron rows).
- **CV editor**: stacked form section cards (Summary, Contact, Experience, Skills, Projects,
  Education, Certifications, Languages). Section header = label + count badge + Add. Experience/skill
  rows have edit + delete (delete = red hover). Inputs use `--card-2` + focus accent ring.
- **Style**: template picker (two selectable cards with wireframe thumbnails; active = accent ring) ·
  accent-color row (preset swatches + hex, **document** accent, default `#2F5FD0`) · Education-dates
  select · Certification-dates select.

---

## 5. Panel / column states

| State | Chat | Control panel |
|---|---|---|
| **Default** | Open 324px, CHATS selector open → 512px, conversation visible | Open 384px, Library active |
| **List folded** | 324px, conversation full-width | — |
| **Active tab** | session highlighted in CHATS list | underline + bold on Library/CV editor/Style |
| **Hover** | session rows + list items get `--muted` fill | cards/links get `--muted` fill or border-strong |
| **Collapsed (rail, 56px)** | expand · new-chat · sparkle · avatar stack | expand · Library/CV editor/Style icon buttons (active = soft fill + accent) — clicking an icon expands to that tab |
| **Empty** | — | Import drop-zone; capture placeholder text |
| **Loading** | (skeleton bubbles) | (skeleton cards) |
| **Preview** | — | never collapses; out-of-date hint communicates manual-refresh model |

---

## 6. Responsive (< lg)

Preview never collapses. Below the `lg` breakpoint, side regions become overlay drawers in priority
order:
1. **Control panel** collapses to a drawer first.
2. **Chat** collapses to a drawer second.
3. **Preview** always remains as the persistent center region.

Collapsed-rail icon affordances remain available to reopen each drawer.
