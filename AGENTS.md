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

```
src/
├── app/
│   ├── (auth)/                   # Auth route group (login, signup, callback)
│   ├── (account)/                # account/, manage-subscription/
│   ├── (app)/                    # Protected app shell (nav + layout guard)
│   │   ├── _components/app-nav.tsx
│   │   ├── dashboard/            # Previewer + sidebar (Library + Chat tabs)
│   │   ├── profile/              # Fact-base editor
│   │   ├── achievements/         # Achievements inbox
│   │   ├── vacancies/            # Saved job descriptions (raw text only)
│   │   └── layout.tsx
│   └── api/
│       ├── chat/route.ts         # Streaming chat agent (only AI surface)
│       └── webhooks/route.ts     # Stripe webhook handler
├── features/
│   ├── account/                  # Auth + Stripe customer/subscription controllers
│   ├── achievements/             # Manual CRUD inbox of wins
│   ├── chat/                     # Chat agent: tools, schemas, storage
│   │   ├── tools/                # CV mutation, read, & metadata tools
│   │   ├── storage/              # chat_message persistence
│   │   └── system-prompt.ts
│   ├── cv/                       # Unified CV actions, controllers, services, snapshots
│   │   ├── actions/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── cv-snapshot.ts
│   ├── emails/                   # React Email templates
│   ├── jobs/                     # Vacancies (raw text + delete)
│   ├── previewer/                # Selected-CV renderer + sidebar + preview store
│   └── profile/                  # Fact-base editor UI, schemas, and form actions
├── components/ui/                # shadcn/ui (Base Nova, Base UI primitives)
├── libs/
│   ├── ai/                       # chat-model.ts, resumable-stream.ts (chat-only)
│   ├── safe-action.ts            # next-safe-action clients
│   ├── stripe/, supabase/, resend/, logger/
├── pdf/                          # @react-pdf/renderer templates
├── types/, utils/
├── config.ts                     # App name & description
├── proxy.ts                      # Middleware (session refresh + route guards)
└── styles/globals.css            # Tailwind v4 + shadcn CSS variables (oklch)
```

Path alias: `@/*` → `./src/*`

## Architecture — Project-Specific Decisions

### Chat is the only AI surface

- All AI calls go through `src/app/api/chat/route.ts`. It uses the AI SDK with the model from `src/libs/ai/chat-model.ts` and exposes tools defined in `src/features/chat/tools/`.
- All CV read, scope, and mutation logic lives in `src/features/cv/services/cv-service.ts` and `src/features/cv/cv-snapshot.ts`.
- The streaming chat agent discovers available CV variants using the `listCvs` metadata tool (defined in `src/features/chat/tools/cv-meta-tools.ts`), and can inspect or edit a specific CV by passing a `cvId` argument to the corresponding tools.
- Chat tools mutate CV normalized rows (`cv`, `experience`, `project`, `skill`, `education`, `certification`, `language`).
- Tool call sets that mutate the CV trigger `renderAndUploadCv` at the end of the assistant turn. The chat stream emits a `data-preview-dirty` event keyed by `cvId` so the previewer iframe re-signs the storage URL.
- `chat_message` rows persist the conversation per user. `loadMessages` hydrates the panel on dashboard load.
- **Do not add new AI entry points.** Achievements and vacancies are intentionally manual.

### Server Actions (next-safe-action)

- All mutations use `next-safe-action` with Zod validation. Define actions in dedicated `*-actions.ts` files.
- Two action clients exist in `src/libs/safe-action.ts`: a base client and an authenticated client with session middleware.
- Always use the **authenticated action client** for any action that requires a logged-in user.

### Forms

- Use React Hook Form + `@hookform/resolvers` with the same Zod schema used by the server action (single schema for client + server validation).
- shadcn/ui form components use `@base-ui/react` primitives with the `render` prop for polymorphism (not `asChild`).

### URL State

- Use `nuqs` for type-safe search params (filters, pagination, tabs). Prefer URL state over React state for anything shareable or bookmarkable.

### Data Fetching

- Fetch data in Server Components using the Supabase server client (`src/libs/supabase/supabase-server-client.ts`).
- For protected data, use controller functions under `src/features/<feature>/controllers/`.
- The admin Supabase client (`supabase-admin.ts`) bypasses RLS — use only in webhooks and trusted server-side operations.

### Route Protection

- `proxy.ts` (middleware) refreshes Supabase auth cookies and guards `/account`, `/manage-subscription`, `/dashboard`, `/profile`, `/achievements`, `/vacancies`. Page-level auth checks don't protect Server Actions on that page.

### PDF Previewer

- The dashboard renders the selected CV through `Cv` (`src/pdf/Cv.tsx`) using templates in `src/pdf/templates/`.
- The signed URL refresher lives in `src/features/previewer/actions/sign-pdf-url.ts` and is wired through `PreviewStoreProvider`. Anything client-side that needs to invalidate the preview should call `usePreviewStore().markPreviewDirty()`.
- `cv_preferences` (1 row per user) stores global UI state (`selected_cv_id`, `last_active_session_id`). Style settings and `pdf_path` now live on `cv`.

## Database & Supabase

- **RLS is mandatory on every table in the public schema.** No exceptions.
- Run `npm run generate-types` after any schema change to keep `src/libs/supabase/types.ts` in sync. `npm run migration:up` does both.

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
| `achievement_log_entry` | Append-only inbox; integrate into a section to apply | Owner |
| `job_description` | Saved vacancy raw text (no AI extraction) | Owner |
| `cv_preferences` | Selected CV + last active chat session | Owner |
| `chat_message` | Persisted chat history per user | Owner |

Storage: a private `pdf` bucket holds rendered CVs at `pdf/{user_id}/cv/{cv_id}.pdf`. Owner-scoped policies are enforced by path prefix.

## Stripe & Payments

- Webhook handler at `src/app/api/webhooks/route.ts` validates the Stripe signature, then upserts to Supabase via admin client.
- Use `stripeAdmin` (`src/libs/stripe/stripe-admin.ts`) for server-side Stripe operations.

## Styling & UI

- **Tailwind CSS v4:** Config is CSS-first — all theme tokens live in `src/styles/globals.css` using `@theme inline` with oklch colors. No `tailwind.config.js`.
- Use `tw-animate-css` for animations (not the deprecated `tailwindcss-animate`).
- **shadcn/ui:** Components in `src/components/ui/`.
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
