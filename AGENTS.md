# AGENTS.md

CV operating system built with Next.js 16 (App Router), React 19, Supabase, Stripe, Tailwind CSS 4, and shadcn/ui (Base Nova). TypeScript 6 strict mode.

The user owns one or more CVs (normalized `cv` + section rows). The chat agent at `POST /api/chat` is the only AI surface — it edits the selected CV in place via tools and re-renders the PDF preview. Every other feature (achievements, vacancies, profile editor) is manual CRUD.

## Next.js Documentation

This project uses Next.js 16 (App Router). The complete, version-accurate documentation is bundled with the installed package:

    node_modules/next/dist/docs/

Read these docs before making changes to routing, data fetching, caching, middleware, or any Next.js API. They match the exact version installed in this project and supersede any training data you may have.

### Key sections

- `01-app/01-getting-started/` — Installation, project structure, layouts, pages, server/client components, data fetching, caching, error handling, middleware, deployment
- `01-app/02-guides/` — Authentication, analytics, CSS-in-JS, content security policy, internationalization, testing, and more
- `01-app/03-api-reference/` — Config options (`next.config.js`), file conventions, functions, components, CLI
- `03-architecture/` — Build system, rendering strategies, caching internals

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint (flat config)
- `npm run stripe:listen` — Forward Stripe webhooks to localhost
- `npm run email:dev` — React Email preview (port 3001)
- `npm run generate-types` — Regenerate Supabase types
- `npm run migration:new <name>` — Create migration
- `npm run migration:up` — Run migrations + regenerate types

After code changes, always run `npm run build` to verify no type errors or build failures. The build also surfaces stale `.next/dev` route artifacts after deletions — clear `.next/` if a deleted route trips type-check.

## Project Structure

This codebase follows [Feature-Sliced Design](docs/feature-sliced-design.md). See also `.cursor/rules/feature-sliced-design.mdc` for condensed conventions.

Layer import direction (downward only): `views` → `widgets` → `features` → `entities` → `shared`. No same-layer cross-slice imports. Each slice exposes a single `index.ts` public API; external code must import through it, not via deep paths. Exception: client components that need a client-safe sub-module from a slice whose barrel also re-exports `server-only` code must use direct deep paths (the barrel itself is server-consumer only in those slices).

```
src/
├── app/                          # Next.js routing only (thin wrappers + data fetching)
│   ├── (auth)/                   # login/, signup/, auth/callback
│   ├── (account)/                # account/, manage-subscription/
│   ├── (app)/                    # Protected shell; imports widgets + views
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── achievements/
│   │   ├── vacancies/ + [id]/
│   │   └── layout.tsx
│   └── api/
│       ├── chat/route.ts         # Streaming chat agent (only AI surface)
│       └── webhooks/route.ts     # Stripe webhook handler
├── views/                        # Page-level compositions (named *View exports)
│   ├── dashboard/, profile/, achievements/
│   ├── vacancies/, vacancy-detail/
│   ├── account/, home/
├── widgets/                      # Multi-feature composed UI blocks
│   ├── app-nav/                  # App shell nav + account-menu
│   ├── cv-library/               # CV list panel
│   └── previewer-sidebar/        # Sidebar tabs (Library + Chat)
├── features/                     # User-action slices
│   ├── auth/                     # Login/signup UI + server actions
│   ├── chat/                     # Chat agent: tools, storage, system-prompt, UI
│   │   ├── tools/                # CV mutation, read, & metadata tools
│   │   └── storage/              # chat_message persistence
│   ├── cv-management/            # CV CRUD actions (create, rename, delete, duplicate)
│   ├── cv-history/               # Undo/redo: version service + history-controls UI
│   ├── cv-style/                 # Template picker + style actions
│   ├── cv-preview/               # Render, sign URL, preview store
│   ├── cv-import/                # TeX import parser + form
│   ├── profile-editor/           # Fact-base editor: actions, components, schemas
│   ├── achievements/             # Achievement actions, service, components
│   └── vacancies/                # Job description actions + components
├── entities/                     # Domain models + data-access (no UI)
│   ├── cv/                       # cv-service (~1800 ln), cv-snapshot, cv-diff,
│   │   │                         # list-cv-library, get-cv-children
│   │   └── pdf/                  # @react-pdf/renderer templates + LM Roman fonts
│   ├── user/                     # get-session, get-user
│   ├── subscription/             # Stripe subscription controllers
│   ├── achievement/              # listAchievements, schemas
│   └── job/                      # listJobs, getJob, schemas
├── shared/                       # Cross-cutting infrastructure, zero business logic
│   ├── ui/                       # shadcn/ui components (Base Nova, Base UI primitives)
│   ├── lib/                      # cn, logger, safe-action, format-date,
│   │                             # get-url, get-env-var, to-date-time, cv-json
│   ├── api/
│   │   ├── supabase/             # Server, middleware & admin clients + generated types
│   │   ├── stripe/               # stripeAdmin, upsert helpers
│   │   ├── ai/                   # chat-model, resumable-stream
│   │   ├── redis/
│   │   └── resend/
│   ├── config/                   # App name & description
│   ├── types/                    # Stripe webhook types
│   └── emails/                   # React Email templates
├── proxy.ts                      # Middleware (session refresh + route guards)
└── styles/globals.css            # Tailwind v4 + shadcn CSS variables (oklch)
```

Path alias: `@/*` → `./src/*`

### Accepted FSD deviations

- `shared/lib/safe-action.ts` imports `entities/user/get-session` — a `shared → entities` violation. Accepted for this structural pass; the auth middleware belongs in a dedicated infrastructure layer but extracting it is deferred.
- `app/` is kept as the Next.js routing layer only, not split into a separate FSD `app` layer.
- A small set of same-layer (feature → feature) cross-slice imports are accepted as deliberate compositions. The shared CV-render concern (`renderAndUploadCv`/`ensureCvPdfPath`/`buildProfileContact`) was lifted down to `entities/cv` to remove the largest cluster of these; the remainder are intentional and kept as deep imports (not enforced by the ESLint layer rules, which only block upward cross-layer imports):
  - `features/chat` is an orchestration surface and composes `features/{achievements,cv-style,profile-editor,cv-preview}` (tool wiring, schemas, preview store/target).
  - `features/cv-import` composes `features/{cv-style,profile-editor}` (TeX-import schemas + row parsing).
  - `features/{cv-style,cv-history,chat}` import the client `preview-store`/`preview-target` from `features/cv-preview` (shared client UI state for the previewer).
  - `features/profile-editor` and `features/cv-preview` import `features/cv-history` (`loadCvSnapshot`/`recordCvVersion`/`HistoryControls`) at CV-edit boundaries.

## Architecture — Project-Specific Decisions

### Chat is the only AI surface

- All AI calls go through `src/app/api/chat/route.ts`. It uses the AI SDK with the model from `src/shared/api/ai/chat-model.ts` and exposes tools defined in `src/features/chat/tools/`.
- All CV read, scope, and mutation logic lives in `src/entities/cv/cv-service.ts` and `src/entities/cv/cv-snapshot.ts`.
- The streaming chat agent discovers available CV variants using the `listCvs` metadata tool (defined in `src/features/chat/tools/cv-meta-tools.ts`), and can inspect or edit a specific CV by passing a `cvId` argument to the corresponding tools.
- Chat tools mutate CV normalized rows (`cv`, `experience`, `project`, `skill`, `education`, `certification`, `language`).
- Tool call sets that mutate the CV trigger `renderAndUploadCv` at the end of the assistant turn. The chat stream emits a `data-preview-dirty` event keyed by `cvId` so the previewer iframe re-signs the storage URL.
- `chat_message` rows persist the conversation per user. `loadMessages` hydrates the panel on dashboard load.
- **Do not add new AI entry points.** Achievements and vacancies are intentionally manual.

### CV undo/redo versioning

- Every CV edit boundary records one `cv_version` row: one per chat turn (collapsing all tool calls in an assistant reply) and one per manual profile-editor save. Each row stores a reversible structured diff (`computeCvDiff`/`applyCvDiff` in `src/entities/cv/cv-diff.ts`) of the `AiProfile` snapshot, not a full copy.
- `cv.history_seq` is the current position; version `seq = N` represents the transition `N-1 -> N`. Undo applies the inverse diff at `history_seq` and decrements it; redo applies the forward diff at `history_seq + 1` and increments it. History is pruned to the newest 100 versions and the redo branch is discarded on a new edit.
- Capture/restore logic lives in `src/features/cv-history/cv-version-service.ts`; server actions in `src/features/cv-history/cv-history-actions.ts`; UI in `src/features/cv-history/history-controls.tsx` (Undo/Redo buttons + Ctrl/Cmd+Z / Ctrl+Shift+Z / Ctrl+Y).

### Server Actions (next-safe-action)

- All mutations use `next-safe-action` with Zod validation. Define actions in dedicated `*-actions.ts` files.
- Two action clients exist in `src/shared/lib/safe-action.ts`: a base client and an authenticated client with session middleware.
- Always use the **authenticated action client** for any action that requires a logged-in user.

### Forms

- Use React Hook Form + `@hookform/resolvers` with the same Zod schema used by the server action (single schema for client + server validation).
- shadcn/ui form components use `@base-ui/react` primitives with the `render` prop for polymorphism (not `asChild`).

### URL State

- Use `nuqs` for type-safe search params (filters, pagination, tabs). Prefer URL state over React state for anything shareable or bookmarkable.

### Data Fetching

- Fetch data in Server Components using the Supabase server client (`src/shared/api/supabase/supabase-server-client.ts`).
- For protected data, use controller/query functions in entity slices (`src/entities/*/`) or feature slices.
- The admin Supabase client (`src/shared/api/supabase/supabase-admin.ts`) bypasses RLS — use only in webhooks and trusted server-side operations.

### Route Protection

- `proxy.ts` (middleware) refreshes Supabase auth cookies and guards `/account`, `/manage-subscription`, `/dashboard`, `/profile`, `/achievements`, `/vacancies`. Page-level auth checks don't protect Server Actions on that page.

### PDF Previewer

- The dashboard renders the selected CV through `Cv` (`src/entities/cv/pdf/Cv.tsx`) using templates in `src/entities/cv/pdf/templates/`.
- The signed URL refresher lives in `src/features/cv-preview/sign-pdf-url.action.ts` and is wired through `PreviewStoreProvider`. Anything client-side that needs to invalidate the preview should call `usePreviewStore().markPreviewDirty()`.
- `cv_preferences` (1 row per user) stores global UI state (`selected_cv_id`, `last_active_session_id`). Style settings and `pdf_path` now live on `cv`.

## Database & Supabase

- **RLS is mandatory on every table in the public schema.** No exceptions.
- Run `npm run generate-types` after any schema change to keep `src/shared/api/supabase/types.ts` in sync. `npm run migration:up` does both.

### Existing Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `users` | User profiles (auto-created via trigger) | Users read/update own row |
| `customers` | Supabase user → Stripe customer mapping | Private |
| `products` | Stripe products (synced via webhooks) | Public read-only |
| `prices` | Stripe prices (synced via webhooks) | Public read-only |
| `subscriptions` | Stripe subscriptions (synced via webhooks) | Users read own rows |
| `cv` | CV roots (default + user-created variants) | Owner |
| `experience`, `project`, `skill`, `education`, `certification`, `language` | Ordered section rows keyed by `cv_id` | Owner |
| `cv_version` | Reversible structured diffs per CV edit boundary (undo/redo) | Owner |
| `achievement_log_entry` | Append-only inbox; integrate into a section to apply | Owner |
| `job_description` | Saved vacancy raw text (no AI extraction) | Owner |
| `cv_preferences` | Selected CV + last active chat session | Owner |
| `chat_message` | Persisted chat history per user | Owner |

Storage: a private `pdf` bucket holds rendered CVs at `pdf/{user_id}/cv/{cv_id}.pdf`. Owner-scoped policies are enforced by path prefix.

## Stripe & Payments

- Webhook handler at `src/app/api/webhooks/route.ts` validates the Stripe signature, then upserts to Supabase via admin client.
- Use `stripeAdmin` (`src/shared/api/stripe/stripe-admin.ts`) for server-side Stripe operations.

## Styling & UI

- **Tailwind CSS v4:** Config is CSS-first — all theme tokens live in `src/styles/globals.css` using `@theme inline` with oklch colors. No `tailwind.config.js`.
- Use `tw-animate-css` for animations (not the deprecated `tailwindcss-animate`).
- **shadcn/ui:** Components in `src/shared/ui/`. `components.json` aliases point to `@/shared/ui` and `@/shared/lib/cn`.
- Toast notifications use `sonner` (not the deprecated shadcn toast component).
- **Theming:** Light/dark mode via `next-themes`. CSS variables in `:root` and `.dark` sections of `globals.css`. Modify oklch color values to change the color scheme.

## TypeScript & Code Style

- **Strict mode** is on. No `any` types — use `unknown` and narrow.
- Use named exports, not default exports (except for Next.js pages/layouts which require default exports).
- React Compiler is enabled — do not manually wrap components in `memo()`, `useMemo()`, or `useCallback()` unless profiling shows a specific need.

## Claude Code Skills

Project-specific skills live in `.claude/skills/` and activate automatically when relevant. Each provides domain-specific best practices and references.

| Skill | Activates When |
|-------|---------------|
| `shadcn` | Adding, styling, composing, or debugging shadcn/ui components |
| `zod` | Writing or reviewing Zod schemas, validation, type inference |
| `stripe-best-practices` | Building, modifying, or reviewing Stripe integrations |
| `supabase-postgres-best-practices` | Writing SQL, designing schemas, optimizing queries, configuring RLS |
| `nextjs-anti-patterns` | Reviewing Next.js code for App Router anti-patterns |
| `frontend-design` | Building new pages or components that need high design quality |
| `ui-ux-pro-max` | Design system generation, color palettes, typography, UX reviews |
