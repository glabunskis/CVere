# AGENTS.md

SaaS app built with Next.js 16 (App Router), React 19, Supabase, Stripe, Tailwind CSS 4, and shadcn/ui (Base Nova). Uses TypeScript 6 strict mode.

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

After code changes, always run `npm run build` to verify no type errors or build failures.

## Project Structure

```
src/
├── app/                    # Routes, layouts, pages (App Router)
│   ├── (auth)/             # Auth route group (login, signup, callback)
│   ├── (account)/          # Protected route group (account, subscription)
│   └── api/webhooks/       # Stripe webhook handler
├── features/               # Feature modules (account controllers, emails)
├── components/ui/          # shadcn/ui components (Base Nova, Base UI primitives)
├── libs/                   # Initialized clients (Supabase, Stripe, Resend, safe-action)
├── types/                  # Shared TypeScript types
├── utils/                  # Pure utility functions
├── config.ts               # App name & description
├── proxy.ts                # Middleware (session refresh + route guards)
└── styles/globals.css      # Tailwind v4 + shadcn CSS variables (oklch)
```

Path alias: `@/*` → `./src/*`

## Architecture — Project-Specific Decisions

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
- For protected data, use controller functions in `src/features/account/controllers/`.
- The admin Supabase client (`supabase-admin.ts`) bypasses RLS — use only in webhooks and trusted server-side operations.

### Route Protection

- `proxy.ts` (middleware) refreshes Supabase auth cookies and guards `/account` and `/manage-subscription` routes. Page-level auth checks don't protect Server Actions on that page.

## Database & Supabase

- **RLS is mandatory on every table in the public schema.** No exceptions.
- Run `npm run generate-types` after any schema change to keep `src/libs/supabase/types.ts` in sync.

### Existing Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `users` | User profiles (auto-created via trigger) | Users read/update own row |
| `customers` | Supabase user → Stripe customer mapping | Private |
| `products` | Stripe products (synced via webhooks) | Public read-only |
| `prices` | Stripe prices (synced via webhooks) | Public read-only |
| `subscriptions` | Stripe subscriptions (synced via webhooks) | Users read own rows |

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
