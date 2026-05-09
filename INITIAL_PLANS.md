# Project: CV AI helper (web app)

## Purpose
A personal CV operating system with a UI. One truthful fact base (Profile), an achievements inbox, vacancy-driven tailored CVs and cover letters, and a separate critique store. Optional interview prep on the same fact base.

The AI assistant edits, tailors, and critiques content under strict no-fabrication rules. Never invents facts. Tailors by emphasis, not exaggeration.

## Stack

### In scope (v1)
- Next.js 16 App Router, Turbopack, React 19, TypeScript 6 strict.
- Tailwind CSS 4, shadcn/ui (base-nova), @base-ui/react, lucide-react, sonner.
- next-safe-action + Zod 4 for all mutations.
- nuqs for URL-driven UI state.
- Supabase: Postgres, Auth, Row Level Security, Storage. SQL migrations in `supabase/migrations`.
- AI provider: stub first, Azure OpenAI later. Selected by env, single interface.
- PDF rendering: `@react-pdf/renderer`.
- ESLint 9, Prettier 3, PostCSS, Vercel Analytics, Node 20+.

### Out of scope for v1 (present in boilerplate, do not wire into features)
- Stripe (Checkout, Subscriptions, Customer Portal, webhooks).
- React Email + Resend.
- Any billing, plan, or transactional email logic.

Reintroduce only if the project becomes multi-tenant or commercial.

## Source-of-truth hierarchy

1. `profile` — canonical facts.
2. `achievement_log_entry` — new facts not yet integrated.
3. `job_description` — tailoring input only, never truth about the user.
4. `tailored_cv`, `cover_letter` — derived presentation, never overwrite facts.
5. Exports (PDF) — derived from presentation rows.

Facts update before or alongside presentation. Presentation never overwrites facts.

## Domain model (Postgres + RLS)

All tables include `user_id uuid references auth.users` and an RLS policy `user_id = auth.uid()`.

- `profile` (1 row per user): `summary text`, plus normalized children with `position int` for ordering:
  - `experience`, `project`, `skill`, `education`, `certification`, `language`.
- `achievement_log_entry`: append-only.
  - `raw_text`, `normalized_text`, `target_section`, `status` enum(`pending`, `integrated`, `dismissed`), `integrated_at`.
- `job_description`: vacancy input.
  - `company`, `role`, `raw_text`, `extracted` jsonb (`requirements`, `stack`, `seniority`, `keywords`, `ownership`).
- `tailored_cv`: derived variant.
  - `job_description_id`, `profile_snapshot` jsonb (frozen at creation), `sections` jsonb, `status` enum(`draft`, `final`), `slug` text, `pdf_path` text nullable.
- `cover_letter`: derived variant.
  - `job_description_id`, `body text`, `slug`, `pdf_path`.
- `advice_note`: critique store, never auto-applied.
  - `target` enum(`summary`, `experience`, `projects`, `skills`, `education`, `certs`, `languages`, `global`),
  - `target_ref_id` uuid nullable,
  - `severity` enum(`info`, `weak`, `gap`),
  - `text`, `status` enum(`open`, `applied`, `dismissed`).
- `interview_answer`, `interview_advice`: parallel track for spoken material.

Constraints:
- `achievement_log_entry.status = 'integrated'` requires `integrated_at not null`.
- Application logic enforces: `tailored_cv` and `cover_letter` never mutate `profile`.

## Required user flows

1. Edit profile. The only place that mutates canonical facts.
2. Add achievement -> normalize -> append to log -> integrate into profile on explicit action.
3. Ingest job description -> extract requirements -> diff against profile (matches / weak / gaps).
4. Tailor CV from a job description -> create `tailored_cv` draft from a profile snapshot.
5. Generate cover letter from a job description -> tailored, short, truthful.
6. Review CV -> writes `advice_note` rows, no profile edits.
7. Apply or dismiss advice explicitly.
8. Export `tailored_cv` or `cover_letter` to PDF, store in Supabase Storage, save `pdf_path`.
9. Interview prep mirrors CV review on a separate track.

## Server-action surface

All mutations go through `next-safe-action` with Zod schemas. No client-side direct DB writes.

- `addAchievement(input)`
- `integrateAchievement(id)`
- `dismissAchievement(id)`
- `updateProfileSection(section, payload)`
- `ingestJobDescription({ rawText, company?, role? })`
- `tailorCv(jobDescriptionId)`
- `generateCoverLetter(jobDescriptionId)`
- `reviewCv()`
- `applyAdvice(id)`
- `dismissAdvice(id)`
- `exportPdf({ kind: 'tailored_cv' | 'cover_letter', id })`
- `addInterviewAnswer(input)`
- `reviewInterview()`
- `applyInterviewAdvice(id)`, `dismissInterviewAdvice(id)`

Every LLM-backed action validates LLM output with Zod before persisting.

## Route map (App Router)

- `/` dashboard: profile completeness, pending achievements, open advice, recent tailored variants.
- `/profile` master editor (only place that mutates facts).
- `/achievements` inbox with integrate / dismiss actions.
- `/jobs` list of job descriptions.
- `/jobs/[id]` JD view + diff against profile + actions: tailor CV, generate cover letter.
- `/tailored/[id]` tailored variant editor, branches from profile, cannot edit master.
- `/letters/[id]` cover letter editor + export.
- `/advice` review panel grouped by section.
- `/interview` answers + advice.

Use `nuqs` for filter and sort state in list views.

## UI conventions

- One canonical "fact editor" component for profile sections, reused read-only with emphasis in tailored views.
- JD diff view: three columns — matches, weak matches, gaps — backed by `extracted` jsonb.
- Advice rendered as inline annotations next to bullets, with explicit Apply / Dismiss buttons. Never auto-apply.
- `sonner` for action feedback. No silent overwrites.
- Four visually distinct zones: Facts, Presentation, Advice, Inputs. No cross-zone silent edits.
- Lowercase snake_case for output filenames, e.g. `triodos_backend_engineer_cv.pdf`.

## AI provider

Stub first, Azure OpenAI later, single interface.

### Layout
- `src/lib/ai/types.ts` — Zod schemas for every input and output.
- `src/lib/ai/provider.ts` — `AiProvider` interface, one method per task.
- `src/lib/ai/stub.ts` — default deterministic implementation.
- `src/lib/ai/azure.ts` — real implementation, added later.
- `src/lib/ai/index.ts` — factory selecting by `AI_PROVIDER` env.

### Contract
- `extractJobDescription(rawText)` -> `{ requirements, stack, seniority, keywords, ownership }`
- `normalizeAchievement(rawText)` -> `{ normalizedText, suggestedSection }`
- `tailorCv({ profile, jd })` -> `{ summary, sections }`
- `generateCoverLetter({ profile, jd })` -> `{ body }`
- `reviewProfile({ profile })` -> `AdviceNote[]`
- `interviewAnswer({ profile, question })` -> `{ answer }`
- `interviewReview({ answers })` -> `AdviceNote[]`

### Rules
- Every method validates output with Zod before returning. This guard survives the stub-to-Azure swap.
- No direct LLM calls outside `src/lib/ai`. Server actions consume the provider only.
- Stub is deterministic: same input -> same output.
- Stub outputs include `[STUB]` markers in user-visible strings.
- Stub simulates latency (300-800ms) and optional failure via `AI_STUB_FAILURE_RATE`.
- UI shows a visible "Stubbed AI" badge whenever stub provider is active.

### Env
- `AI_PROVIDER=stub | azure`
- Later: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`.

## PDF rendering

- Library: `@react-pdf/renderer`.
- Location: `src/pdf/`. Parallel component set, not shared with shadcn UI.
- Components: `Cv.tsx`, `CoverLetter.tsx`, plus shared primitives (`Section`, `Bullet`, `Header`, `Sidebar`).
- Theme tokens centralized in `src/pdf/theme.ts` (page size, margins, colors, typography).
- Fonts registered once at module scope. No per-request registration.
- Single server action `exportPdf({ kind, id })`:
  1. Loads `tailored_cv` or `cover_letter` from Supabase.
  2. Renders to buffer with `renderToBuffer`.
  3. Uploads to Supabase Storage at `pdf/{user_id}/{slug}.pdf`.
  4. Saves `pdf_path` on the row.
- Future option (out of scope for v1): a Tectonic worker reusing existing LaTeX templates for higher-fidelity typography.

Do not try to reuse shadcn components inside PDF. Different rendering model.

## Architecture rules

- All mutations go through `next-safe-action` with Zod.
- RLS on every table: `user_id = auth.uid()`.
- Server components for read paths. Client components only when interactive.
- `nuqs` for filter and sort state.
- One canonical fact editor reused read-only in tailored views.
- LLM outputs validated with Zod before persisting.
- No direct DB writes from the client.
- No LLM calls outside `src/lib/ai`.

## Hard rules for AI-driven editing

- Never invent facts, metrics, dates, technologies, ownership, titles, or impact.
- Mark missing data explicitly as `[MISSING]`. Do not guess.
- Tailor by emphasis, ordering, and wording. Not by exaggeration.
- `advice_note` never merges into `profile` or `tailored_cv` unless the user clicks Apply.
- `tailored_cv` and `cover_letter` never mutate `profile`.
- Tone: concise, recruiter-focused. No hype, clichés, or first-person filler in CV bullets.
- Avoid generic soft-skill claims ("hardworking", "passionate", "team player", "results-driven", "go-getter").
- Prefer concrete evidence over abstract qualities.

## Non-goals for v1

- No billing, no Stripe flows, no transactional email.
- No automatic merging of advice into CV content.
- No tailored variant editing the master profile.
- No fabricated metrics or experience.
- No multi-tenant features beyond what RLS already gives for free.

## Default chat output order (for AI replies in this repo)

1. Updated files
2. Revised content
3. Missing information
4. Advice / notes

## Communication style (for AI replies in this repo)

- Concise, direct, efficient.
- No emojis.
- No filler, hype, or motivational language.
- Short paragraphs, compact lists.
- Start with the result.
- Ask clarifying questions only when needed to avoid factual mistakes.